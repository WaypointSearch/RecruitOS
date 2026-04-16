import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Only needs: SERPER_API_KEY, OPENAI_API_KEY (optional), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeCompany(name: string): string {
  return name.toLowerCase()
    .replace(/,?\s*(inc|llc|llp|corp|corporation|co|ltd|group|associates|consulting|engineers|architects|pllc|pc|lp)\.?$/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, company, city, state } = await req.json()

    if (!company) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City or metro area is required' }, { status: 400 })

    const companyKey = normalizeCompany(company)
    const cityClean = city.trim().toLowerCase()
    const stateClean = (state || '').trim().toUpperCase()

    // ═══ LAYER 1: Cache ═══  (free, instant)
    const { data: cached } = await supabase
      .from('phone_cache')
      .select('phone, address, business_name')
      .eq('company_key', companyKey)
      .eq('city', cityClean)
      .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
      .limit(1)
      .single()

    if (cached?.phone) {
      if (candidateId) {
        await supabase.from('candidates').update({ work_phone: cached.phone }).eq('id', candidateId)
      }
      return NextResponse.json({ phone: cached.phone, address: cached.address, source: 'cache' })
    }

    // ═══ LAYER 2: Serper.dev search ═══  ($0.001/search, 2500 free/month)
    const serperKey = process.env.SERPER_API_KEY
    if (!serperKey) {
      return NextResponse.json({ error: 'Add SERPER_API_KEY to Vercel env vars. Get free key at serper.dev' }, { status: 500 })
    }

    // Search ONLY for the company + location — no candidate name involved
    const query = `"${company}" "${city}" ${stateClean} office phone number contact`

    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 6 }),
    })

    if (!serperRes.ok) {
      return NextResponse.json({ error: 'Search failed — check Serper API key' }, { status: 502 })
    }

    const data = await serperRes.json()

    // Gather all snippets
    const snippets: string[] = []
    if (data.knowledgeGraph?.phoneNumber) {
      snippets.push(`KNOWLEDGE GRAPH — Business: ${data.knowledgeGraph.title || company}, Phone: ${data.knowledgeGraph.phoneNumber}, Address: ${data.knowledgeGraph.address || 'N/A'}`)
    }
    for (const p of (data.places || []).slice(0, 3)) {
      snippets.push(`PLACES — ${p.title || ''} | ${p.address || ''} | Phone: ${p.phone || 'none'}`)
    }
    for (const r of (data.organic || []).slice(0, 5)) {
      if (r.snippet) snippets.push(`WEB — ${r.title}: ${r.snippet}`)
    }

    if (snippets.length === 0) {
      return NextResponse.json({ phone: null, error: 'No search results found for this company in this location' })
    }

    // ═══ LAYER 3: Extract phone number ═══
    const openaiKey = process.env.OPENAI_API_KEY
    let phone: string | null = null
    let address: string | null = null
    let businessName: string | null = null

    if (openaiKey) {
      // GPT-4o mini extraction — smart, catches HQ vs local
      const prompt = `Extract the LOCAL office phone number for "${company}" in "${city}, ${stateClean}".

SEARCH RESULTS:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

RULES:
- ONLY return a phone number that appears in the search results above
- NEVER make up a phone number
- REJECT 1-800, 1-888, 1-877, 1-866 toll-free numbers — we need LOCAL office
- PREFER numbers with area codes matching ${city} region
- If KNOWLEDGE GRAPH or PLACES has a local number, prefer that
- If multiple offices appear, pick the one in ${city}

Reply with ONLY this JSON (no markdown):
{"phone":"(XXX) XXX-XXXX","address":"street address if found","business":"business name as listed","confidence":0.0-1.0}`

      try {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.05,
            max_tokens: 150,
          }),
        })

        if (gptRes.ok) {
          const gptData = await gptRes.json()
          const content = gptData.choices?.[0]?.message?.content || ''
          const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
          try {
            const result = JSON.parse(cleaned)
            if (result.phone && result.phone !== 'null' && (result.confidence || 0) >= 0.5) {
              // Reject toll-free
              const digits = result.phone.replace(/\D/g, '')
              const tollFree = ['800','888','877','866','855','844','833']
              const areaCode = digits.length >= 10 ? digits.slice(digits.length - 10, digits.length - 7) : ''
              if (!tollFree.includes(areaCode)) {
                phone = result.phone
                address = result.address || null
                businessName = result.business || null
              }
            }
          } catch {}
        }
      } catch {}
    }

    // Fallback: regex extraction if GPT fails or no key
    if (!phone) {
      const allText = snippets.join(' ')
      // Match phone patterns, skip toll-free
      const phoneMatches = allText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) || []
      const tollFree = ['800','888','877','866','855','844','833']
      for (const m of phoneMatches) {
        const d = m.replace(/\D/g, '')
        const ac = d.slice(0, 3)
        if (!tollFree.includes(ac)) { phone = m; break }
      }
    }

    if (!phone) {
      return NextResponse.json({ phone: null, error: 'Could not find a local phone number — try manual lookup', snippets: snippets.slice(0, 2) })
    }

    // ═══ LAYER 4: Cache + update candidate ═══
    await supabase.from('phone_cache').upsert([{
      company_key: companyKey,
      company_name: company,
      city: cityClean,
      state: stateClean,
      phone,
      address,
      business_name: businessName,
      verified: !!openaiKey,
      source: openaiKey ? 'serper_gpt' : 'serper_regex',
      created_at: new Date().toISOString(),
    }], { onConflict: 'company_key,city' })

    if (candidateId) {
      await supabase.from('candidates').update({ work_phone: phone }).eq('id', candidateId)
    }

    return NextResponse.json({ phone, address, businessName, source: openaiKey ? 'serper_gpt' : 'serper_regex' })

  } catch (err: any) {
    console.error('Find phone error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
