'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { getAllStateAbbrs, US_STATES } from '@/lib/geo-intelligence'
import ActivityFeed from './[id]/ActivityFeed'

interface Props {
  candidateId: string; onClose: () => void; onUpdated?: () => void
  onNext?: () => void; onPrev?: () => void; hasNext?: boolean; hasPrev?: boolean
  currentIndex?: number; totalCount?: number
}

const MSG_TYPES = [
  { key: 'first_contact_email', label: 'First Contact Email', icon: '✉️' },
  { key: 'first_contact_linkedin', label: 'LinkedIn Connect', icon: '💼' },
  { key: 'linkedin_job_offer', label: 'LinkedIn Job Pitch', icon: '🎯' },
  { key: 'followup_after_call', label: 'After Call — Open', icon: '📞' },
  { key: 'followup_not_interested', label: 'After Call — Pass', icon: '🤝' },
  { key: 'followup_bad_timing', label: 'Bad Timing', icon: '⏰' },
  { key: 'after_interview', label: 'After Interview', icon: '🎯' },
  { key: 'referral_request', label: 'Referral Ask', icon: '💰' },
]

export default function CandidateSidePanel({ candidateId, onClose, onUpdated, onNext, onPrev, hasNext, hasPrev, currentIndex, totalCount }: Props) {
  const sb = useRef(createClientComponentClient()).current
  const [c, setC] = useState<any>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [hotlists, setHotlists] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [showHotlistAdd, setShowHotlistAdd] = useState(false)
  const [showJobMatch, setShowJobMatch] = useState(false)
  const [selectedHotlist, setSelectedHotlist] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarFocused, setAvatarFocused] = useState(false)
  // Phone
  const [findingPhone, setFindingPhone] = useState(false)
  const [phoneResults, setPhoneResults] = useState<any[] | null>(null)
  // AI Summary
  const [enriching, setEnriching] = useState(false)
  // Messages
  const [generatingMsg, setGeneratingMsg] = useState(false)
  const [generatedMsg, setGeneratedMsg] = useState('')
  const [msgType, setMsgType] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  // Avatar paste handler
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!avatarFocused) return
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault(); setUploadingAvatar(true)
        const blob = items[i].getAsFile()
        if (!blob) { setUploadingAvatar(false); return }
        const path = candidateId + '/avatar-' + Date.now() + '.' + (blob.type.split('/')[1] || 'png')
        const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert: true })
        if (error) { showToast('Upload failed'); setUploadingAvatar(false); return }
        const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path)
        await (sb as any).from('candidates').update({ avatar_url: publicUrl }).eq('id', candidateId)
        setC((prev: any) => ({ ...prev, avatar_url: publicUrl }))
        showToast('Avatar saved!'); setUploadingAvatar(false)
        if (onUpdated) onUpdated(); return
      }
    }
  }, [avatarFocused, candidateId, sb, onUpdated])

  useEffect(() => { document.addEventListener('paste', handlePaste); return () => document.removeEventListener('paste', handlePaste) }, [handlePaste])

  const load = async () => {
    const { data } = await (sb as any).from('candidates').select('*').eq('id', candidateId).single()
    setC(data)
    const { data: p } = await (sb as any).from('pipeline').select('*, jobs(id, title, companies(name))').eq('candidate_id', candidateId)
    setPipeline(p ?? [])
    const { data: hl } = await (sb as any).from('hotlists').select('*').order('name')
    setHotlists(hl ?? [])
    const { data: j } = await (sb as any).from('jobs').select('id, title, companies(name)').eq('status', 'Active').order('title')
    setJobs(j ?? [])
  }
  useEffect(() => { load(); setPhoneResults(null); setGeneratedMsg(''); setMsgType('') }, [candidateId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext && onNext) { e.preventDefault(); onNext() }
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) { e.preventDefault(); onPrev() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [hasNext, hasPrev, onNext, onPrev, onClose])

  const saveField = async (field: string, value: string) => {
    const update: any = {}
    if (field === 'current_salary') update[field] = value ? parseInt(value.replace(/[^0-9]/g, '')) : null
    else update[field] = value || null
    setC((prev: any) => ({ ...prev, ...update }))
    await (sb as any).from('candidates').update(update).eq('id', candidateId)
    showToast('Saved'); if (onUpdated) onUpdated()
  }

  const addToHotlist = async () => {
    if (!selectedHotlist) return
    const { data: { user } } = await sb.auth.getUser()
    const { data: ex } = await (sb as any).from('hotlist_candidates').select('id').eq('hotlist_id', selectedHotlist).eq('candidate_id', candidateId).limit(1)
    if (ex?.length > 0) { showToast('Already in hotlist'); setShowHotlistAdd(false); return }
    await (sb as any).from('hotlist_candidates').insert([{ hotlist_id: selectedHotlist, candidate_id: candidateId, added_by: user?.id }])
    showToast('Added! 🔥'); setShowHotlistAdd(false)
  }

  const matchToJob = async () => {
    if (!selectedJob) return
    const { data: { user } } = await sb.auth.getUser()
    const { data: ex } = await (sb as any).from('pipeline').select('id').eq('job_id', selectedJob).eq('candidate_id', candidateId).limit(1)
    if (ex?.length > 0) { showToast('Already matched'); setShowJobMatch(false); return }
    await (sb as any).from('pipeline').insert([{ job_id: selectedJob, candidate_id: candidateId, stage: 'Prescreen Scheduled', added_by: user?.id, recruiter_id: user?.id, moved_at: new Date().toISOString() }])
    showToast('Matched! 🎯'); setShowJobMatch(false); load()
  }

  // ═══ FIND PHONE — uses v21 robust double-search endpoint ═══
  const findWorkPhone = async () => {
    if (!c.current_company) { showToast('Need company name'); return }
    const city = c.location?.split(',')[0]?.trim() || c.metro_area || ''
    if (!city) { showToast('Need city/location'); return }
    setFindingPhone(true); setPhoneResults(null)
    try {
      const res = await fetch('/api/find-phone', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, company: c.current_company, city, state: c.state || '' }) })
      const data = await res.json()
      if (data.phones?.length > 0) {
        setPhoneResults(data.phones)
        if (data.autoApplied) {
          setC((prev: any) => ({ ...prev, work_phone: data.phones[0].number }))
          showToast('📞 Found: ' + data.phones[0].number)
          if (onUpdated) onUpdated()
        }
      } else showToast(data.error || 'No numbers found')
    } catch { showToast('Lookup failed') }
    setFindingPhone(false)
  }

  const confirmPhone = async (phone: string) => {
    const city = c.location?.split(',')[0]?.trim() || c.metro_area || ''
    try {
      const res = await fetch('/api/find-phone', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', confirmedPhone: phone, candidateId, company: c.current_company, city, state: c.state || '' }) })
      const data = await res.json()
      setC((prev: any) => ({ ...prev, work_phone: phone }))
      setPhoneResults(null)
      showToast(data.propagated > 0 ? `✅ Confirmed & applied to ${data.propagated} others` : '✅ Confirmed')
      if (onUpdated) onUpdated()
    } catch { showToast('Error confirming') }
  }

  // ═══ AI SUMMARY — separate from phone ═══
  const enrichSummary = async () => {
    setEnriching(true)
    const city = c.location?.split(',')[0]?.trim() || c.metro_area || ''
    try {
      const res = await fetch('/api/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, name: c.name, company: c.current_company, city, state: c.state || '',
          title: c.current_title, disciplines: c.disciplines, previousTitle: c.previous_title, previousCompany: c.previous_company }) })
      const data = await res.json()
      if (data.aiNotes) {
        setC((prev: any) => ({ ...prev, ai_notes: data.aiNotes, linkedin: prev.linkedin || data.linkedinUrl }))
        showToast('🧠 AI Summary generated!')
        if (onUpdated) onUpdated()
      } else showToast(data.error || 'No summary generated')
    } catch { showToast('Failed — check API keys') }
    setEnriching(false)
  }

  const clearSummary = async () => {
    await (sb as any).from('candidates').update({ ai_notes: null }).eq('id', candidateId)
    setC((prev: any) => ({ ...prev, ai_notes: null }))
    showToast('Summary cleared')
    if (onUpdated) onUpdated()
  }

  // Message generator
  const generateMessage = async (type: string) => {
    setGeneratingMsg(true); setMsgType(type); setGeneratedMsg('')
    try {
      const res = await fetch('/api/generate-message', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, candidate: c }) })
      const data = await res.json()
      setGeneratedMsg(data.message || data.error || 'Failed')
    } catch { setGeneratedMsg('Error — check OPENAI_API_KEY') }
    setGeneratingMsg(false)
  }

  // Field component
  const Field = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState('')
    useEffect(() => { setVal(c?.[field] ?? '') }, [c?.[field]])
    const commit = () => { if (val !== String(c?.[field] ?? '')) saveField(field, val); setEditing(false) }
    const isEmpty = !c?.[field]
    const isSalary = field === 'current_salary'
    const isState = field === 'state'
    if (editing) return (
      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 2 }}>{label}</label>
        {isState ? (
          <select value={val} onChange={e => { setVal(e.target.value); saveField(field, e.target.value); setEditing(false) }} autoFocus onBlur={() => setEditing(false)} style={{ padding: '4px 8px', fontSize: 13 }}>
            <option value="">Select state...</option>
            {getAllStateAbbrs().map(s => <option key={s} value={s}>{s} — {US_STATES[s]}</option>)}
          </select>
        ) : <input type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} autoFocus style={{ padding: '4px 8px', fontSize: 13 }} />}
      </div>
    )
    const dv = isSalary && c?.[field] ? `$${c[field].toLocaleString()}` : (c?.[field] || '')
    return (
      <div style={{ marginBottom: 6, cursor: 'pointer' }} onClick={() => setEditing(true)}>
        <label style={{ fontSize: 10, fontWeight: 700, color: isSalary && dv ? 'var(--neon-green)' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 1 }}>{label}</label>
        <p className={isEmpty ? 'empty-field-glow' : ''} style={{ fontSize: 14, padding: '3px 0', color: isSalary && dv ? 'var(--neon-green)' : dv ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isSalary && dv ? 700 : 400, borderBottom: isEmpty ? '1px dashed var(--text-tertiary)' : '1px dashed transparent' }}>
          {dv || '— click to add —'}
        </p>
      </div>
    )
  }

  if (!c) return <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, background: 'var(--panel-bg)', borderLeft: '1px solid var(--border)', zIndex: 500, padding: 24 }}><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></div>

  const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null
  const initials = c.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '92vw', background: 'var(--panel-bg)', borderLeft: '1px solid var(--border)', zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)', animation: 'slideInRight 0.2s ease' }}>
        {toast && <div className="toast toast-success" style={{ position: 'absolute', top: 10, right: 10, left: 'auto', bottom: 'auto', zIndex: 10 }}>{toast}</div>}

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button onClick={onPrev} disabled={!hasPrev} className="btn btn-sm" style={{ padding: '3px 10px', fontSize: 12, opacity: hasPrev ? 1 : 0.3 }}>← Prev</button>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flex: 1, textAlign: 'center' }}>{currentIndex} of {totalCount}</span>
            <button onClick={onNext} disabled={!hasNext} className="btn btn-sm" style={{ padding: '3px 10px', fontSize: 12, opacity: hasNext ? 1 : 0.3 }}>Next →</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 4px' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div tabIndex={0} onClick={e => e.currentTarget.focus()} onFocus={() => setAvatarFocused(true)} onBlur={() => setAvatarFocused(false)}
              title="Click then Ctrl+V to paste photo from LinkedIn"
              style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, overflow: 'hidden', cursor: 'pointer', border: avatarFocused ? '2px solid var(--neon-green)' : '2px solid var(--accent)', background: c.avatar_url ? 'transparent' : 'var(--accent)', color: 'white', transition: 'all 0.25s', outline: 'none', boxShadow: avatarFocused ? '0 0 16px var(--neon-green)' : 'none' }}>
              {uploadingAvatar ? '⏳' : c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            {avatarFocused && <p style={{ fontSize: 10, color: 'var(--neon-green)', marginBottom: 4, fontWeight: 600 }}>Paste photo (Ctrl+V)</p>}
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{c.name}</h2>
            {c.current_title && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{c.current_title}{c.current_company ? ` @ ${c.current_company}` : ''}</p>}
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {c.state && <span className="panel-pill-glow" style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>{c.state}</span>}
              {(c.disciplines ?? []).map((d: string) => <span key={d} className="panel-pill-glow" style={{ padding: '3px 8px', borderRadius: 100, fontSize: 9, fontWeight: 600, color: 'var(--neon-green)', background: 'var(--success-bg)', border: '1px solid var(--neon-green)' }}>{d}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowHotlistAdd(!showHotlistAdd)} className="btn btn-sm" style={{ fontSize: 11 }}>🔥 Hotlist</button>
            <button onClick={() => setShowJobMatch(!showJobMatch)} className="btn btn-sm" style={{ fontSize: 11 }}>🎯 Match</button>
            <Link href={`/candidates/${candidateId}`} className="btn btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>Full →</Link>
          </div>
        </div>

        {showHotlistAdd && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--warning-bg)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>🔥</span>
            {hotlists.length === 0 ? <span style={{ fontSize: 12 }}>No hotlists. <Link href="/hotlists" style={{ color: 'var(--accent)' }}>Create →</Link></span>
              : <><select value={selectedHotlist} onChange={e => setSelectedHotlist(e.target.value)} style={{ flex: 1, fontSize: 12 }}><option value="">Select...</option>{hotlists.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}</select><button onClick={addToHotlist} disabled={!selectedHotlist} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>Add</button></>}
          </div>
        )}
        {showJobMatch && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--accent-bg)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>🎯</span>
            {jobs.length === 0 ? <span style={{ fontSize: 12 }}>No jobs. <Link href="/jobs" style={{ color: 'var(--accent)' }}>Create →</Link></span>
              : <><select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} style={{ flex: 1, fontSize: 12 }}><option value="">Select...</option>{jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title} — {j.companies?.name}</option>)}</select><button onClick={matchToJob} disabled={!selectedJob} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>Match</button></>}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {commission && (
            <div className="commission-banner">
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--neon-green)' }}>💰 ${commission.toLocaleString()}</span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>${c.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          {/* AI Summary */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                🧠 AI Summary
              </h3>
              {c.ai_notes ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={enrichSummary} disabled={enriching} className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>{enriching ? '...' : '↻'}</button>
                  <button onClick={clearSummary} className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px', color: 'var(--danger)' }}>✕</button>
                </div>
              ) : (
                <button onClick={enrichSummary} disabled={enriching} className="btn btn-sm" style={{ fontSize: 11, color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}>
                  {enriching ? '🧠 Analyzing...' : '🧠 Generate'}
                </button>
              )}
            </div>
            {c.ai_notes ? (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {c.ai_notes}
              </div>
            ) : !enriching && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Click Generate to create a searchable AI summary with skills and tags</p>
            )}
          </div>

          {/* Phone results to confirm */}
          {phoneResults && phoneResults.length > 0 && (
            <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--success-bg)', border: '1px solid var(--neon-green)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--neon-green)', marginBottom: 6 }}>📞 Found {phoneResults.length} — tap to confirm:</p>
              {phoneResults.map((p: any, i: number) => (
                <div key={i} onClick={() => confirmPhone(p.number)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 3, cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--success-bg)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{i === 0 ? '⭐' : '📞'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--neon-green)' }}>{p.number}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.source} · {p.confidence}{p.address ? ` · ${p.address}` : ''}</p>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--neon-green)', fontWeight: 600 }}>Confirm ✓</span>
                </div>
              ))}
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>Confirming auto-applies to all {c.current_company} candidates nearby</p>
            </div>
          )}

          {/* Contact */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Work Phone" field="work_phone" type="tel" />
              <Field label="Cell Phone" field="cell_phone" type="tel" />
              <Field label="Work Email" field="work_email" type="email" />
              <Field label="Personal Email" field="personal_email" type="email" />
            </div>
            {c.linkedin && <div style={{ marginTop: 2 }}><label style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>LinkedIn</label><a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', display: 'block', wordBreak: 'break-all' }}>{c.linkedin.length > 55 ? c.linkedin.slice(0, 53) + '…' : c.linkedin}</a></div>}

            {/* Find Phone + Re-search */}
            {!c.work_phone && c.current_company ? (
              <button onClick={findWorkPhone} disabled={findingPhone} className="btn btn-sm"
                style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 13, color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}>
                {findingPhone ? `🔍 Searching ${c.current_company}...` : '📞 Find Work Phone'}
              </button>
            ) : c.work_phone && (
              <button onClick={() => { saveField('work_phone', ''); setPhoneResults(null) }} className="btn btn-sm"
                style={{ marginTop: 6, width: '100%', justifyContent: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
                ↻ Re-search phone
              </button>
            )}
          </div>

          {/* Professional */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Title" field="current_title" />
              <Field label="Company" field="current_company" />
              <Field label="Location" field="location" />
              <Field label="State" field="state" />
              <Field label="Salary" field="current_salary" type="number" />
              <Field label="Time in Role" field="time_in_current_role" />
              <Field label="Previous Title" field="previous_title" />
              <Field label="Previous Company" field="previous_company" />
            </div>
          </div>

          {pipeline.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matched Jobs</h3>
              {pipeline.map((p: any) => (
                <Link key={p.id} href={`/pipeline/${p.job_id || p.jobs?.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 4, background: 'var(--card-bg-hover)' }}>
                  <span>🎯</span><div style={{ flex: 1 }}><p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{p.jobs?.title}</p><p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.jobs?.companies?.name} · {p.stage}</p></div>
                </Link>
              ))}
            </div>
          )}

          {c.tags?.length > 0 && <div style={{ marginBottom: 14 }}><h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{c.tags.map((t: string) => <span key={t} className="badge badge-gray" style={{ fontSize: 11 }}>{t}</span>)}</div></div>}

          {/* Documents */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents</h3>
            {c.resume_url ? (
              <div style={{ padding: '8px 12px', background: 'var(--accent-bg)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📄</span><a href={c.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, flex: 1 }}>{c.resume_name || 'Resume'}</a>
                <button onClick={async () => { await (sb as any).from('candidates').update({ resume_url: null, resume_name: null }).eq('id', candidateId); load(); showToast('Removed') }} className="btn btn-sm" style={{ fontSize: 10, color: 'var(--danger)', padding: '2px 6px' }}>×</button>
              </div>
            ) : (
              <div onClick={() => document.getElementById('sp-resume')?.click()} style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 12, textAlign: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <p style={{ fontSize: 11, fontWeight: 600 }}>📎 Upload Resume</p>
              </div>
            )}
            <input id="sp-resume" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const path = candidateId + '/' + Date.now() + '.' + file.name.split('.').pop()
              const { error } = await sb.storage.from('resumes').upload(path, file)
              if (error) { showToast('Failed'); return }
              const { data: { publicUrl } } = sb.storage.from('resumes').getPublicUrl(path)
              await (sb as any).from('candidates').update({ resume_url: publicUrl, resume_name: file.name }).eq('id', candidateId)
              load(); showToast('Uploaded!')
            }} />
          </div>

          {/* AI Messages */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Messages <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-tertiary)' }}>Waypoint Search</span></h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {MSG_TYPES.map(mt => (
                <button key={mt.key} onClick={() => generateMessage(mt.key)} disabled={generatingMsg}
                  className="btn btn-sm" style={{ fontSize: 10, padding: '4px 8px', color: msgType === mt.key ? 'var(--neon-green)' : undefined, borderColor: msgType === mt.key ? 'var(--neon-green)' : undefined }}>
                  {mt.icon} {mt.label}
                </button>
              ))}
            </div>
            {generatingMsg && <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8, textAlign: 'center' }}>✨ Writing...</p>}
            {generatedMsg && (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--card-bg-hover)', border: '1px solid var(--border)' }}>
                <pre style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0 }}>{generatedMsg}</pre>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => navigator.clipboard.writeText(generatedMsg).then(() => showToast('Copied!'))} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>📋 Copy</button>
                  <button onClick={() => generateMessage(msgType)} disabled={generatingMsg} className="btn btn-sm" style={{ fontSize: 11 }}>↻ Redo</button>
                  <button onClick={() => { setGeneratedMsg(''); setMsgType('') }} className="btn btn-sm" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Clear</button>
                </div>
              </div>
            )}
          </div>

          {/* Activity */}
          <div><h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity</h3><ActivityFeed candidateId={candidateId} /></div>
        </div>
      </div>
      <style jsx global>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  )
}
