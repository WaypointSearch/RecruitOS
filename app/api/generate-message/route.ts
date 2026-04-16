import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an AI writing assistant for Waypoint Search, a national contingency recruiting firm specializing in MEP (Mechanical, Electrical, Plumbing) engineers and architects. Your recruiter's name is Eric Guillen.

WRITING STYLE:
- Professional but warm and personal — like a seasoned recruiter who genuinely cares
- Confidential tone — candidates should feel their info is safe
- Never pushy, always position opportunities as career growth
- Mention "top ENR firms" and "strategic hires" to convey exclusivity
- Always mention the $1,000 referral bonus when appropriate
- Keep messages concise — candidates are busy engineers

COMPANY INFO:
- Company: Waypoint Search
- Specialty: MEP engineering recruitment (Mechanical, Electrical, Plumbing, Fire Protection)
- Scope: Nationwide placement
- Fee model: Contingency (candidates never pay)
- Referral bonus: $1,000 per successful placement referral

KEY PHRASES TO USE:
- "You were originally referred to us by a Senior PE Project Manager"
- "This hire is very strategic for our client and this position is not publicly known"
- "I know you are a highly sought after individual"
- "Would you be open to considering a new opportunity for significant pay and career increase?"
- "I will not be sending your resume or information anywhere without talking to you first"
- "From our previous conversations with our client, they are very flexible on overall compensation"

NEVER DO:
- Never reveal the client company name in the first message
- Never be aggressive or use high-pressure tactics
- Never mention salary specifics in outreach (only after conversation)
- Never use the candidate's credentials (PE, LEED, etc.) as part of their name in the greeting`

const MESSAGE_TYPES: Record<string, string> = {
  'first_contact_email': `Write a FIRST CONTACT EMAIL to this candidate. This is the very first time reaching out. Use the "referred by a Senior PE Project Manager" angle. Ask if they'd be open to a conversation about a strategic opportunity. Mention the PowerPoint presentation about Waypoint Search's process. Keep it under 150 words.`,

  'first_contact_linkedin': `Write a LINKEDIN CONNECTION REQUEST message. Very short (under 300 characters for LinkedIn limit). Mention representing a national engineering recruitment firm with clients in their area. Professional but warm.`,

  'linkedin_job_offer': `Write a LINKEDIN DIRECT MESSAGE with a specific job opportunity. Mention you have a client searching for someone with their exact experience. Ask if they'd explore a new opportunity ONLY if it meant significant pay increase and career growth. Include the $1,000 referral bonus mention. Under 200 words.`,

  'followup_after_call': `Write a FOLLOW-UP EMAIL after a phone call where the candidate showed interest. Thank them for their time. Ask them to send their resume and project list. Mention you'll keep everything confidential. Mention the attached PowerPoint about Waypoint Search. Under 120 words.`,

  'followup_not_interested': `Write a FOLLOW-UP EMAIL after a call where the candidate was NOT interested in moving. Be gracious. Mention staying in touch for future opportunities. Highlight the $1,000 referral bonus program. Ask to connect on LinkedIn. Under 120 words.`,

  'followup_bad_timing': `Write a FOLLOW-UP EMAIL after catching the candidate at a bad time. Apologize for the timing. Briefly mention you're working with a standout firm in their area looking for someone of their caliber. Ask for a better time to talk. Under 100 words.`,

  'after_interview': `Write a FOLLOW-UP EMAIL to the candidate after they interviewed with the client company. Reference positive feedback from the meeting. Ask about next steps and timing for a potential second meeting. Professional and encouraging. Under 120 words.`,

  'referral_request': `Write a REFERRAL REQUEST message. Thank them for their time. Mention the $1,000 referral bonus for each successful placement. Mention Waypoint Search specializes in ME and EE engineering nationwide. Ask to connect on LinkedIn. Under 120 words.`,
}

export async function POST(req: NextRequest) {
  try {
    const { type, candidate } = await req.json()

    if (!type || !MESSAGE_TYPES[type]) {
      return NextResponse.json({ error: 'Invalid message type', types: Object.keys(MESSAGE_TYPES) }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Add OPENAI_API_KEY to Vercel env vars' }, { status: 500 })
    }

    // Build candidate context
    const c = candidate || {}
    const firstName = (c.name || '').split(' ')[0] || 'there'
    const candidateContext = `
CANDIDATE PROFILE:
- Name: ${c.name || 'Unknown'}
- First name (for greeting): ${firstName}
- Title: ${c.current_title || 'Engineer'}
- Company: ${c.current_company || 'their current firm'}
- Location: ${c.location || c.metro_area || 'their area'}
- State: ${c.state || ''}
- Disciplines: ${(c.disciplines || []).join(', ') || 'Engineering'}
- Previous Title: ${c.previous_title || 'N/A'}
- Previous Company: ${c.previous_company || 'N/A'}
- Time in Current Role: ${c.time_in_current_role || 'N/A'}
${c.current_salary ? `- Salary Range: ~$${c.current_salary.toLocaleString()}` : ''}`

    const userPrompt = `${MESSAGE_TYPES[type]}

${candidateContext}

Write the message now. Use the candidate's first name "${firstName}" in the greeting. Reference their specific title, company, and location naturally. Do NOT include a subject line unless this is an email type (types containing "email").
${type.includes('email') ? 'Include a compelling subject line at the top formatted as "Subject: ..."' : ''}`

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!gptRes.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })
    }

    const gptData = await gptRes.json()
    const message = gptData.choices?.[0]?.message?.content || ''

    return NextResponse.json({ message, type })

  } catch (err: any) {
    console.error('Generate message error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
