'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Building2, X } from 'lucide-react'

export default function AddCompanyModal({ onAdded }: { onAdded?: () => void } = {}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', status: 'Prospect', website: '', industry: '', location: '',
    corporate_phone: '', local_phone: '', notes: '',
    contact_name: '', contact_title: '', contact_email: '', contact_phone: ''
  })
  const supabase = createSupabaseClient()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: company } = await (supabase as any).from('companies').insert([{
      name: form.name, status: form.status,
      website: form.website || null, industry: form.industry || null,
      location: form.location || null, corporate_phone: form.corporate_phone || null,
      local_phone: form.local_phone || null, notes: form.notes || null,
      created_by: user!.id,
    }]).select().single()
    if (company && form.contact_name) {
      await (supabase as any).from('company_contacts').insert([{
        company_id: company.id, name: form.contact_name,
        title: form.contact_title || null, email: form.contact_email || null,
        phone: form.contact_phone || null,
      }])
    }
    setLoading(false)
    setOpen(false)
    setForm({ name:'',status:'Prospect',website:'',industry:'',location:'',corporate_phone:'',local_phone:'',notes:'',contact_name:'',contact_title:'',contact_email:'',contact_phone:'' })
    if (onAdded) onAdded()
  }

  const F = ({ label, k, type = 'text', ph = '', span = false }: any) => (
    <div style={span ? { gridColumn: 'span 2' } : {}}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={(form as any)[k]} onChange={set(k)} placeholder={ph} />
    </div>
  )

  if (!open) return (
    <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Building2 size={13} />Add company
    </button>
  )

  return (
    <>
      <div className="modal-backdrop" onClick={() => setOpen(false)} />
      <div className="modal-box">
        <div className="modal-content">
          <div className="modal-header">
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Add company</span>
            <button onClick={() => setOpen(false)} className="btn btn-sm"><X size={16} /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Company name *" k="name" span />
              <div><label className="label">Status</label><select className="input" value={form.status} onChange={set('status')}><option>Prospect</option><option>Client</option></select></div>
              <F label="Industry" k="industry" />
              <F label="Website" k="website" span />
              <F label="Location" k="location" ph="Chicago, IL" span />
              <F label="Corporate phone" k="corporate_phone" />
              <F label="Local phone" k="local_phone" />
              <div style={{ gridColumn: 'span 2', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Primary contact (optional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <F label="Name" k="contact_name" />
                  <F label="Title" k="contact_title" />
                  <F label="Email" k="contact_email" type="email" />
                  <F label="Phone" k="contact_phone" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save company'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
