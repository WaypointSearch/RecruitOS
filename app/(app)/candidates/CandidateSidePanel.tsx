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
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const load = async () => {
    const { data } = await (sb as any).from('candidates').select('*').eq('id', candidateId).single()
    setC(data)
    const { data: p } = await (sb as any).from('pipeline').select('*, jobs(title)').eq('candidate_id', candidateId)
    setPipeline(p ?? [])
  }

  useEffect(() => { load() }, [candidateId])

  const saveField = async (field: string, value: string) => {
    setSaving(field)
    const update: any = {}
    if (field === 'current_salary') update[field] = value ? parseInt(value.replace(/[^0-9]/g, '')) : null
    else update[field] = value || null
    await (sb as any).from('candidates').update(update).eq('id', candidateId)
    setC((prev: any) => ({ ...prev, [field]: update[field] }))
    setSaving(null)
    showToast('Saved')
    if (onUpdated) onUpdated()
  }

  const InlineField = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setVal(c?.[field] || '') }, [c?.[field]])

    const save = () => {
      if (val !== (c?.[field] || '')) saveField(field, val)
      setEditing(false)
    }

    if (editing) {
      return (
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
          <input
            ref={inputRef}
            type={type}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            autoFocus
            style={{ padding: '4px 8px', fontSize: 12 }}
          />
        </div>
      )
    }

    return (
      <div style={{ marginBottom: 6, cursor: 'pointer' }} onClick={() => setEditing(true)} title="Click to edit">
        <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
        <p style={{
          fontSize: 12, color: c?.[field] ? 'var(--text-primary)' : 'var(--text-tertiary)',
          padding: '2px 0', borderBottom: '1px dashed transparent',
          transition: 'border-color 0.15s',
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
          {field === 'current_salary' && c?.[field] ? `$${c[field].toLocaleString()}` : (c?.[field] || '—')}
          {saving === field && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>saving...</span>}
        </p>
      </div>
    )
  }

  if (!c) return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 500, padding: 24 }}>
      <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
    </div>
  )

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 400 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
        background: 'var(--card-bg)', borderLeft: '1px solid var(--border)',
        zIndex: 500, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.2s ease',
        overflowY: 'auto',
      }}>
        {toast && <div className="toast toast-success" style={{ position: 'absolute', top: 10, right: 10, left: 'auto', bottom: 'auto' }}>{toast}</div>}

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{c.name}</h2>
            {c.current_title && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.current_title}</p>}
          </div>
          <Link href={`/candidates/${candidateId}`} className="btn btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}>
            Full Profile →
          </Link>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>

        <div style={{ padding: '12px 20px', flex: 1 }}>
          {/* Contact — inline editable */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <InlineField label="Cell Phone" field="cell_phone" type="tel" />
              <InlineField label="Work Phone" field="work_phone" type="tel" />
              <InlineField label="Work Email" field="work_email" type="email" />
              <InlineField label="Personal Email" field="personal_email" type="email" />
            </div>
            {c.linkedin && (
              <div style={{ marginTop: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>LinkedIn</label>
                <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', display: 'block', wordBreak: 'break-all' }}>
                  {c.linkedin.length > 60 ? c.linkedin.slice(0, 58) + '…' : c.linkedin}
                </a>
              </div>
            )}
          </div>

          {/* Professional — inline editable */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>Professional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <InlineField label="Current Title" field="current_title" />
              <InlineField label="Current Company" field="current_company" />
              <InlineField label="Location" field="location" />
              <InlineField label="Metro Area" field="metro_area" />
              <InlineField label="Salary" field="current_salary" type="number" />
              <InlineField label="Time in Role" field="time_in_current_role" />
              <InlineField label="Previous Title" field="previous_title" />
              <InlineField label="Previous Company" field="previous_company" />
            </div>
          </div>

          {/* Resume */}
          {c.resume_url && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--accent-bg)', borderRadius: 8 }}>
              <a href={c.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                📄 {c.resume_name || 'View Resume'}
              </a>
            </div>
          )}

          {/* Tags */}
          {c.tags?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.tags.map((t: string) => <span key={t} className="badge badge-gray" style={{ fontSize: 10 }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* Pipeline */}
          {pipeline.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Pipeline</h3>
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
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>Activity</h3>
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
