'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'

export default function AddCandidateModal({ onAdded }: { onAdded?: () => void } = {}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', location: '', work_email: '', personal_email: '',
    work_phone: '', cell_phone: '', linkedin: '', current_salary: '',
    current_title: '', current_company: '', current_company_url: '',
    time_in_current_role: '', previous_title: '', previous_company: '',
    previous_dates: '', tags: '', source_list: ''
  })
  const router = useRouter()
  const supabase = createSupabaseClient()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await (supabase as any).from('candidates').insert([{
      name: form.name, location: form.location || null,
      work_email: form.work_email || null, personal_email: form.personal_email || null,
      work_phone: form.work_phone || null, cell_phone: form.cell_phone || null,
      linkedin: form.linkedin || null,
      current_salary: form.current_salary ? parseInt(form.current_salary) : null,
      current_title: form.current_title || null, current_company: form.current_company || null,
      current_company_url: form.current_company_url || null, time_in_current_role: form.time_in_current_role || null,
      previous_title: form.previous_title || null, previous_company: form.previous_company || null,
      previous_dates: form.previous_dates || null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      source_list: form.source_list || null, created_by: user!.id,
    }])
    setLoading(false); setOpen(false); if (onAdded) onAdded(); else router.refresh()
  }

  const F = ({ label, k, type = 'text', ph = '' }: any) => (
    <div><label className="label">{label}</label><input className="input" type={type} value={(form as any)[k]} onChange={set(k)} placeholder={ph} /></div>
  )

  if (!open) return <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setOpen(true)}><UserPlus size={13} />Add candidate</button>

  return (
    <>
      <div className="modal-backdrop" onClick={() => setOpen(false)} />
      <div className="modal-box">
        <div className="modal-content" style={{ maxWidth: 620 }}>
          <div className="modal-header">
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Add candidate</span>
            <button onClick={() => setOpen(false)} className="btn btn-sm"><X size={16} /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Full name *" k="name" /><F label="Location" k="location" ph="San Francisco, CA" />
              <F label="Work email" k="work_email" type="email" /><F label="Personal email" k="personal_email" type="email" />
              <F label="Work phone" k="work_phone" /><F label="Cell phone" k="cell_phone" />
              <F label="LinkedIn URL" k="linkedin" /><F label="Current salary" k="current_salary" type="number" ph="120000" />
              <F label="Current title" k="current_title" /><F label="Current company" k="current_company" />
              <F label="Company URL" k="current_company_url" /><F label="Time in role" k="time_in_current_role" ph="2 years" />
              <F label="Previous title" k="previous_title" /><F label="Previous company" k="previous_company" />
              <F label="Previous dates" k="previous_dates" ph="Jan 2020 - Mar 2022" /><F label="Source list" k="source_list" />
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Tags (comma separated)</label>
                <input className="input" value={form.tags} onChange={set('tags')} placeholder="Engineering, Leadership" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save candidate'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
