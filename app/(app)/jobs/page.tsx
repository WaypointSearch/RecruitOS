'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function JobsPage() {
  const sb = useRef(createClientComponentClient()).current
  const [jobs, setJobs] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingJob, setEditingJob] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    const { data: j } = await (sb as any).from('jobs').select('*, companies(name)').order('created_at', { ascending: false })
    setJobs(j ?? [])
    const { data: c } = await (sb as any).from('companies').select('id, name').eq('status', 'Client').order('name')
    setCompanies(c ?? [])
    const { data: ct } = await (sb as any).from('company_contacts').select('id, name, company_id')
    setContacts(ct ?? [])
  }

  useEffect(() => { load() }, [])

  const addJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await sb.auth.getUser()
    const obj: any = { created_by: user?.id }
    for (const [k, v] of fd.entries()) {
      if (k === 'salary_min' || k === 'salary_max') obj[k] = v ? parseInt(v as string) : null
      else obj[k] = v || null
    }
    await (sb as any).from('jobs').insert([obj])
    showToast('Job order created')
    setAdding(false)
    load()
  }

  const updateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const obj: any = {}
    for (const [k, v] of fd.entries()) {
      if (k === 'salary_min' || k === 'salary_max') obj[k] = v ? parseInt(v as string) : null
      else obj[k] = v || null
    }
    await (sb as any).from('jobs').update(obj).eq('id', editingJob.id)
    showToast('Job order updated')
    setEditingJob(null)
    load()
  }

  const deleteJob = async (id: string) => {
    await (sb as any).from('jobs').delete().eq('id', id)
    showToast('Job order deleted')
    setConfirmDelete(null)
    load()
  }

  const filtered = jobs.filter((j: any) => {
    const q = search.toLowerCase()
    return !q || j.title?.toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q)
  })

  const JobForm = ({ job, onSubmit, onCancel }: { job?: any; onSubmit: (e: any) => void; onCancel: () => void }) => (
    <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Title *</label>
        <input name="title" defaultValue={job?.title || ''} required />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Company *</label>
        <select name="company_id" defaultValue={job?.company_id || ''} required>
          <option value="">Select company...</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Contact</label>
        <select name="contact_id" defaultValue={job?.contact_id || ''}>
          <option value="">Select contact...</option>
          {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Location</label>
        <input name="location" defaultValue={job?.location || ''} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
        <select name="status" defaultValue={job?.status || 'Active'}>
          <option>Active</option><option>On Hold</option><option>Filled</option><option>Cancelled</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Salary Min</label>
        <input name="salary_min" type="number" defaultValue={job?.salary_min || ''} placeholder="e.g. 80000" />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Salary Max</label>
        <input name="salary_max" type="number" defaultValue={job?.salary_max || ''} placeholder="e.g. 120000" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
        <textarea name="description" defaultValue={job?.description || ''} rows={4} />
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm">{job ? 'Update' : 'Create'}</button>
        <button type="button" onClick={onCancel} className="btn btn-sm">Cancel</button>
      </div>
    </form>
  )

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Job Orders</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <button onClick={() => { setAdding(!adding); setEditingJob(null) }} className="btn btn-primary btn-sm">+ New Job</button>
        </div>
      </div>

      {adding && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Create Job Order</h3>
          <JobForm onSubmit={addJob} onCancel={() => setAdding(false)} />
        </div>
      )}

      {editingJob && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Edit: {editingJob.title}</h3>
          <JobForm job={editingJob} onSubmit={updateJob} onCancel={() => setEditingJob(null)} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map((j: any) => (
          <div key={j.id} className="card" style={{ padding: 16, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <Link href={`/pipeline/${j.id}`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {j.title}
                </Link>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {j.companies?.name || 'No company'}
                </p>
              </div>
              <span className={`badge ${j.status === 'Active' ? 'badge-green' : j.status === 'On Hold' ? 'badge-yellow' : 'badge-gray'}`}>
                {j.status}
              </span>
            </div>

            {j.location && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {j.location}</p>}
            {(j.salary_min || j.salary_max) && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                💰 {j.salary_min ? `$${(j.salary_min / 1000).toFixed(0)}k` : '?'} – {j.salary_max ? `$${(j.salary_max / 1000).toFixed(0)}k` : '?'}
              </p>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Link href={`/pipeline/${j.id}`} className="btn btn-sm" style={{ textDecoration: 'none' }}>View Pipeline</Link>
              <button onClick={() => { setEditingJob(j); setAdding(false) }} className="btn btn-sm">✏️</button>
              <button onClick={() => setConfirmDelete(j.id)} className="btn btn-sm" style={{ color: 'var(--danger)' }}>🗑</button>
            </div>

            {confirmDelete === j.id && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--danger-bg)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1 }}>Delete "{j.title}" and all pipeline data?</span>
                <button onClick={() => deleteJob(j.id)} className="btn btn-danger btn-sm" style={{ fontSize: 11 }}>Yes</button>
                <button onClick={() => setConfirmDelete(null)} className="btn btn-sm" style={{ fontSize: 11 }}>No</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            {search ? 'No jobs match your search' : 'No job orders yet — create one above'}
          </p>
        </div>
      )}
    </div>
  )
}
