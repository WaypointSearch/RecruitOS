import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeCompany(name: string): string {
  return name.toLowerCase()
    .replace(/,?\s*(inc|llc|llp|corp|corporation|co|ltd|group|associates|consulting|engineers|architects|pllc|pc|lp)\.?$/gi, '')
    .replace(/[^a-z0-9\s&]/g, '')
    .trim()
}

const TOLL_FREE = ['800','888','877','866','855','844','833']

function isTollFree(phone: string): boolean {
  const d = phone.replace(/\D/g, '')
  const ac = d.length >= 10 ? d.slice(d.length - 10, d.length - 7) : d.slice(0, 3)
  return TOLL_FREE.includes(ac)
}

function extractPhones(text: string): string[] {
  const matches = text.match(/\(?\d{3}\)?[\s.\-–]?\d{3}[\s.\-–]?\d{4}/g) || []
  const unique = Array.from(new Set(matches.map(m => m.replace(/[^\d]/g, ''))))
  return unique
    .filter(d => d.length === 10 && !TOLL_FREE.includes(d.slice(0, 3)))
    .map(d => `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`)
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, company, city, state, action, confirmedPhone } = await req.json()

    // ═══ ACTION: Confirm a phone number (user picked the right one) ═══
    if (action === 'confirm' && confirmedPhone && company && city) {
      const companyKey = normalizeCompany(company)
      const cityClean = city.trim().toLowerCase()
      const stateClean = (state || '').toUpperCase()

      // Upsert confirmed phone into cache
      await supabase.from('phone_cache').upsert([{
        company_key: companyKey, company_name: company,
        city: cityClean, state: stateClean,
        phone: confirmedPhone, verified: true, source: 'user_confirmed',
        created_at: new Date().toISOString(),
      }], { onConflict: 'company_key,city' })

      // Update this candidate
      if (candidateId) {
        await supabase.from('candidates').update({ work_phone: confirmedPhone }).eq('id', candidateId)
      }

      // Propagate to ALL candidates at same company in same metro/state who lack a phone
      const { data: matches } = await (supabase as any)
        .from('candidates')
        .select('id')
        .ilike('current_company', `%${companyKey.split(' ').slice(0, 2).join('%')}%`)
        .or(`state.eq.${stateClean},metro_area.ilike.%${cityClean}%`)
        .is('work_phone', null)

      if (matches && matches.length > 0) {
        for (const m of matches) {
          await supabase.from('candidates').update({ work_phone: confirmedPhone }).eq('id', m.id)
        }
        return NextResponse.json({
          confirmed: true, phone: confirmedPhone,
          propagated: matches.length,
          message: `Saved and applied to ${matches.length} other candidates at ${company}`
        })
      }

      return NextResponse.json({ confirmed: true, phone: confirmedPhone, propagated: 0 })
    }

    // ═══ ACTION: Search for phone numbers ═══
    if (!company) return NextResponse.json({ error: 'Company name required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City or location required' }, { status: 400 })

    const companyKey = normalizeCompany(company)
    const cityClean = city.trim().toLowerCase()
    const stateClean = (state || '').toUpperCase()

    // ── LAYER 1: Cache check ──
    const { data: cached } = await supabase
      .from('phone_cache')
      .select('phone, address, business_name, verified, source')
      .eq('company_key', companyKey)
      .eq('city', cityClean)
      .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
      .limit(1)
      .single()

    if (cached?.phone && cached.verified) {
      if (candidateId) await supabase.from('candidates').update({ work_phone: cached.phone }).eq('id', candidateId)
      return NextResponse.json({
        phones: [{ number: cached.phone, confidence: 'high', source: 'Verified (cached)', address: cached.address }],
        autoApplied: true, source: 'cache'
      })
    }

    // ── LAYER 2: Double search with Serper ──
    const serperKey = process.env.SERPER_API_KEY
    if (!serperKey) return NextResponse.json({ error: 'Add SERPER_API_KEY in Vercel env vars. Free at serper.dev' }, { status: 500 })

    // SEARCH 1: Direct company + city search (finds Google Business listing)
    const search1 = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `"${company}" ${city} ${stateClean}`, num: 5 }),
    })

    // SEARCH 2: Company + city + "phone" (finds contact pages)
    const search2 = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${company} ${city} ${stateClean} office phone contact`, num: 5 }),
    })

    const data1 = search1.ok ? await search1.json() : {}
    const data2 = search2.ok ? await search2.json() : {}

    // Collect ALL information
    const snippets: string[] = []
    const rawPhones: { number: string; context: string }[] = []

    // Knowledge Graph (highest confidence — this IS the Google Business listing)
    for (const d of [data1, data2]) {
      if (d.knowledgeGraph?.phoneNumber) {
        const ph = d.knowledgeGraph.phoneNumber
        if (!isTollFree(ph)) {
          rawPhones.push({ number: ph, context: `Google Business: ${d.knowledgeGraph.title || company} — ${d.knowledgeGraph.address || city}` })
        }
        snippets.push(`GOOGLE BUSINESS: ${d.knowledgeGraph.title} | Phone: ${ph} | Address: ${d.knowledgeGraph.address || ''}`)
      }
    }

    // Places results (Google Maps)
    for (const d of [data1, data2]) {
      for (const p of (d.places || []).slice(0, 3)) {
        if (p.phone && !isTollFree(p.phone)) {
          rawPhones.push({ number: p.phone, context: `Google Maps: ${p.title || ''} — ${p.address || ''}` })
        }
        snippets.push(`MAPS: ${p.title} | ${p.phone || 'no phone'} | ${p.address || ''}`)
      }
    }

    // Organic results
    for (const d of [data1, data2]) {
      for (const r of (d.organic || []).slice(0, 5)) {
        if (r.snippet) {
          snippets.push(`WEB: ${r.title}: ${r.snippet}`)
          for (const ph of extractPhones(r.snippet)) {
            rawPhones.push({ number: ph, context: `Website: ${r.title}` })
          }
        }
      }
    }

    // ── LAYER 3: AI analysis (if OpenAI key exists) ──
    const openaiKey = process.env.OPENAI_API_KEY
    let aiPhones: { number: string; confidence: string; source: string; address?: string }[] = []

    if (openaiKey && snippets.length > 0) {
      const prompt = `You are finding the LOCAL OFFICE phone number for "${company}" in "${city}, ${stateClean}".

SEARCH DATA:
${snippets.slice(0, 12).map((s, i) => `[${i + 1}] ${s}`).join('\n')}

TASK: Return the top 1-3 most likely LOCAL office phone numbers for this company in this city.

RULES:
- ONLY use numbers that appear in the search data above — NEVER invent numbers
- REJECT all 1-800/888/877/866/855/844/833 toll-free numbers
- PREFER: Google Business listing number > Google Maps number > Website number
- If a number appears in BOTH searches, it's very high confidence
- Include the address if found
- If no local number exists, include the corporate/HQ number as last resort labeled as "Corporate HQ"

Reply ONLY with JSON array (no markdown):
[{"number":"(XXX) XXX-XXXX","confidence":"high/medium/low","source":"where you found it","address":"if known"}]`

      try {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.05,
            max_tokens: 300,
          }),
        })
        if (gptRes.ok) {
          const gptData = await gptRes.json()
          const content = gptData.choices?.[0]?.message?.content || ''
          const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(cleaned)
          if (Array.isArray(parsed)) aiPhones = parsed.filter((p: any) => p.number && p.number !== 'null')
        }
      } catch {}
    }

    // Build final phone list — deduplicated, ranked
    const seen = new Set<string>()
    const finalPhones: { number: string; confidence: string; source: string; address?: string }[] = []

    // AI results first (smartest ranking)
    for (const p of aiPhones) {
      const d = p.number.replace(/\D/g, '')
      if (!seen.has(d) && d.length === 10) {
        seen.add(d)
        finalPhones.push(p)
      }
    }

    // Then raw extracted phones as fallback
    for (const p of rawPhones) {
      const d = p.number.replace(/\D/g, '')
      if (!seen.has(d) && d.length === 10) {
        seen.add(d)
        finalPhones.push({ number: p.number, confidence: 'medium', source: p.context })
      }
    }

    if (finalPhones.length === 0) {
      return NextResponse.json({ phones: [], error: 'No phone numbers found — try a manual Google search' })
    }

    // If only one high-confidence result, auto-apply it
    const topPhone = finalPhones[0]
    if (finalPhones.length === 1 || topPhone.confidence === 'high') {
      // Auto-apply the best one
      if (candidateId) {
        await supabase.from('candidates').update({ work_phone: topPhone.number }).eq('id', candidateId)
      }
      // Cache it (not yet user-confirmed, so verified=false)
      await supabase.from('phone_cache').upsert([{
        company_key: companyKey, company_name: company,
        city: cityClean, state: stateClean,
        phone: topPhone.number, address: topPhone.address || null,
        verified: false, source: topPhone.source,
        created_at: new Date().toISOString(),
      }], { onConflict: 'company_key,city' })
    }

    return NextResponse.json({
      phones: finalPhones.slice(0, 3),
      autoApplied: topPhone.confidence === 'high',
      source: 'serper_double_check'
    })

  } catch (err: any) {
    console.error('Find phone error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
