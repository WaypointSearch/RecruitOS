'use client'
import { useState, useRef, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import ActivityFeed from './[id]/ActivityFeed'

export default function CandidateSidePanel({ candidateId, onClose, onUpdated }: {
  candidateId: string; onClose: () => void; onUpdated?: () => void
}) {
  const sb = useRef(createClientComponentClient()).current
  const [c, setC] = useState<any>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [hotlists, setHotlists] = useState<any[]>([])
  const [showHotlistAdd, setShowHotlistAdd] = useState(false)
  const [selectedHotlist, setSelectedHotlist] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const load = async () => {
    const { data } = await (sb as any).from('candidates').select('*').eq('id', candidateId).single()
    setC(data)
    const { data: p } = await (sb as any).from('pipeline').select('*, jobs(title)').eq('candidate_id', candidateId)
    setPipeline(p ?? [])
    const { data: hl } = await (sb as any).from('hotlists').select('*').order('name')
    setHotlists(hl ?? [])
  }
  useEffect(() => { load() }, [candidateId])

  const saveField = async (field: string, value: string) => {
    const update: any = {}
    if (field === 'current_salary') update[field] = value ? parseInt(value.replace(/[^0-9]/g, '')) : null
    else update[field] = value || null
    setC((prev: any) => ({ ...prev, ...update }))
    await (sb as any).from('candidates').update(update).eq('id', candidateId)
    showToast('Saved')
    if (onUpdated) onUpdated()
  }

  const addToHotlist = async () => {
    if (!selectedHotlist) return
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await (sb as any).from('hotlist_candidates').upsert([{
      hotlist_id: selectedHotlist, candidate_id: candidateId, added_by: user?.id
    }], { onConflict: 'hotlist_id,candidate_id' })
    if (error) showToast('Already in that hotlist')
    else showToast('Added to hotlist! 🔥')
    setShowHotlistAdd(false)
  }

  const Field = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState('')
    useEffect(() => { setVal(c?.[field] ?? '') }, [c?.[field]])
    const commit = () => { if (val !== String(c?.[field] ?? '')) saveField(field, val); setEditing(false) }
    if (editing) return (
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 2 }}>{label}</label>
        <input type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} autoFocus style={{ padding: '4px 8px', fontSize: 12 }} />
      </div>
    )
    const dv = field === 'current_salary' && c?.[field] ? `$${c[field].toLocaleString()}` : (c?.[field] || '')
    return (
      <div style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setEditing(true)} title="Click to edit">
        <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 1 }}>{label}</label>
        <p style={{ fontSize: 12, padding: '2px 0', color: dv ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px dashed transparent', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
          {dv || '— click to add —'}
        </p>
      </div>
    )
  }

  if (!c) return <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 500, padding: 24 }}><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></div>

  const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '90vw', background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)', animation: 'slideInRight 0.2s ease' }}>
        {toast && <div className="toast toast-success" style={{ position: 'absolute', top: 10, right: 10, left: 'auto', bottom: 'auto', zIndex: 10 }}>{toast}</div>}

        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 5 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</h2>
            {c.current_title && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.current_title}{c.current_company ? ` @ ${c.current_company}` : ''}</p>}
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {c.metro_area && <span className="badge badge-green" style={{ fontSize: 9 }}>📍 {c.metro_area}</span>}
              {(c.disciplines ?? []).map((d: string) => <span key={d} className="badge badge-blue" style={{ fontSize: 9 }}>{d}</span>)}
            </div>
          </div>
          <button onClick={() => setShowHotlistAdd(!showHotlistAdd)} className="btn btn-sm" style={{ fontSize: 10, padding: '4px 8px' }} title="Add to Hotlist">🔥</button>
          <Link href={`/candidates/${candidateId}`} className="btn btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>Full →</Link>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 4px' }}>×</button>
        </div>

        {showHotlistAdd && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'var(--warning-bg)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>🔥</span>
            <select value={selectedHotlist} onChange={e => setSelectedHotlist(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
              <option value="">Select hotlist...</option>
              {hotlists.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <button onClick={addToHotlist} disabled={!selectedHotlist} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>Add</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
          {commission && (
            <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: 'linear-gradient(135deg, var(--success-bg), var(--accent-bg))', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>💰 ${commission.toLocaleString()} fee</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>${c.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Work Phone" field="work_phone" type="tel" />
              <Field label="Cell Phone" field="cell_phone" type="tel" />
              <Field label="Work Email" field="work_email" type="email" />
              <Field label="Personal Email" field="personal_email" type="email" />
            </div>
            {c.linkedin && <div style={{ marginTop: 2 }}><label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>LinkedIn</label><a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', display: 'block', wordBreak: 'break-all' }}>{c.linkedin.length > 55 ? c.linkedin.slice(0,53)+'…' : c.linkedin}</a></div>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Current Title" field="current_title" />
              <Field label="Current Company" field="current_company" />
              <Field label="Location" field="location" />
              <Field label="Metro Area" field="metro_area" />
              <Field label="Salary" field="current_salary" type="number" />
              <Field label="Time in Role" field="time_in_current_role" />
              <Field label="Previous Title" field="previous_title" />
              <Field label="Previous Company" field="previous_company" />
            </div>
          </div>

          {c.resume_url && <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--accent-bg)', borderRadius: 8 }}><a href={c.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>📄 {c.resume_name || 'View Resume'}</a></div>}

          {c.tags?.length > 0 && <div style={{ marginBottom: 14 }}><h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{c.tags.map((t: string) => <span key={t} className="badge badge-gray" style={{ fontSize: 10 }}>{t}</span>)}</div></div>}

          {pipeline.length > 0 && <div style={{ marginBottom: 14 }}><h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline</h3>{pipeline.map((p: any) => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.stage}</span><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.jobs?.title}</span></div>)}</div>}

          <div><h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity</h3><ActivityFeed candidateId={candidateId} /></div>
        </div>
      </div>
      <style jsx global>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  )
}
