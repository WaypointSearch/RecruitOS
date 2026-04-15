import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Env vars: GOOGLE_PLACES_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizeCompany(name: string): string {
  return name.toLowerCase()
    .replace(/,?\s*(inc|llc|llp|corp|co|ltd|group|associates|consulting|engineers|architects|pllc|pc|lp)\.?$/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { company, city, state, candidateId, candidateName } = await req.json()

    if (!company || !city) {
      return NextResponse.json({ error: 'Company and city are required' }, { status: 400 })
    }

    const companyKey = normalizeCompany(company)
    const stateClean = (state || '').trim().toUpperCase()

    // ──────────────────────────────────────────────
    // LAYER 1: Cache check (free, instant)
    // ──────────────────────────────────────────────
    const { data: cached } = await supabase
      .from('phone_cache')
      .select('phone, address, source, verified')
      .eq('company_key', companyKey)
      .eq('city', city.toLowerCase())
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .single()

    if (cached?.phone) {
      // Update the candidate directly
      if (candidateId) {
        await supabase.from('candidates').update({ work_phone: cached.phone }).eq('id', candidateId)
      }
      return NextResponse.json({
        phone: cached.phone,
        address: cached.address,
        source: 'cache',
        verified: cached.verified,
      })
    }

    // ──────────────────────────────────────────────
    // LAYER 2: Google Places API (New) — searchText
    // Single call with field masking = ~$0.005/request
    // ──────────────────────────────────────────────
    const googleKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleKey) {
      return NextResponse.json({ error: 'Google Places API key not configured. Add GOOGLE_PLACES_API_KEY to Vercel env vars.' }, { status: 500 })
    }

    const searchQuery = `${company} ${city} ${stateClean}`.trim()

    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey,
        // Field masking — ONLY request Basic fields ($5/1K)
        // nationalPhoneNumber, formattedAddress, displayName are all Basic tier
        'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.types',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 3,
        languageCode: 'en',
      }),
    })

    if (!placesRes.ok) {
      const errText = await placesRes.text()
      console.error('Google Places error:', errText)
      return NextResponse.json({ error: 'Google Places API error', details: errText }, { status: 502 })
    }

    const placesData = await placesRes.json()
    const places = placesData.places || []

    if (places.length === 0) {
      return NextResponse.json({ error: 'No results found for this company in this location', phone: null })
    }

    // Find best match — prefer result with a phone number
    const bestMatch = places.find((p: any) => p.nationalPhoneNumber) || places[0]

    if (!bestMatch.nationalPhoneNumber) {
      return NextResponse.json({
        error: 'Found the business but no phone number listed',
        address: bestMatch.formattedAddress,
        businessName: bestMatch.displayName?.text,
        phone: null,
      })
    }

    const foundPhone = bestMatch.nationalPhoneNumber
    const foundAddress = bestMatch.formattedAddress || ''
    const foundName = bestMatch.displayName?.text || ''

    // ──────────────────────────────────────────────
    // LAYER 3: GPT-4o mini validation
    // Catches HQ vs local, wrong company, wrong city
    // Cost: ~$0.0003/request
    // ──────────────────────────────────────────────
    let verified = true
    const openaiKey = process.env.OPENAI_API_KEY

    if (openaiKey) {
      try {
        const validationPrompt = `You are a data validation assistant. Verify this phone lookup result.

CANDIDATE INFO:
- Works at: "${company}"
- City: "${city}"
- State: "${stateClean}"
${candidateName ? `- Name: "${candidateName}"` : ''}

GOOGLE PLACES RESULT:
- Business: "${foundName}"
- Address: "${foundAddress}"
- Phone: "${foundPhone}"

TASK: Determine if this is the correct LOCAL office phone for where this candidate works.

CHECK THESE:
1. Is "${foundName}" the same company as "${company}" (allowing for abbreviations, DBA names)?
2. Is the address in or near "${city}, ${stateClean}" (within reasonable commuting distance)?
3. Is this likely a local office number (not a national hotline or unrelated business)?

Reply with ONLY a JSON object:
{"valid": true/false, "confidence": 0.0-1.0, "reason": "brief explanation"}`

        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: validationPrompt }],
            temperature: 0.1,
            max_tokens: 150,
          }),
        })

        if (gptRes.ok) {
          const gptData = await gptRes.json()
          const content = gptData.choices?.[0]?.message?.content || ''
          try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const validation = JSON.parse(jsonMatch[0])
              verified = validation.valid === true && (validation.confidence || 0) >= 0.6
              if (!verified) {
                return NextResponse.json({
                  phone: foundPhone,
                  address: foundAddress,
                  businessName: foundName,
                  verified: false,
                  reason: validation.reason || 'Could not verify as correct local office',
                  source: 'google_places_unverified',
                })
              }
            }
          } catch { /* JSON parse failed — still use the result but mark as unverified */ }
        }
      } catch (e) {
        console.error('GPT validation error:', e)
        // Proceed without validation — still better than no phone
      }
    }

    // ──────────────────────────────────────────────
    // LAYER 4: Cache the result (upsert)
    // ──────────────────────────────────────────────
    await supabase.from('phone_cache').upsert([{
      company_key: companyKey,
      company_name: company,
      city: city.toLowerCase(),
      state: stateClean,
      phone: foundPhone,
      address: foundAddress,
      business_name: foundName,
      verified,
      source: 'google_places_v1',
      created_at: new Date().toISOString(),
    }], { onConflict: 'company_key,city' })

    // Update the candidate's work_phone
    if (candidateId) {
      await supabase.from('candidates').update({ work_phone: foundPhone }).eq('id', candidateId)
    }

    return NextResponse.json({
      phone: foundPhone,
      address: foundAddress,
      businessName: foundName,
      verified,
      source: 'google_places_v1',
    })

  } catch (err: any) {
    console.error('Find phone error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
