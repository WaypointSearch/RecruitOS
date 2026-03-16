'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function CompanyDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const sb = useRef(createClientComponentClient()).current

  const [company, setCompany] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState(false)
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDeleteActivity, setConfirmDeleteActivity] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    const { data: c } = await (sb as any).from('companies').select('*').eq('id', id).single()
    setCompany(c)
    const { data: ct } = await (sb as any).from('company_contacts').select('*').eq('company_id', id).order('created_at')
    setContacts(ct ?? [])
    const { data: j } = await (sb as any).from('jobs').select('*').eq('company_id', id).order('created_at', { ascending: false })
    setJobs(j ?? [])
    const { data: u } = await (sb as any).from('profiles').select('id, full_name, email, avatar_url')
    setUsers(u ?? [])
    try {
      const { data: acts } = await (sb as any).from('company_activities').select('*').eq('company_id', id).order('created_at', { ascending: false }).limit(50)
      setActivities(acts ?? [])
    } catch { setActivities([]) }
  }, [id, sb])

  useEffect(() => { load() }, [load])

  const saveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const updates: any = {}
    for (const [k, v] of Array.from(fd.entries())) updates[k] = v || null
    await (sb as any).from('companies').update(updates).eq('id', id)
    showToast('Company updated')
    setEditing(false)
    load()
  }

  const deleteCompany = async () => {
    await (sb as any).from('companies').delete().eq('id', id)
    router.push('/companies')
  }

  const addContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (contacts.length >= 5) { showToast('Maximum 5 contacts per company'); return }
    const fd = new FormData(e.currentTarget)
    const obj: any = { company_id: id }
    for (const [k, v] of Array.from(fd.entries())) obj[k] = v || null
    await (sb as any).from('company_contacts').insert([obj])
    showToast('Contact added')
    setAddingContact(false)
    load()
  }

  const deleteContact = async (cid: string) => {
    await (sb as any).from('company_contacts').delete().eq('id', cid)
    showToast('Contact deleted')
    setConfirmDeleteContact(null)
    load()
  }

  const saveNote = async () => {
    if (!note.trim()) return
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await (sb as any).from('company_activities').insert([{
      company_id: id, type: 'note', content: note.trim(),
      created_by: user.id, created_by_name: user.email?.split('@')[0],
    }])
    setNote('')
    showToast('Note saved')
    load()
  }

  const deleteActivity = async (aid: string) => {
    await (sb as any).from('company_activities').delete().eq('id', aid)
    showToast('Activity deleted')
    setConfirmDeleteActivity(null)
    load()
  }

  const updateAccountManager = async (userId: string) => {
    await (sb as any).from('companies').update({ account_manager_id: userId || null }).eq('id', id)
    showToast('Account manager updated')
    load()
  }

  if (!company) return <div className="main-content"><p>Loading...</p></div>

  const mgr = users.find((u: any) => u.id === company.account_manager_id)

  return (
    <div style={{ maxWidth: '100%' }}>
      {toast && <div className="toast toast-success">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link href="/companies" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Companies</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, flex: 1 }}>{company.name}</h1>
        <span className={`badge ${company.status === 'Client' ? 'badge-green' : 'badge-yellow'}`}>
          {company.status}
        </span>
        <button onClick={() => setEditing(!editing)} className="btn btn-sm">✏️ Edit</button>
        <button onClick={() => setConfirmDeleteCompany(true)} className="btn btn-danger btn-sm">🗑 Delete</button>
      </div>

      {/* Delete company confirmation */}
      {confirmDeleteCompany && (
        <div className="modal-overlay">
          <div className="confirm-dialog">
            <h3>Delete Company?</h3>
            <p>This will permanently delete "{company.name}" and all associated contacts, jobs, and pipeline data.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={deleteCompany} className="btn btn-danger">Yes, Delete</button>
              <button onClick={() => setConfirmDeleteCompany(false)} className="btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }} className="candidate-profile-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Edit Form */}
          {editing && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Edit Company</h3>
              <form onSubmit={saveCompany} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
                  <input name="name" defaultValue={company.name} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                  <select name="status" defaultValue={company.status}>
                    <option>Prospect</option><option>Client</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Website</label>
                  <input name="website" defaultValue={company.website || ''} type="url" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Industry</label>
                  <input name="industry" defaultValue={company.industry || ''} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Location</label>
                  <input name="location" defaultValue={company.location || ''} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Corporate Phone</label>
                  <input name="corporate_phone" defaultValue={company.corporate_phone || ''} type="tel" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Local Phone</label>
                  <input name="local_phone" defaultValue={company.local_phone || ''} type="tel" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Company URL</label>
                  <input name="company_url" defaultValue={company.company_url || ''} type="url" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Notes</label>
                  <textarea name="notes" defaultValue={company.notes || ''} rows={3} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Company Info Card */}
          {!editing && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Industry', company.industry],
                  ['Location', company.location],
                  ['Website', company.website],
                  ['Company URL', company.company_url],
                  ['Corporate Phone', company.corporate_phone],
                  ['Local Phone', company.local_phone],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontSize: 13, color: val ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {(val as string) || '—'}
                    </p>
                  </div>
                ))}
              </div>
              {company.notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Notes</p>
                  <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{company.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Account Manager */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Account Manager</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={company.account_manager_id || ''}
                onChange={(e) => updateAccountManager(e.target.value)}
                style={{ maxWidth: 250 }}
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
              {mgr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="avatar" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    {mgr.avatar_url
                      ? <img src={mgr.avatar_url} alt="" />
                      : (mgr.full_name || mgr.email || '?').charAt(0).toUpperCase()
                    }
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{mgr.full_name || mgr.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Contacts ({contacts.length}/5)</h3>
              {contacts.length < 5 && (
                <button onClick={() => setAddingContact(!addingContact)} className="btn btn-sm">+ Add</button>
              )}
            </div>

            {addingContact && (
              <form onSubmit={addContact} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: 12, background: 'var(--card-bg-hover)', borderRadius: 8 }}>
                <input name="name" placeholder="Name *" required />
                <input name="title" placeholder="Title" />
                <input name="email" placeholder="Email" type="email" />
                <input name="phone" placeholder="Phone" type="tel" />
                <input name="linkedin" placeholder="LinkedIn URL" style={{ gridColumn: '1 / -1' }} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <textarea name="notes" placeholder="Notes about this contact..." rows={2} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm">Save Contact</button>
                  <button type="button" onClick={() => setAddingContact(false)} className="btn btn-sm">Cancel</button>
                </div>
              </form>
            )}

            {contacts.length === 0 && !addingContact && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No contacts yet</p>
            )}

            {contacts.map((c: any) => (
              <div key={c.id} style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 8,
                border: '1px solid var(--border-light)', background: 'var(--card-bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className="avatar" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    {c.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</p>
                    {c.title && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.title}</p>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                      {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: 'var(--accent)' }}>{c.email}</a>}
                      {c.phone && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone}</span>}
                    </div>
                    {c.notes && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>{c.notes}</p>}
                  </div>
                  <button
                    onClick={() => setConfirmDeleteContact(c.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14 }}
                    title="Delete contact"
                  >
                    ×
                  </button>
                </div>
                {confirmDeleteContact === c.id && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--danger-bg)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1 }}>Remove {c.name}?</span>
                    <button onClick={() => deleteContact(c.id)} className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}>Yes</button>
                    <button onClick={() => setConfirmDeleteContact(null)} className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}>No</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Job Orders */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Active Job Orders</h3>
            {jobs.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No job orders</p>}
            {jobs.map((j: any) => (
              <Link key={j.id} href={`/pipeline/${j.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                  border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s',
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg-hover)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{j.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{j.location || 'No location'}</p>
                  </div>
                  <span className={`badge ${j.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{j.status}</span>
                  {j.salary_min && j.salary_max && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      ${(j.salary_min / 1000).toFixed(0)}k–${(j.salary_max / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column — Activity Feed */}
        <div className="card" style={{ padding: 12, position: 'sticky', top: 16, maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Activity Log</h3>

          <div style={{ marginBottom: 10 }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a company note..."
              rows={2}
              style={{ resize: 'vertical', fontSize: 12 }}
            />
            <button
              onClick={saveNote}
              disabled={!note.trim()}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 4, width: '100%' }}
            >
              Save Note
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activities.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: 16 }}>No activity yet</p>
            )}
            {activities.map((a: any) => (
              <div key={a.id} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--card-bg-hover)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{a.created_by_name || 'Unknown'}</span>
                    {a.content && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{a.content}</p>}
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteActivity(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14, opacity: 0.5 }}
                    title="Delete"
                  >×</button>
                </div>
                {confirmDeleteActivity === a.id && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--danger)' }}>Delete?</span>
                    <button onClick={() => deleteActivity(a.id)} className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>Yes</button>
                    <button onClick={() => setConfirmDeleteActivity(null)} className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>No</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
