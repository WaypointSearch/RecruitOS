'use client'
import { useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function EditCandidateModal({ candidate, onClose, onSaved }: { candidate: any; onClose: () => void; onSaved: () => void }) {
  const sb = useRef(createClientComponentClient()).current

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const updates: any = {}
    for (const [k, v] of Array.from(fd.entries())) {
      if (k === 'current_salary') updates[k] = v ? parseInt(v as string) : null
      else if (k === 'tags') updates[k] = (v as string).split(',').map((t: string) => t.trim()).filter(Boolean)
      else updates[k] = v || null
    }
    await (sb as any).from('candidates').update(updates).eq('id', candidate.id)
    onSaved()
  }

  const fields = [
    { name: 'name', label: 'Name *', type: 'text', required: true },
    { name: 'work_email', label: 'Work Email', type: 'email' },
    { name: 'personal_email', label: 'Personal Email', type: 'email' },
    { name: 'email', label: 'Email (legacy)', type: 'email' },
    { name: 'cell_phone', label: 'Cell Phone', type: 'tel' },
    { name: 'work_phone', label: 'Work Phone', type: 'tel' },
    { name: 'phone', label: 'Phone (legacy)', type: 'tel' },
    { name: 'linkedin', label: 'LinkedIn', type: 'url' },
    { name: 'current_title', label: 'Current Title', type: 'text' },
    { name: 'current_company', label: 'Current Company', type: 'text' },
    { name: 'current_company_url', label: 'Company URL', type: 'url' },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'current_salary', label: 'Current Salary', type: 'number' },
    { name: 'time_in_current_role', label: 'Time in Current Role', type: 'text' },
    { name: 'previous_title', label: 'Previous Title', type: 'text' },
    { name: 'previous_company', label: 'Previous Company', type: 'text' },
    { name: 'previous_dates', label: 'Previous Dates', type: 'text' },
    { name: 'tags', label: 'Tags (comma-separated)', type: 'text' },
  ]

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 550 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Edit Candidate</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {fields.map((f) => (
              <div key={f.name} style={f.name === 'tags' ? { gridColumn: '1 / -1' } : undefined}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>{f.label}</label>
                <input
                  name={f.name}
                  type={f.type}
                  defaultValue={f.name === 'tags' ? (candidate.tags || []).join(', ') : (candidate[f.name] || '')}
                  required={f.required}
                />
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
