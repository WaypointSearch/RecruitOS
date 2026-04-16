import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeCompany(name: string): string {
  return name.toLowerCase()
    .replace(/,?\s*(inc|llc|llp|corp|corporation|co|ltd|group|associates|consulting|engineers|architects|pllc|pc|lp)\.?$/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

function guessEmailDomain(company: string): string {
  // Clean company name to likely domain
  return company.toLowerCase()
    .replace(/,?\s*(inc|llc|llp|corp|co|ltd|group|associates|consulting|engineers|pllc)\.?$/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '') + '.com'
}

function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().trim()
  const l = lastName.toLowerCase().trim()
  if (!f || !l || !domain) return []
  return [
    `${f}.${l}@${domain}`,       // john.smith@company.com  (most common in AEC)
    `${f[0]}${l}@${domain}`,     // jsmith@company.com
    `${f}${l[0]}@${domain}`,     // johns@company.com
    `${f}@${domain}`,            // john@company.com
    `${f}${l}@${domain}`,        // johnsmith@company.com
    `${f}_${l}@${domain}`,       // john_smith@company.com
    `${l}.${f}@${domain}`,       // smith.john@company.com
    `${f[0]}.${l}@${domain}`,    // j.smith@company.com
  ]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHONE LOOKUP: Serper.dev → GPT-4o mini
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function findPhoneViaSerper(
  company: string, city: string, state: string
): Promise<{ phone: string | null; source: string; address?: string; snippets?: string }> {

  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey) return { phone: null, source: 'no_serper_key' }

  // Search for local office phone
  const query = `"${company}" "${city}" "${state}" local office phone number`

  const serperRes = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 5 }),
  })

  if (!serperRes.ok) {
    console.error('Serper error:', await serperRes.text())
    return { phone: null, source: 'serper_error' }
  }

  const serperData = await serperRes.json()

  // Collect all text snippets + knowledge graph
  const snippets: string[] = []

  // Knowledge graph often has the phone directly
  if (serperData.knowledgeGraph?.phoneNumber) {
    snippets.push(`Knowledge Graph: Phone: ${serperData.knowledgeGraph.phoneNumber}, Address: ${serperData.knowledgeGraph.address || ''}`)
  }
  if (serperData.knowledgeGraph?.description) {
    snippets.push(`About: ${serperData.knowledgeGraph.description}`)
  }

  // Organic results
  for (const r of (serperData.organic || []).slice(0, 5)) {
    if (r.snippet) snippets.push(`${r.title}: ${r.snippet}`)
  }

  // Places results (if Serper returns them)
  for (const p of (serperData.places || []).slice(0, 3)) {
    const parts = [p.title, p.address, p.phone].filter(Boolean)
    if (parts.length > 0) snippets.push(`Place: ${parts.join(' | ')}`)
  }

  if (snippets.length === 0) return { phone: null, source: 'no_snippets' }

  // ── GPT-4o mini extraction ──
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    // Try regex extraction from snippets as fallback
    const allText = snippets.join(' ')
    const phoneMatch = allText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
    return { phone: phoneMatch ? phoneMatch[0] : null, source: 'regex_only', snippets: allText.slice(0, 500) }
  }

  const extractionPrompt = `You are a phone number extraction specialist for a recruiting CRM.

TASK: Extract the correct LOCAL OFFICE phone number for "${company}" in "${city}, ${state}".

SEARCH RESULTS:
${snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

RULES:
1. ONLY return a phone number that appears verbatim in the search results above
2. NEVER invent or hallucinate a phone number
3. REJECT any 1-800, 1-888, 1-877, 1-866 toll-free/corporate hotline numbers — we need the LOCAL office
4. PREFER numbers associated with the ${city} area code or local address
5. If the Knowledge Graph has a local phone, prefer that
6. If you find a local office phone at a ${city} address, that's the best match

Reply ONLY with a JSON object (no markdown, no backticks):
{"phone": "(XXX) XXX-XXXX or null", "confidence": 0.0-1.0, "address": "found address or null", "reason": "why this is the right number"}`

  const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0.05,
      max_tokens: 200,
    }),
  })

  if (!gptRes.ok) {
    console.error('GPT error:', await gptRes.text())
    return { phone: null, source: 'gpt_error', snippets: snippets.join(' ').slice(0, 500) }
  }

  const gptData = await gptRes.json()
  const content = gptData.choices?.[0]?.message?.content || ''

  try {
    const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
    const result = JSON.parse(cleaned)
    if (result.phone && result.phone !== 'null' && (result.confidence || 0) >= 0.5) {
      // Final check: reject toll-free
      const digits = result.phone.replace(/\D/g, '')
      if (digits.startsWith('1800') || digits.startsWith('1888') || digits.startsWith('1877') || digits.startsWith('1866') ||
          digits.startsWith('800') || digits.startsWith('888') || digits.startsWith('877') || digits.startsWith('866')) {
        return { phone: null, source: 'rejected_tollfree', snippets: content }
      }
      return { phone: result.phone, source: 'serper_gpt', address: result.address }
    }
    return { phone: null, source: 'low_confidence', snippets: content }
  } catch {
    // Try regex on GPT response as last resort
    const phoneMatch = content.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
    return { phone: phoneMatch ? phoneMatch[0] : null, source: 'gpt_regex', snippets: content }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL LOOKUP: Apollo.io → Pattern Guessing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function findEmail(
  firstName: string, lastName: string, company: string, domain?: string
): Promise<{ email: string | null; source: string; patterns?: string[] }> {

  // Try Apollo.io first (free tier: 10,000 credits/month)
  const apolloKey = process.env.APOLLO_API_KEY
  if (apolloKey) {
    try {
      const apolloRes = await fetch('https://api.apollo.io/v1/people/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({
          api_key: apolloKey,
          first_name: firstName,
          last_name: lastName,
          organization_name: company,
        }),
      })

      if (apolloRes.ok) {
        const data = await apolloRes.json()
        const person = data.person
        if (person?.email) {
          return { email: person.email, source: 'apollo' }
        }
        // Apollo might return the domain even without the exact email
        if (person?.organization?.primary_domain) {
          domain = person.organization.primary_domain
        }
      }
    } catch (e) {
      console.error('Apollo error:', e)
    }
  }

  // Fallback: Pattern guessing
  const guessDomain = domain || guessEmailDomain(company)
  const patterns = generateEmailPatterns(firstName, lastName, guessDomain)

  if (patterns.length > 0) {
    // Return the most likely pattern (first.last@domain.com is #1 in AEC)
    return {
      email: patterns[0],
      source: 'pattern_guess',
      patterns: patterns.slice(0, 4), // Show top 4 guesses
    }
  }

  return { email: null, source: 'no_data' }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidateId, firstName, lastName, company, city, state, companyDomain, mode } = body
    // mode: 'phone' | 'email' | 'both' (default: 'both')

    if (!company && !firstName) {
      return NextResponse.json({ error: 'Need at least company or name' }, { status: 400 })
    }

    const companyKey = normalizeCompany(company || '')
    const cityClean = (city || '').toLowerCase().trim()
    const stateClean = (state || '').toUpperCase().trim()
    const enrichMode = mode || 'both'

    // ── CACHE CHECK ──
    if (companyKey && cityClean) {
      const { data: cached } = await supabase
        .from('enrichment_cache')
        .select('*')
        .eq('company_key', companyKey)
        .eq('city', cityClean)
        .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
        .limit(1)
        .single()

      if (cached) {
        const result: any = { source: 'cache' }
        if (cached.phone && (enrichMode === 'phone' || enrichMode === 'both')) {
          result.phone = cached.phone
          result.phoneSource = 'cache'
          result.address = cached.address
          if (candidateId) await supabase.from('candidates').update({ work_phone: cached.phone }).eq('id', candidateId)
        }
        if (cached.email_pattern && (enrichMode === 'email' || enrichMode === 'both')) {
          result.email = cached.email_pattern
          result.emailSource = 'cache'
        }
        // Only return cache if it has what we need
        if ((enrichMode === 'phone' && result.phone) ||
            (enrichMode === 'email' && result.email) ||
            (enrichMode === 'both' && (result.phone || result.email))) {
          return NextResponse.json(result)
        }
      }
    }

    const result: any = {}

    // ── PHONE LOOKUP ──
    if ((enrichMode === 'phone' || enrichMode === 'both') && company && cityClean) {
      const phoneResult = await findPhoneViaSerper(company, city || '', stateClean)
      result.phone = phoneResult.phone
      result.phoneSource = phoneResult.source
      result.address = phoneResult.address

      if (phoneResult.phone && candidateId) {
        await supabase.from('candidates').update({ work_phone: phoneResult.phone }).eq('id', candidateId)
      }
    }

    // ── EMAIL LOOKUP ──
    if ((enrichMode === 'email' || enrichMode === 'both') && firstName && lastName) {
      const emailResult = await findEmail(firstName, lastName, company || '', companyDomain)
      result.email = emailResult.email
      result.emailSource = emailResult.source
      result.emailPatterns = emailResult.patterns

      if (emailResult.email && candidateId) {
        await supabase.from('candidates').update({ work_email: emailResult.email }).eq('id', candidateId)
      }
    }

    // ── CACHE UPSERT ──
    if (companyKey && cityClean && (result.phone || result.email)) {
      await supabase.from('enrichment_cache').upsert([{
        company_key: companyKey,
        company_name: company,
        city: cityClean,
        state: stateClean,
        phone: result.phone || null,
        address: result.address || null,
        email_pattern: result.email || null,
        phone_source: result.phoneSource || null,
        email_source: result.emailSource || null,
        created_at: new Date().toISOString(),
      }], { onConflict: 'company_key,city' })
    }

    return NextResponse.json(result)

  } catch (err: any) {
    console.error('Enrich error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
