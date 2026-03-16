'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AddCandidateModal from './AddCandidateModal'

export default function CandidatesPage() {
  const sb = useRef(createClientComponentClient()).current
  const router = useRouter()
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allTags, setAllTags] = useState<string[]>([])
  const [allLocations, setAllLocations] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [toast, setToast] = useState<string | null>(null)
  const [lastContacted, setLastContacted] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    setLoading(true)

    // Get accurate total count first
    const { count } = await (sb as any).from('candidates').select('id', { count: 'exact', head: true })
    setTotalCount(count || 0)

    // Fetch ALL candidates — Supabase default limit is 1000, so we paginate
    let all: any[] = []
    let from = 0
    const batchSize = 1000
    while (true) {
      const { data } = await (sb as any).from('candidates')
        .select('*')
        .order('name')
        .range(from, from + batchSize - 1)
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < batchSize) break
      from += batchSize
    }

    setCandidates(all)

    const tags = Array.from(new Set(all.flatMap((c: any) => c.tags ?? []).filter(Boolean))).sort() as string[]
    const locs = Array.from(new Set(all.map((c: any) => c.location).filter(Boolean))).sort() as string[]
    setAllTags(tags)
    setAllLocations(locs)

    // Last contacted — batch to avoid timeout
    const ids = all.map((c: any) => c.id)
    const map: Record<string, string> = {}
    const batchIds = ids.slice(0, 500)
    for (let i = 0; i < batchIds.length; i += 100) {
      const chunk = batchIds.slice(i, i + 100)
      const { data: acts } = await (sb as any)
        .from('activities').select('candidate_id, created_at')
        .in('candidate_id', chunk)
        .order('created_at', { ascending: false })
        .limit(500)
      if (acts) acts.forEach((a: any) => { if (!map[a.candidate_id]) map[a.candidate_id] = a.created_at })
    }
    setLastContacted(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = candidates.filter((c: any) => {
    const keywords = search.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (keywords.length > 0) {
      const searchable = [
        c.name, c.current_title, c.current_company, c.location,
        c.email, c.work_email, c.personal_email, c.previous_title,
        c.previous_company, c.linkedin, ...(c.tags ?? [])
      ].filter(Boolean).join(' ').toLowerCase()
      if (!keywords.every((kw: string) => searchable.includes(kw))) return false
    }
    if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false
    if (locationFilter && c.location !== locationFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortBy === 'last_contacted') {
      const aD = lastContacted[a.id] || '1970'
      const bD = lastContacted[b.id] || '1970'
      return bD.localeCompare(aD)
    }
    if (sortBy === 'created_at') return (b.created_at || '').localeCompare(a.created_at || '')
    if (sortBy === 'has_resume') {
      const aR = a.resume_url ? 1 : 0
      const bR = b.resume_url ? 1 : 0
      return bR - aR
    }
    return (a.name || '').localeCompare(b.name || '')
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAll = () => {
    setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map((c: any) => c.id)))
  }
  const bulkDelete = async () => {
    const ids = Array.from(selected)
    for (let i = 0; i < ids.length; i += 50) {
      await (sb as any).from('candidates').delete().in('id', ids.slice(i, i + 50))
    }
    showToast(`Deleted ${ids.length} candidates`)
    setSelected(new Set()); setConfirmBulkDelete(false); load()
  }

  const initials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['#007aff', '#30d158', '#ff9f0a', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#00c7be']
  const colorFor = (name: string) => colors[Math.abs((name||'').charCodeAt(0) + (name||'').length) % colors.length]

  const formatLastContact = (id: string) => {
    const d = lastContacted[id]
    if (!d) return '—'
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days/7)}w ago`
    return `${Math.floor(days/30)}mo ago`
  }

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}
      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); load() }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Candidates <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-tertiary)' }}>({totalCount})</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" className="btn btn-sm" style={{ textDecoration: 'none' }}>⬆ Import CSV</Link>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">+ Add Candidate</button>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="search" placeholder="Search keywords (e.g. mechanical new york)..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} style={{ flex: 1, minWidth: 200 }} />
        <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1) }} style={{ maxWidth: 170 }}>
          <option value="">All locations</option>
          {allLocations.map((l: string) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1) }} style={{ maxWidth: 150 }}>
          <option value="">All tags</option>
          {allTags.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} style={{ maxWidth: 175 }}>
          <option value="name">Sort: Name A–Z</option>
          <option value="last_contacted">Sort: Last Contacted</option>
          <option value="created_at">Sort: Date Added</option>
          <option value="has_resume">Sort: Has Resume</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>{selected.size} selected</span>
          <button onClick={() => setConfirmBulkDelete(true)} className="btn btn-danger btn-sm">Delete Selected</button>
          <button onClick={() => setSelected(new Set())} className="btn btn-sm">Clear</button>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="modal-overlay"><div className="confirm-dialog">
          <h3>Delete {selected.size} Candidates?</h3><p>This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={bulkDelete} className="btn btn-danger">Yes, Delete</button>
            <button onClick={() => setConfirmBulkDelete(false)} className="btn">Cancel</button>
          </div>
        </div></div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading candidates...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={paginated.length > 0 && selected.size === paginated.length} onChange={toggleAll} style={{ width: 15, height: 15, cursor: 'pointer' }} /></th>
                <th>Name</th><th>Current Role</th><th className="hide-mobile">Company</th>
                <th className="hide-mobile">Location</th><th>Last Contact</th>
                <th style={{ width: 30, textAlign: 'center' }} title="Resume">📄</th>
                <th style={{ width: 50 }}></th>
              </tr></thead>
              <tbody>
                {paginated.map((c: any) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                    </td>
                    <td onClick={() => router.push(`/candidates/${c.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: colorFor(c.name), color: 'white' }}>{initials(c.name)}</div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                      </div>
                    </td>
                    <td onClick={() => router.push(`/candidates/${c.id}`)}>{c.current_title || '—'}</td>
                    <td className="hide-mobile" onClick={() => router.push(`/candidates/${c.id}`)}>{c.current_company || '—'}</td>
                    <td className="hide-mobile" onClick={() => router.push(`/candidates/${c.id}`)}>{c.location ? `📍 ${c.location}` : '—'}</td>
                    <td onClick={() => router.push(`/candidates/${c.id}`)}>
                      <span style={{ fontSize: 12, color: lastContacted[c.id] ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{formatLastContact(c.id)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={() => router.push(`/candidates/${c.id}`)}>
                      {c.resume_url ? <span title="Resume on file" style={{ fontSize: 14 }}>✅</span> : <span style={{ fontSize: 14, opacity: 0.2 }}>—</span>}
                    </td>
                    <td><Link href={`/candidates/${c.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && paginated.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center' }}><p style={{ color: 'var(--text-tertiary)' }}>{search ? 'No candidates match' : 'No candidates yet'}</p></div>
        )}
      </div>

      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{((page-1)*pageSize)+1}–{Math.min(page*pageSize, sorted.length)} of {sorted.length}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[25,50,100,250,500].map((s) => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1) }} className={`btn btn-sm ${pageSize === s ? 'btn-primary' : ''}`} style={{ padding: '3px 8px', fontSize: 11 }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setPage(Math.max(1,page-1))} disabled={page===1} className="btn btn-sm">←</button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{page}/{totalPages||1}</span>
            <button onClick={() => setPage(Math.min(totalPages,page+1))} disabled={page>=totalPages} className="btn btn-sm">→</button>
          </div>
        </div>
      )}
    </div>
  )
}
