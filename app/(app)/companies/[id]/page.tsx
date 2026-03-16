'use client'
import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, MapPin, Plus, Pencil, Trash2, X, AlertTriangle, FileText } from 'lucide-react'

function EditCompanyModal({ company, onSave }: { company: any; onSave: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: company.name ?? '', status: company.status ?? 'Prospect',
    website: company.website ?? '', industry: company.industry ?? '',
    location: company.location ?? '', corporate_phone: company.corporate_phone ?? '',
    local_phone: company.local_phone ?? '', notes: company.notes ?? '',
  })
  const supabase = createSupabaseClient()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await (supabase as any).from('companies').update({
      name: form.name, status: form.status, website: form.website || null,
      industry: form.industry || null, location: form.location || null,
      corporate_phone: form.corporate_phone || null, local_phone: form.local_phone || null,
      notes: form.notes || null,
    }).eq('id', company.id)
    setLoading(false); setOpen(false); onSave()
  }

  if (!open) return <button className="btn btn-sm gap-1" onClick={() => setOpen(true)}><Pencil size={12} />Edit</button>
  return (
    <>
      <div className="modal-backdrop" onClick={() => setOpen(false)} />
      <div className="modal-box">
        <div className="modal-content">
          <div className="modal-header">
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Edit Company</span>
            <button onClick={() => setOpen(false)} className="btn btn-sm"><X size={16} /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: 'span 2' }}><label className="label">Company name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
              <div><label className="label">Status</label><select className="input" value={form.status} onChange={set('status')}><option>Prospect</option><option>Client</option></select></div>
              <div><label className="label">Industry</label><input className="input" value={form.industry} onChange={set('industry')} /></div>
              <div style={{ gridColumn: 'span 2' }}><label className="label">Website</label><input className="input" value={form.website} onChange={set('website')} /></div>
              <div style={{ gridColumn: 'span 2' }}><label className="label">Location</label><input className="input" value={form.location} onChange={set('location')} placeholder="Chicago, IL" /></div>
              <div><label className="label">Corporate phone</label><input className="input" value={form.corporate_phone} onChange={set('corporate_phone')} /></div>
              <div><label className="label">Local phone</label><input className="input" value={form.local_phone} onChange={set('local_phone')} /></div>
              <div style={{ gridColumn: 'span 2' }}><label className="label">Notes</label><textarea className="input" rows={3} style={{ resize: 'none' }} value={form.notes} onChange={set('notes')} /></div>
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

function DeleteCompanyButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()
  async function doDelete() {
    setLoading(true)
    await (supabase as any).from('companies').delete().eq('id', companyId)
    setLoading(false); router.push('/companies'); router.refresh()
  }
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)} style={{ color: 'var(--red-text)', background: 'var(--red-light)', borderColor: 'transparent' }}><Trash2 size={12} />Delete</button>
      {open && (
        <><div className="modal-backdrop" onClick={() => setOpen(false)} />
        <div className="modal-box"><div className="modal-content" style={{ maxWidth: 400 }}>
          <div className="modal-header"><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-text)' }}><AlertTriangle size={16} /><span style={{ fontSize: 15, fontWeight: 600 }}>Delete company?</span></div><button onClick={() => setOpen(false)} className="btn btn-sm"><X size={14} /></button></div>
          <div className="modal-body"><p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>This permanently deletes the company, all contacts, and job orders. <strong style={{ color: 'var(--red-text)' }}>Cannot be undone.</strong></p></div>
          <div className="modal-footer"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={doDelete} disabled={loading}><Trash2 size={13} />{loading ? 'Deleting...' : 'Yes, delete'}</button></div>
        </div></div></>
      )}
    </>
  )
}

function AddContactForm({ companyId, onAdded }: { companyId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', notes: '' })
  const supabase = createSupabaseClient()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await (supabase as any).from('company_contacts').insert([{ company_id: companyId, name: form.name, title: form.title || null, email: form.email || null, phone: form.phone || null, notes: form.notes || null }])
    setLoading(false); setOpen(false); setForm({ name: '', title: '', email: '', phone: '', notes: '' }); onAdded()
  }
  if (!open) return <button className="btn btn-sm gap-1" onClick={() => setOpen(true)}><Plus size={12} />Add contact</button>
  return (
    <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 10 }}>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
        <div><label className="label">Title</label><input className="input" value={form.title} onChange={set('title')} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
        <div style={{ gridColumn: 'span 2' }}><label className="label">Notes about this contact</label><textarea className="input" rows={2} style={{ resize: 'none' }} value={form.notes} onChange={set('notes')} placeholder="Decision maker, prefers email, met at..." /></div>
        <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">{loading ? 'Saving...' : 'Add contact'}</button>
        </div>
      </form>
    </div>
  )
}

function CompanyActivityFeed({ companyId, profileId, profileName }: { companyId: string; profileId: string; profileName: string }) {
  const [activities, setActivities] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createSupabaseClient()

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('company_activities').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30)
    setActivities(data ?? [])
  }, [companyId])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!note.trim()) return
    setSaving(true)
    await (supabase as any).from('company_activities').insert([{ company_id: companyId, type: 'note', content: note.trim(), created_by: profileId, created_by_name: profileName }])
    setNote(''); setSaving(false); load()
  }

  return (
    <div className="mac-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Company Activity</div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <textarea className="input" rows={2} style={{ resize: 'none', fontSize: 13 }} value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
          placeholder="Log activity or note..." />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !note.trim()}>{saving ? 'Saving...' : 'Save note'}</button>
        </div>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {activities.length === 0 && <p style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-4)' }}>No activity yet.</p>}
        {activities.map((a: any) => (
          <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <FileText size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{a.content}</p>
              <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-3)' }}>{a.created_by_name}</span>
                {' · '}{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [company, setCompany] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const [{ data: co }, { data: ct }, { data: js }, { data: pr }] = await Promise.all([
      (supabase as any).from('companies').select('*').eq('id', params.id).single(),
      (supabase as any).from('company_contacts').select('*').eq('company_id', params.id).order('name'),
      (supabase as any).from('jobs').select('*').eq('company_id', params.id).order('created_at', { ascending: false }),
      (supabase as any).from('profiles').select('*').eq('id', session!.user.id).single(),
    ])
    setCompany(co); setContacts(ct ?? []); setJobs(js ?? []); setProfile(pr); setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)', fontSize: 14 }}>Loading...</div>
  )
  if (!company) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>Company not found.</div>
  )

  const initials = company.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/companies" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to companies
      </Link>

      <div className="mac-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-light)', color: 'var(--accent-text)', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>{company.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <span className={'badge ' + (company.status === 'Client' ? 'badge-green' : 'badge-amber')}>{company.status}</span>
              {company.industry && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{company.industry}</span>}
              {company.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-3)' }}><MapPin size={12} />{company.location}</span>}
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}><Globe size={12} />{company.website}</a>}
              {company.corporate_phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-3)' }}><Phone size={12} />Corp: {company.corporate_phone}</span>}
              {company.local_phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-3)' }}><Phone size={12} />Local: {company.local_phone}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <EditCompanyModal company={company} onSave={load} />
            <DeleteCompanyButton companyId={company.id} />
          </div>
        </div>
        {company.notes && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 12, padding: '10px 14px', background: 'var(--surface-sunken)', borderRadius: 8, lineHeight: 1.6 }}>{company.notes}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="mac-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Contacts ({contacts.length}/5)</div>
              {contacts.length < 5 && <AddContactForm companyId={company.id} onAdded={load} />}
            </div>
            {contacts.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-4)' }}>No contacts yet.</p>}
            {contacts.map((c: any) => (
              <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-light)', color: 'var(--green-text)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    {c.title && <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{c.title}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  {c.email && <a href={'mailto:' + c.email} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}><Mail size={11} />{c.email}</a>}
                  {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}><Phone size={11} />{c.phone}</span>}
                </div>
                {c.notes && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, padding: '6px 8px', background: 'var(--surface-sunken)', borderRadius: 6, lineHeight: 1.5 }}>{c.notes}</p>}
              </div>
            ))}
          </div>
          {profile && <CompanyActivityFeed companyId={company.id} profileId={profile.id} profileName={profile.full_name || profile.email} />}
        </div>

        <div className="mac-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Job orders ({jobs.length})</div>
            <Link href="/jobs" className="btn btn-sm btn-primary"><Plus size={12} />Add job</Link>
          </div>
          {jobs.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-4)' }}>No job orders yet.</p>}
          {jobs.map((j: any) => (
            <Link key={j.id} href={'/pipeline/' + j.id} style={{ display: 'block', textDecoration: 'none', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8, background: 'var(--surface-sunken)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'var(--accent)'; (e.currentTarget as any).style.background = 'var(--accent-light)' }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border)'; (e.currentTarget as any).style.background = 'var(--surface-sunken)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
                    {j.location}{j.salary_min ? ' · $' + Math.round(j.salary_min/1000) + 'K–$' + Math.round(j.salary_max/1000) + 'K' : ''}
                  </div>
                </div>
                <span className={'badge ' + (j.status === 'Active' ? 'badge-green' : 'badge-gray')}>{j.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
