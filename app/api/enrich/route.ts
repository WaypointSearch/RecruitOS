import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { candidateId, name, company, city, state, title, disciplines, previousTitle, previousCompany } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const serperKey = process.env.SERPER_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!serperKey) return NextResponse.json({ error: 'Add SERPER_API_KEY in Vercel' }, { status: 500 })
    if (!openaiKey) return NextResponse.json({ error: 'Add OPENAI_API_KEY in Vercel' }, { status: 500 })

    // Clean name for search — keep credentials for the SUMMARY but remove for search query
    const cleanName = name
      .replace(/,?\s*(PE|P\.E\.|EIT|E\.I\.T\.|LEED\s*AP|RCDD|PMP|CxA|FPE|CPD|NICET|SE|RA|AIA|CEM|BEMP|BEAP|HFDP|QCxP|LC|GGP|BD\+C|O\+M|ID\+C|ND|WELL\s*AP|Retired|Jr\.?|Sr\.?|III|II|IV)\.?\s*/gi, '')
      .replace(/\s+/g, ' ').trim()

    // Extract credentials from original name for the summary
    const credentialMatch = name.match(/,?\s*((?:PE|P\.E\.|EIT|LEED\s*AP(?:\s*BD\+C|\s*O\+M)?|RCDD|PMP|CxA|FPE|CPD|NICET|SE|RA|AIA|CEM|BEMP|QCxP|WELL\s*AP)[,\s]*)+/i)
    const credentials = credentialMatch ? credentialMatch[0].replace(/^,?\s*/, '').trim() : ''

    // Search LinkedIn via Serper
    const query = `site:linkedin.com/in "${cleanName}" "${company || ''}" "${city || ''}"`
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 3 }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Search failed' }, { status: 502 })

    const data = await res.json()
    const organics = data.organic || []

    // Find the best LinkedIn result
    let linkedinSnippet = ''
    let linkedinTitle = ''
    let linkedinUrl = ''
    for (const r of organics.slice(0, 3)) {
      if (r.link?.includes('linkedin.com/in/')) {
        linkedinSnippet = r.snippet || ''
        linkedinTitle = r.title || ''
        linkedinUrl = r.link
        break
      }
    }

    // Build AI prompt with ALL available data
    const candidateData = [
      `Name: ${name}`,
      credentials ? `Credentials: ${credentials}` : '',
      title ? `Current Title: ${title}` : '',
      company ? `Company: ${company}` : '',
      city ? `Location: ${city}${state ? ', ' + state : ''}` : '',
      disciplines?.length ? `Disciplines: ${disciplines.join(', ')}` : '',
      previousTitle ? `Previous: ${previousTitle}${previousCompany ? ' at ' + previousCompany : ''}` : '',
      linkedinSnippet ? `LinkedIn snippet: ${linkedinSnippet}` : '',
      linkedinTitle ? `LinkedIn title: ${linkedinTitle}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `You are an AI assistant for a MEP recruiting CRM. Write a professional summary for this candidate.

CANDIDATE DATA:
${candidateData}

WRITE a summary with these sections:

1. SUMMARY (2-3 sentences): Professional background, current role, specialization. Include their credentials (${credentials || 'if known'}) — spell them out (e.g., "PE (Professional Engineer), LEED AP (Leadership in Energy and Environmental Design)").

2. KEY SKILLS (comma-separated list): Extract specific technical skills, software, certifications, project types, and specializations. Include: discipline (Mechanical/Electrical/Plumbing/Fire Protection), tools (Revit, AutoCAD, BIM), project types (healthcare, data center, commercial, residential, industrial), credentials, and any leadership/management experience.

3. SEARCH TAGS (comma-separated): Short keywords that a recruiter would search for to find this candidate. Include: state abbreviation, city, discipline, credentials, tools, project types, seniority level.

IMPORTANT:
- Include ALL credentials from the name (PE, EIT, LEED AP, etc.) — these are critical for job matching
- Be specific about project types and technical skills
- Keep it factual — only use information from the data provided
- Do NOT make up skills or experience not evident from the data

Format your response exactly like this (no markdown):
SUMMARY: [text]
SKILLS: [comma list]
TAGS: [comma list]`

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 400 }),
    })

    if (!gptRes.ok) return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })

    const gptData = await gptRes.json()
    const content = gptData.choices?.[0]?.message?.content || ''

    // Parse the structured response
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=SKILLS:|$)/i)
    const skillsMatch = content.match(/SKILLS:\s*([\s\S]*?)(?=TAGS:|$)/i)
    const tagsMatch = content.match(/TAGS:\s*([\s\S]*?)$/i)

    const summary = summaryMatch?.[1]?.trim() || content.trim()
    const skills = skillsMatch?.[1]?.trim() || ''
    const tags = tagsMatch?.[1]?.trim() || ''

    // Combine into ai_notes for storage + searchability
    const aiNotes = [
      summary,
      skills ? `\nSkills: ${skills}` : '',
      tags ? `\nTags: ${tags}` : '',
    ].filter(Boolean).join('')

    // Save to candidate
    if (candidateId) {
      const updates: any = { ai_notes: aiNotes }
      if (linkedinUrl && !await hasLinkedin(candidateId)) updates.linkedin = linkedinUrl
      await supabase.from('candidates').update(updates).eq('id', candidateId)
    }

    return NextResponse.json({ summary, skills, tags, aiNotes, linkedinUrl: linkedinUrl || null })

  } catch (err: any) {
    console.error('Enrich error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

async function hasLinkedin(id: string): Promise<boolean> {
  const { data } = await supabase.from('candidates').select('linkedin').eq('id', id).single()
  return !!data?.linkedin
}
