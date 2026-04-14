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
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const load = async () => {
    const { data } = await (sb as any).from('candidates').select('*').eq('id', candidateId).single()
    setC(data)
    const { data: p } = await (sb as any).from('pipeline').select('*, jobs(title)').eq('candidate_id', candidateId)
    setPipeline(p ?? [])
  }

  useEffect(() => { load() }, [candidateId])

  // Instant save — updates local state AND database
  const saveField = async (field: string, value: string) => {
    const update: any = {}
    if (field === 'current_salary') update[field] = value ? parseInt(value.replace(/[^0-9]/g, '')) : null
    else update[field] = value || null

    // Optimistic update — show change immediately
    setC((prev: any) => ({ ...prev, ...update }))

    await (sb as any).from('candidates').update(update).eq('id', candidateId)
    showToast('Saved')
    if (onUpdated) onUpdated()
  }

  // Inline editable field component
  const Field = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState('')

    useEffect(() => { setVal(c?.[field] ?? '') }, [c?.[field]])

    const commit = () => {
      const current = c?.[field] ?? ''
      if (val !== String(current)) saveField(field, val)
      setEditing(false)
    }

    if (editing) {
      return (
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 2 }}>{label}</label>
          <input type={type} value={val} onChange={e => setVal(e.target.value)}
            onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()}
            autoFocus style={{ padding: '4px 8px', fontSize: 12 }} />
        </div>
      )
    }

    const displayVal = field === 'current_salary' && c?.[field] ? `$${c[field].toLocaleString()}` : (c?.[field] || '')

    return (
      <div style={{ marginBottom: 8, cursor: 'pointer', minHeight: 32 }} onClick={() => setEditing(true)} title="Click to edit">
        <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 1 }}>{label}</label>
        <p style={{
          fontSize: 12, padding: '2px 0',
          color: displayVal ? 'var(--text-primary)' : 'var(--text-tertiary)',
          borderBottom: '1px dashed transparent', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
          {displayVal || '— click to add —'}
        </p>
      </div>
    )
  }

  if (!c) return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 500, padding: 24 }}>
      <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
    </div>
  )

  const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 400 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '90vw',
        background: 'var(--card-bg)', borderLeft: '1px solid var(--border)',
        zIndex: 500, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.2s ease',
      }}>
        {toast && <div className="toast toast-success" style={{ position: 'absolute', top: 10, right: 10, left: 'auto', bottom: 'auto', zIndex: 10 }}>{toast}</div>}

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 5 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{c.name}</h2>
            {c.current_title && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.current_title} {c.current_company && `@ ${c.current_company}`}</p>}
            {c.metro_area && <span className="badge badge-green" style={{ fontSize: 9, marginTop: 3, display: 'inline-block' }}>📍 {c.metro_area}</span>}
          </div>
          <Link href={`/candidates/${candidateId}`} className="btn btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>Full →</Link>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 4px' }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>

          {/* Commission banner */}
          {commission && (
            <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: 'linear-gradient(135deg, var(--success-bg), var(--accent-bg))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>💰 ${commission.toLocaleString()} potential fee</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>${c.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          {/* Contact — reordered: Work Phone | Cell Phone, Work Email | Personal Email */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Work Phone" field="work_phone" type="tel" />
              <Field label="Cell Phone" field="cell_phone" type="tel" />
              <Field label="Work Email" field="work_email" type="email" />
              <Field label="Personal Email" field="personal_email" type="email" />
            </div>
            {c.linkedin && (
              <div style={{ marginTop: 2 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>LinkedIn</label>
                <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', display: 'block', wordBreak: 'break-all' }}>
                  {c.linkedin.length > 55 ? c.linkedin.slice(0, 53) + '…' : c.linkedin}
                </a>
              </div>
            )}
          </div>

          {/* Professional */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Professional</h3>
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

          {/* Disciplines */}
          {c.disciplines?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Disciplines</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.disciplines.map((d: string) => <span key={d} className="badge badge-blue" style={{ fontSize: 10 }}>{d}</span>)}
              </div>
            </div>
          )}

          {/* Resume */}
          {c.resume_url && (
            <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--accent-bg)', borderRadius: 8 }}>
              <a href={c.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>📄 {c.resume_name || 'View Resume'}</a>
            </div>
          )}

          {/* Tags */}
          {c.tags?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.tags.map((t: string) => <span key={t} className="badge badge-gray" style={{ fontSize: 10 }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* Pipeline */}
          {pipeline.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pipeline</h3>
              {pipeline.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.stage}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.jobs?.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Activity */}
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Activity</h3>
            <ActivityFeed candidateId={candidateId} />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
