'use client'
import { useState, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Pencil, X } from 'lucide-react'

export default function EditCandidateModal({ candidate }: { candidate: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setLoading(true)
    const fd = new FormData(formRef.current)
    const get = (k: string) => (fd.get(k) as string)?.trim() || null
    const tags = get('tags') ? (get('tags') as string).split(',').map(t => t.trim()).filter(Boolean) : []
    await (supabase as any).from('candidates').update({
      name: get('name')!, location: get('location'),
      work_email: get('work_email'), personal_email: get('personal_email'),
      work_phone: get('work_phone'), cell_phone: get('cell_phone'),
      email: get('email'), phone: get('phone'),
      current_salary: get('current_salary') ? parseInt(get('current_salary')!) : null,
      linkedin: get('linkedin'), current_title: get('current_title'),
      current_company: get('current_company'), current_company_url: get('current_company_url'),
      time_in_current_role: get('time_in_current_role'), previous_title: get('previous_title'),
      previous_company: get('previous_company'), previous_dates: get('previous_dates'),
      source_list: get('source_list'), tags,
    }).eq('id', candidate.id)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  // Helper: uncontrolled input with defaultValue from candidate
  const F = ({ label, name, type = 'text', ph = '' }: any) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} name={name} placeholder={ph}
        defaultValue={candidate[name] ?? ''} key={candidate.id + '-' + name} />
    </div>
  )

  if (!open) return (
    <button className="btn btn-sm" onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Pencil size={12} />Edit
    </button>
  )

  return (
    <>
      <div className="modal-backdrop" onClick={() => setOpen(false)} />
      <div className="modal-box">
        <div className="modal-content" style={{ maxWidth: 640 }}>
          <div className="modal-header">
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Edit Candidate</span>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-sm"><X size={16} /></button>
          </div>
          <form ref={formRef} onSubmit={submit}>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Full name *" name="name" />
                <F label="Location" name="location" ph="San Francisco, CA" />
              </div>
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="section-title">Contact info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Work email" name="work_email" type="email" />
                  <F label="Personal email" name="personal_email" type="email" />
                  <F label="Work phone" name="work_phone" />
                  <F label="Cell phone" name="cell_phone" />
                  <F label="Email (general)" name="email" type="email" />
                  <F label="Phone (general)" name="phone" />
                  <F label="LinkedIn URL" name="linkedin" />
                  <F label="Current salary" name="current_salary" type="number" ph="120000" />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="section-title">Current position</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Current title" name="current_title" />
                  <F label="Current company" name="current_company" />
                  <F label="Company URL" name="current_company_url" />
                  <F label="Time in role" name="time_in_current_role" ph="2.5 years" />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="section-title">Previous position</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Previous title" name="previous_title" />
                  <F label="Previous company" name="previous_company" />
                  <F label="Previous dates" name="previous_dates" ph="Jan 2020 - Mar 2022" />
                  <F label="Source list" name="source_list" />
                </div>
              </div>
              <div>
                <label className="label">Tags (comma separated)</label>
                <input className="input" name="tags" placeholder="Engineering, Leadership"
                  defaultValue={(candidate.tags ?? []).join(', ')} key={candidate.id + '-tags'} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
