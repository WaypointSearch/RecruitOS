import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeCompany(name: string): string {
  return name.toLowerCase()
    .replace(/,?\s*(inc|llc|llp|corp|corporation|co|ltd|group|associates|consulting|engineers|architects|pllc|pc|lp)\.?$/gi, '')
    .replace(/[^a-z0-9\s&]/g, '').trim()
}

const TOLL_FREE = ['800','888','877','866','855','844','833']
function isTollFree(phone: string): boolean {
  const d = phone.replace(/\D/g, '')
  const ac = d.length >= 10 ? d.slice(d.length - 10, d.length - 7) : d.slice(0, 3)
  return TOLL_FREE.includes(ac)
}

function extractPhones(text: string): string[] {
  const matches = text.match(/\(?\d{3}\)?[\s.\-–]?\d{3}[\s.\-–]?\d{4}/g) || []
  return Array.from(new Set(matches.map(m => m.replace(/\D/g, ''))))
    .filter(d => d.length === 10 && !TOLL_FREE.includes(d.slice(0, 3)))
    .map(d => `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`)
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, name, company, city, state } = await req.json()
    if (!name) return NextResponse.json({ error: 'Candidate name required' }, { status: 400 })

    const serperKey = process.env.SERPER_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!serperKey) return NextResponse.json({ error: 'Add SERPER_API_KEY in Vercel env vars' }, { status: 500 })

    // Clean the name: remove PE, EIT, LEED, RCDD, PMP, CxA, FPE, etc.
    const cleanName = name
      .replace(/,?\s*(PE|EIT|LEED\s*AP|RCDD|PMP|CxA|FPE|CPD|NICET|SE|RA|AIA|ASHRAE|NSPE|PMP|CEM|BEMP|BEAP|HFDP|QCxP|LC|GGP|BD\+C|O\+M|ID\+C|ND|WELL\s*AP|Retired|Jr\.?|Sr\.?|III|II|IV)\.?\s*/gi, '')
      .trim()

    const result: any = { avatar: null, summary: null, phone: null, phoneOptions: [] }

    // ═══ SEARCH 1: LinkedIn profile (avatar + summary) ═══
    const linkedinQuery = `site:linkedin.com/in "${cleanName}" "${company || ''}" "${city || ''}"`
    const liRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: linkedinQuery, num: 3 }),
    })

    let linkedinSnippets: string[] = []
    let linkedinImage: string | null = null
    let linkedinUrl: string | null = null

    if (liRes.ok) {
      const liData = await liRes.json()
      const organics = liData.organic || []

      for (const r of organics.slice(0, 3)) {
        // Check if this is actually a LinkedIn profile result
        if (r.link?.includes('linkedin.com/in/')) {
          linkedinUrl = r.link

          // Extract thumbnail/image from Serper result metadata
          // Serper returns imageUrl in the result when available
          if (r.imageUrl && !linkedinImage) {
            linkedinImage = r.imageUrl
          }
          // Also check sitelinks and rich snippets
          if (r.thumbnailUrl && !linkedinImage) {
            linkedinImage = r.thumbnailUrl
          }

          if (r.snippet) linkedinSnippets.push(r.snippet)
          if (r.title) linkedinSnippets.push(r.title)
        }
      }

      // Also check knowledgeGraph for image
      if (liData.knowledgeGraph?.imageUrl && !linkedinImage) {
        linkedinImage = liData.knowledgeGraph.imageUrl
      }
    }

    // ═══ SEARCH 2: Company phone (double-check) ═══
    let phoneSnippets: string[] = []
    if (company && city) {
      const companyKey = normalizeCompany(company)
      const cityClean = city.trim().toLowerCase()
      const stateClean = (state || '').toUpperCase()

      // Check cache first
      const { data: cached } = await supabase
        .from('phone_cache')
        .select('phone, address')
        .eq('company_key', companyKey)
        .eq('city', cityClean)
        .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
        .limit(1).single()

      if (cached?.phone) {
        result.phone = cached.phone
        result.phoneSource = 'cache'
      } else {
        // Search 2a: Direct company search
        const ph1 = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `"${company}" ${city} ${stateClean}`, num: 5 }),
        })
        // Search 2b: Phone-focused search
        const ph2 = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `${company} ${city} ${stateClean} office phone contact`, num: 5 }),
        })

        for (const res of [ph1, ph2]) {
          if (!res.ok) continue
          const data = await res.json()
          if (data.knowledgeGraph?.phoneNumber) {
            phoneSnippets.push(`GOOGLE BUSINESS: ${data.knowledgeGraph.title} | Phone: ${data.knowledgeGraph.phoneNumber} | ${data.knowledgeGraph.address || ''}`)
          }
          for (const p of (data.places || []).slice(0, 3)) {
            phoneSnippets.push(`MAPS: ${p.title} | ${p.phone || 'none'} | ${p.address || ''}`)
          }
          for (const r of (data.organic || []).slice(0, 4)) {
            if (r.snippet) phoneSnippets.push(`WEB: ${r.title}: ${r.snippet}`)
          }
        }
      }
    }

    // ═══ AI PROCESSING — one GPT call for both summary + phone ═══
    if (openaiKey && (linkedinSnippets.length > 0 || phoneSnippets.length > 0)) {
      const parts: string[] = []

      if (linkedinSnippets.length > 0) {
        parts.push(`LINKEDIN SEARCH RESULTS FOR "${cleanName}":
${linkedinSnippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`)
      }

      if (phoneSnippets.length > 0 && !result.phone) {
        parts.push(`COMPANY PHONE SEARCH FOR "${company}" in "${city}, ${state}":
${phoneSnippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`)
      }

      const prompt = `You are an AI assistant for a recruiting CRM. Process these search results.

${parts.join('\n\n')}

TASKS — Reply with ONLY a JSON object (no markdown, no backticks):

{
  "summary": "2-3 sentence professional summary of the candidate based on LinkedIn data. If no LinkedIn data, set to null.",
  "skills": ["list", "of", "key", "skills"] or [] if unknown,
  "publicEmail": "email if visible in snippets, or null",
  "phone": "${result.phone ? 'SKIP — already found' : '(XXX) XXX-XXXX format local office phone, or null'}",
  "phoneConfidence": "high/medium/low or null",
  "phoneSource": "where you found it or null",
  "phoneAddress": "office address if found or null"
}

PHONE RULES:
- ONLY use numbers that appear verbatim in the search data
- REJECT 1-800/888/877/866/855/844/833 toll-free numbers
- Prefer Google Business/Maps numbers over website numbers`

      try {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 400 }),
        })
        if (gptRes.ok) {
          const gptData = await gptRes.json()
          const content = gptData.choices?.[0]?.message?.content || ''
          const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
          const ai = JSON.parse(cleaned)

          if (ai.summary) result.summary = ai.summary
          if (ai.skills?.length > 0) result.skills = ai.skills
          if (ai.publicEmail && !ai.publicEmail.includes('linkedin')) result.publicEmail = ai.publicEmail
          if (ai.phone && ai.phone !== 'null' && !result.phone) {
            const digits = ai.phone.replace(/\D/g, '')
            if (digits.length === 10 && !TOLL_FREE.includes(digits.slice(0, 3))) {
              result.phone = ai.phone
              result.phoneConfidence = ai.phoneConfidence
              result.phoneSource = ai.phoneSource
              result.phoneOptions = [{ number: ai.phone, confidence: ai.phoneConfidence || 'medium', source: ai.phoneSource || 'AI extraction', address: ai.phoneAddress }]
            }
          }
        }
      } catch (e) { console.error('GPT error:', e) }
    }

    // Also extract phones via regex as fallback options
    if (!result.phone && phoneSnippets.length > 0) {
      const allText = phoneSnippets.join(' ')
      const regexPhones = extractPhones(allText)
      if (regexPhones.length > 0) {
        result.phone = regexPhones[0]
        result.phoneOptions = regexPhones.slice(0, 3).map((p, i) => ({ number: p, confidence: i === 0 ? 'medium' : 'low', source: 'Search results' }))
      }
    }

    result.avatar = linkedinImage
    result.linkedinUrl = linkedinUrl

    // ═══ SAVE TO CANDIDATE ═══
    if (candidateId) {
      const updates: any = {}
      if (result.avatar) updates.avatar_url = result.avatar
      if (result.phone) updates.work_phone = result.phone
      if (result.publicEmail) updates.work_email = result.publicEmail
      if (linkedinUrl && !updates.linkedin) updates.linkedin = linkedinUrl

      // Build ai_notes
      const notes: string[] = []
      if (result.summary) notes.push(result.summary)
      if (result.skills?.length > 0) notes.push('Skills: ' + result.skills.join(', '))
      if (notes.length > 0) updates.ai_notes = notes.join('\n\n')

      if (Object.keys(updates).length > 0) {
        await supabase.from('candidates').update(updates).eq('id', candidateId)
      }

      // Cache phone
      if (result.phone && company && city) {
        await supabase.from('phone_cache').upsert([{
          company_key: normalizeCompany(company),
          company_name: company,
          city: city.toLowerCase().trim(),
          state: (state || '').toUpperCase(),
          phone: result.phone,
          address: result.phoneOptions?.[0]?.address || null,
          verified: false,
          source: result.phoneSource || 'enrich',
          created_at: new Date().toISOString(),
        }], { onConflict: 'company_key,city' })
      }
    }

    return NextResponse.json(result)

  } catch (err: any) {
    console.error('Enrich error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
