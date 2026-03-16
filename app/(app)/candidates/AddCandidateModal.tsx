'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'

const EMPTY = {
  name: '', location: '', work_email: '', personal_email: '',
  work_phone: '', cell_phone: '', linkedin: '', current_salary: '',
  current_title: '', current_company: '', current_company_url: '',
  time_in_current_role: '', previous_title: '', previous_company: '',
  previous_dates: '', tags: '', source_list: ''
}

export default function AddCandidateModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const router = useRouter()
  const supabase = createSupabaseClient()

  function handleChange(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await (supabase as any).from('candidates').insert([{
      name: form.name,
      location: form.location || null,
      work_email: form.work_email || null,
      personal_email: form.personal_email || null,
      work_phone: form.work_phone || null,
      cell_phone: form.cell_phone || null,
      linkedin: form.linkedin || null,
      current_salary: form.current_salary ? parseInt(form.current_salary) : null,
      current_title: form.current_title || null,
      current_company: form.current_company || null,
      current_company_url: form.current_company_url || null,
      time_in_current_role: form.time_in_current_role || null,
      previous_title: form.previous_title || null,
      previous_company: form.previous_company || null,
      previous_dates: form.previous_dates || null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      source_list: form.source_list || null,
      created_by: user!.id,
    }])
    setLoading(false)
    setOpen(false)
    setForm(EMPTY)
    router.refresh()
  }

  const inp = (k: string, label: string, opts: any = {}) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={opts.type ?? 'text'}
        placeholder={opts.ph ?? ''}
        value={(form as any)[k]}
        onChange={e => handleChange(k, e.target.value)}
        required={opts.required}
      />
    </div>
  )

  if (!open) return (
    <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <UserPlus size={13} />Add candidate
    </button>
  )

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
              {inp('name', 'Full name *', { required: true })}
              {inp('location', 'Location', { ph: 'San Francisco, CA' })}
              {inp('work_email', 'Work email', { type: 'email' })}
              {inp('personal_email', 'Personal email', { type: 'email' })}
              {inp('work_phone', 'Work phone')}
              {inp('cell_phone', 'Cell phone')}
              {inp('linkedin', 'LinkedIn URL')}
              {inp('current_salary', 'Current salary', { type: 'number', ph: '120000' })}
              {inp('current_title', 'Current title')}
              {inp('current_company', 'Current company')}
              {inp('current_company_url', 'Company URL')}
              {inp('time_in_current_role', 'Time in role', { ph: '2 years' })}
              {inp('previous_title', 'Previous title')}
              {inp('previous_company', 'Previous company')}
              {inp('previous_dates', 'Previous dates', { ph: 'Jan 2020 - Mar 2022' })}
              {inp('source_list', 'Source list')}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Tags (comma separated)</label>
                <input className="input" value={form.tags} onChange={e => handleChange('tags', e.target.value)} placeholder="Engineering, Leadership" />
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
