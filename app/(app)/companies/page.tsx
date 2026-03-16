'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function CompaniesPage() {
  const sb = useRef(createClientComponentClient()).current
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    const { data } = await (sb as any).from('companies').select('*').order('name')
    setCompanies(data ?? [])
    const { data: u } = await (sb as any).from('profiles').select('id, full_name, email, avatar_url')
    setUsers(u ?? [])
  }

  useEffect(() => { load() }, [])

  const addCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await sb.auth.getUser()
    const obj: any = { created_by: user?.id }
    for (const [k, v] of Array.from(fd.entries())) obj[k] = v || null
    await (sb as any).from('companies').insert([obj])
    showToast('Company added')
    setAdding(false)
    load()
  }

  const filtered = companies.filter((c: any) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q)
    const matchesFilter = filter === 'all' || c.status === filter
    return matchesSearch && matchesFilter
  })

  const clients = filtered.filter((c: any) => c.status === 'Client')
  const prospects = filtered.filter((c: any) => c.status === 'Prospect')

  const getManager = (id: string) => users.find((u: any) => u.id === id)

  const CompanyRow = ({ c }: { c: any }) => {
    const mgr = getManager(c.account_manager_id)
    return (
      <tr
        key={c.id}
        onClick={() => router.push(`/companies/${c.id}`)}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <p style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</p>
          {c.industry && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.industry}</p>}
        </td>
        <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.location || '—'}</td>
        <td className="hide-mobile">
          {mgr ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="avatar" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', width: 22, height: 22, fontSize: 9 }}>
                {mgr.avatar_url
                  ? <img src={mgr.avatar_url} alt="" />
                  : (mgr.full_name || mgr.email || '?').charAt(0).toUpperCase()
                }
              </div>
              <span style={{ fontSize: 12 }}>{mgr.full_name || mgr.email?.split('@')[0]}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
          )}
        </td>
        <td>
          <span className={`badge ${c.status === 'Client' ? 'badge-green' : 'badge-yellow'}`}>{c.status}</span>
        </td>
      </tr>
    )
  }

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Companies</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search name, location, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 130 }}>
            <option value="all">All</option>
            <option value="Client">Clients</option>
            <option value="Prospect">Prospects</option>
          </select>
          <button onClick={() => setAdding(!adding)} className="btn btn-primary btn-sm">+ Add Company</button>
        </div>
      </div>

      {adding && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>New Company</h3>
          <form onSubmit={addCompany} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Company Name *</label>
              <input name="name" required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
              <select name="status"><option>Prospect</option><option>Client</option></select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Location</label>
              <input name="location" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Industry</label>
              <input name="industry" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Website</label>
              <input name="website" type="url" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Company URL</label>
              <input name="company_url" type="url" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Corporate Phone</label>
              <input name="corporate_phone" type="tel" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Local Phone</label>
              <input name="local_phone" type="tel" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Account Manager</label>
              <select name="account_manager_id">
                <option value="">None</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Notes</label>
              <input name="notes" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">Create Company</button>
              <button type="button" onClick={() => setAdding(false)} className="btn btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Clients Section */}
      {clients.length > 0 && (
        <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Clients</h2>
            <span className="badge badge-green">{clients.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="hide-mobile">Location</th>
                  <th className="hide-mobile">Account Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c: any) => <CompanyRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prospects Section */}
      {prospects.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Prospects</h2>
            <span className="badge badge-yellow">{prospects.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="hide-mobile">Location</th>
                  <th className="hide-mobile">Account Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((c: any) => <CompanyRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{search ? 'No companies match your search' : 'No companies yet'}</p>
        </div>
      )}
    </div>
  )
}
