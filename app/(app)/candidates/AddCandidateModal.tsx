'use client'
import { useState, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'

export default function AddCandidateModal() {
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
    const { data: { user } } = await supabase.auth.getUser()
    const tags = get('tags') ? (get('tags') as string).split(',').map(t => t.trim()).filter(Boolean) : []
    await (supabase as any).from('candidates').insert([{
      name: get('name')!, location: get('location'),
      work_email: get('work_email'), personal_email: get('personal_email'),
      work_phone: get('work_phone'), cell_phone: get('cell_phone'),
      linkedin: get('linkedin'),
      current_salary: get('current_salary') ? parseInt(get('current_salary')!) : null,
      current_title: get('current_title'), current_company: get('current_company'),
      current_company_url: get('current_company_url'), time_in_current_role: get('time_in_current_role'),
      previous_title: get('previous_title'), previous_company: get('previous_company'),
      previous_dates: get('previous_dates'), source_list: get('source_list'),
      tags, created_by: user!.id,
    }])
    setLoading(false)
    setOpen(false)
    formRef.current?.reset()
    router.refresh()
  }

  const F = ({ label, name, type = 'text', ph = '' }: any) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} name={name} placeholder={ph} defaultValue="" />
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
            <button type="button" onClick={() => setOpen(false)} className="btn btn-sm"><X size={16} /></button>
          </div>
          <form ref={formRef} onSubmit={submit}>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Full name *" name="name" />
              <F label="Location" name="location" ph="San Francisco, CA" />
              <F label="Work email" name="work_email" type="email" />
              <F label="Personal email" name="personal_email" type="email" />
              <F label="Work phone" name="work_phone" />
              <F label="Cell phone" name="cell_phone" />
              <F label="LinkedIn URL" name="linkedin" />
              <F label="Current salary" name="current_salary" type="number" ph="120000" />
              <F label="Current title" name="current_title" />
              <F label="Current company" name="current_company" />
              <F label="Company URL" name="current_company_url" />
              <F label="Time in role" name="time_in_current_role" ph="2 years" />
              <F label="Previous title" name="previous_title" />
              <F label="Previous company" name="previous_company" />
              <F label="Previous dates" name="previous_dates" ph="Jan 2020 - Mar 2022" />
              <F label="Source list" name="source_list" />
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Tags (comma separated)</label>
                <input className="input" name="tags" placeholder="Engineering, Leadership" defaultValue="" />
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
