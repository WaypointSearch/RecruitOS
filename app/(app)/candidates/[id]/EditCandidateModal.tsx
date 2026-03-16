'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Pencil, X } from 'lucide-react'
import type { Candidate } from '@/types/database'

export default function EditCandidateModal({ candidate }: { candidate: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: candidate.name ?? '', location: candidate.location ?? '',
    work_email: candidate.work_email ?? '', personal_email: candidate.personal_email ?? '',
    work_phone: candidate.work_phone ?? '', cell_phone: candidate.cell_phone ?? '',
    email: candidate.email ?? '', phone: candidate.phone ?? '',
    current_salary: candidate.current_salary ? String(candidate.current_salary) : '',
    linkedin: candidate.linkedin ?? '', current_title: candidate.current_title ?? '',
    current_company: candidate.current_company ?? '', current_company_url: candidate.current_company_url ?? '',
    time_in_current_role: candidate.time_in_current_role ?? '', previous_title: candidate.previous_title ?? '',
    previous_company: candidate.previous_company ?? '', previous_dates: candidate.previous_dates ?? '',
    tags: (candidate.tags ?? []).join(', '), source_list: candidate.source_list ?? '',
  })
  const router = useRouter()
  const supabase = createSupabaseClient()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await (supabase as any).from('candidates').update({
      name: form.name, location: form.location || null,
      work_email: form.work_email || null, personal_email: form.personal_email || null,
      work_phone: form.work_phone || null, cell_phone: form.cell_phone || null,
      email: form.email || null, phone: form.phone || null,
      current_salary: form.current_salary ? parseInt(form.current_salary) : null,
      linkedin: form.linkedin || null, current_title: form.current_title || null,
      current_company: form.current_company || null, current_company_url: form.current_company_url || null,
      time_in_current_role: form.time_in_current_role || null, previous_title: form.previous_title || null,
      previous_company: form.previous_company || null, previous_dates: form.previous_dates || null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      source_list: form.source_list || null,
    }).eq('id', candidate.id)
    setLoading(false); setOpen(false); router.refresh()
  }

  const F = ({ label, k, type = 'text', ph = '' }: any) => (
    <div><label className="label">{label}</label><input className="input" type={type} value={(form as any)[k]} onChange={set(k)} placeholder={ph} /></div>
  )

  if (!open) return <button className="btn btn-sm gap-1" onClick={() => setOpen(true)}><Pencil size={12} />Edit</button>

  return (
    <>
      <div className="modal-backdrop" onClick={() => setOpen(false)} />
      <div className="modal-box">
        <div className="modal-content" style={{ maxWidth: 640 }}>
          <div className="modal-header">
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Edit Candidate</span>
            <button onClick={() => setOpen(false)} className="btn btn-sm"><X size={16} /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Full name *" k="name" /><F label="Location" k="location" ph="San Francisco, CA" />
              </div>
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="section-title">Contact info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Work email" k="work_email" type="email" /><F label="Personal email" k="personal_email" type="email" />
                  <F label="Work phone" k="work_phone" /><F label="Cell phone" k="cell_phone" />
                  <F label="Email (general)" k="email" type="email" /><F label="Phone (general)" k="phone" />
                  <F label="LinkedIn URL" k="linkedin" /><F label="Current salary" k="current_salary" type="number" ph="120000" />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="section-title">Current position</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Current title" k="current_title" /><F label="Current company" k="current_company" />
                  <F label="Company URL" k="current_company_url" /><F label="Time in role" k="time_in_current_role" ph="2.5 years" />
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="section-title">Previous position</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Previous title" k="previous_title" /><F label="Previous company" k="previous_company" />
                  <F label="Previous dates" k="previous_dates" ph="Jan 2020 - Mar 2022" /><F label="Source list" k="source_list" />
                </div>
              </div>
              <div><label className="label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={set('tags')} placeholder="Engineering, Leadership" /></div>
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
