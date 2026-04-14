'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AddCandidateModal from './AddCandidateModal'
import CandidateSidePanel from './CandidateSidePanel'
import { getMetroNames, getMetroCities, detectMetroArea } from '@/lib/metro-areas'

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
  const [metroFilter, setMetroFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sidePanelId, setSidePanelId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [toast, setToast] = useState<string | null>(null)
  const [lastContacted, setLastContacted] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hotlists, setHotlists] = useState<any[]>([])
  const [showSaveSearch, setShowSaveSearch] = useState(false)
  const [hotlistName, setHotlistName] = useState('')
  const [showHotlists, setShowHotlists] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { count } = await (sb as any).from('candidates').select('id', { count: 'exact', head: true })
    setTotalCount(count || 0)

    let all: any[] = []
    let from = 0
    while (true) {
      const { data } = await (sb as any).from('candidates').select('*').order('name').range(from, from + 999)
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < 1000) break
      from += 1000
    }
    setCandidates(all)

    const tags = Array.from(new Set(all.flatMap((c: any) => c.tags ?? []).filter(Boolean))).sort() as string[]
    const locs = Array.from(new Set(all.map((c: any) => c.location).filter(Boolean))).sort() as string[]
    setAllTags(tags)
    setAllLocations(locs)

    // Last contacted
    const ids = all.slice(0, 500).map((c: any) => c.id)
    const map: Record<string, string> = {}
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { data: acts } = await (sb as any).from('activities').select('candidate_id, created_at')
        .in('candidate_id', chunk).order('created_at', { ascending: false }).limit(500)
      if (acts) acts.forEach((a: any) => { if (!map[a.candidate_id]) map[a.candidate_id] = a.created_at })
    }
    setLastContacted(map)

    // Hotlists
    const { data: hl } = await (sb as any).from('hotlists').select('*').order('created_at', { ascending: false })
    setHotlists(hl ?? [])

    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  // Metro-aware filtering
  const filtered = candidates.filter((c: any) => {
    // Multi-keyword search
    const keywords = search.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (keywords.length > 0) {
      const searchable = [
        c.name, c.current_title, c.current_company, c.location, c.metro_area,
        c.email, c.work_email, c.personal_email, c.previous_title,
        c.previous_company, c.linkedin, ...(c.tags ?? [])
      ].filter(Boolean).join(' ').toLowerCase()
      if (!keywords.every((kw: string) => searchable.includes(kw))) return false
    }

    // Metro area filter — matches metro_area column OR checks if location contains any suburb in that metro
    if (metroFilter) {
      const metroCities = getMetroCities(metroFilter)
      const locLower = (c.location || '').toLowerCase()
      const metroMatch = c.metro_area === metroFilter || metroCities.some((city) => locLower.includes(city.toLowerCase()))
      if (!metroMatch) return false
    }

    if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false
    if (locationFilter && c.location !== locationFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortBy === 'last_contacted') return (lastContacted[b.id] || '1970').localeCompare(lastContacted[a.id] || '1970')
    if (sortBy === 'created_at') return (b.created_at || '').localeCompare(a.created_at || '')
    if (sortBy === 'has_resume') return (b.resume_url ? 1 : 0) - (a.resume_url ? 1 : 0)
    return (a.name || '').localeCompare(b.name || '')
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelect = (id: string) => { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  const toggleAll = () => { setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map((c: any) => c.id))) }
  const bulkDelete = async () => {
    const ids = Array.from(selected)
    for (let i = 0; i < ids.length; i += 50) await (sb as any).from('candidates').delete().in('id', ids.slice(i, i + 50))
    showToast(`Deleted ${ids.length} candidates`); setSelected(new Set()); setConfirmBulkDelete(false); load()
  }

  const saveHotlist = async () => {
    if (!hotlistName.trim()) return
    const { data: { user } } = await sb.auth.getUser()
    await (sb as any).from('hotlists').insert([{
      name: hotlistName.trim(), search_query: search, metro_filter: metroFilter,
      tag_filter: tagFilter, location_filter: locationFilter, created_by: user?.id,
    }])
    showToast('Hotlist saved!'); setHotlistName(''); setShowSaveSearch(false); load()
  }

  const loadHotlist = (h: any) => {
    setSearch(h.search_query || ''); setMetroFilter(h.metro_filter || '')
    setTagFilter(h.tag_filter || ''); setLocationFilter(h.location_filter || '')
    setPage(1); setShowHotlists(false); showToast(`Loaded: ${h.name}`)
  }

  const deleteHotlist = async (id: string) => {
    await (sb as any).from('hotlists').delete().eq('id', id)
    showToast('Hotlist deleted'); load()
  }

  const initials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['#007aff', '#30d158', '#ff9f0a', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#00c7be']
  const colorFor = (name: string) => colors[Math.abs((name || '').charCodeAt(0) + (name || '').length) % colors.length]
  const formatLastContact = (id: string) => {
    const d = lastContacted[id]; if (!d) return '—'
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`; if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}
      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); load() }} />}
      {sidePanelId && <CandidateSidePanel candidateId={sidePanelId} onClose={() => setSidePanelId(null)} onUpdated={load} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Candidates <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-tertiary)' }}>({totalCount})</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHotlists(!showHotlists)} className="btn btn-sm" title="Hotlists">
            🔖 Hotlists {hotlists.length > 0 && `(${hotlists.length})`}
          </button>
          <Link href="/import" className="btn btn-sm" style={{ textDecoration: 'none' }}>⬆ Import</Link>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">+ Add</button>
        </div>
      </div>

      {/* Hotlists panel */}
      {showHotlists && hotlists.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600 }}>🔖 Saved Hotlists</h3>
            <button onClick={() => setShowHotlists(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {hotlists.map((h: any) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => loadHotlist(h)} className="btn btn-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }}>
                  {h.name}
                </button>
                <button onClick={() => deleteHotlist(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14, padding: '0 2px' }} title="Delete">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="search" placeholder="Search keywords (e.g. mechanical atlanta)..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} style={{ flex: 1, minWidth: 180 }} />
        <select value={metroFilter} onChange={(e) => { setMetroFilter(e.target.value); setPage(1) }} style={{ maxWidth: 160 }}>
          <option value="">All metros</option>
          {getMetroNames().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1) }} style={{ maxWidth: 130 }}>
          <option value="">All tags</option>
          {allTags.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} style={{ maxWidth: 155 }}>
          <option value="name">Sort: Name</option>
          <option value="last_contacted">Sort: Last Contact</option>
          <option value="created_at">Sort: Date Added</option>
          <option value="has_resume">Sort: Has Resume</option>
        </select>

        {/* Save search as hotlist */}
        {(search || metroFilter || tagFilter) && (
          showSaveSearch ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="text" placeholder="Hotlist name..." value={hotlistName} onChange={(e) => setHotlistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveHotlist()} style={{ width: 160, padding: '5px 8px', fontSize: 12 }} autoFocus />
              <button onClick={saveHotlist} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>Save</button>
              <button onClick={() => setShowSaveSearch(false)} className="btn btn-sm" style={{ padding: '4px 6px', fontSize: 11 }}>×</button>
            </div>
          ) : (
            <button onClick={() => setShowSaveSearch(true)} className="btn btn-sm" style={{ fontSize: 11 }} title="Save this search">
              💾 Save
            </button>
          )
        )}
      </div>

      {/* Active filter chips */}
      {(search || metroFilter || tagFilter) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Active filters:</span>
          {search && <span className="badge badge-blue" style={{ fontSize: 10 }}>🔍 {search}</span>}
          {metroFilter && <span className="badge badge-green" style={{ fontSize: 10 }}>📍 {metroFilter} metro</span>}
          {tagFilter && <span className="badge badge-yellow" style={{ fontSize: 10 }}>🏷 {tagFilter}</span>}
          <button onClick={() => { setSearch(''); setMetroFilter(''); setTagFilter(''); setLocationFilter(''); setPage(1) }}
            style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear all
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            {sorted.length} results
          </span>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card" style={{ padding: '8px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-bg)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>{selected.size} selected</span>
          <button onClick={() => setConfirmBulkDelete(true)} className="btn btn-danger btn-sm" style={{ fontSize: 11 }}>Delete</button>
          <button onClick={() => setSelected(new Set())} className="btn btn-sm" style={{ fontSize: 11 }}>Clear</button>
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

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading candidates...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th style={{ width: 32 }}><input type="checkbox" checked={paginated.length > 0 && selected.size === paginated.length} onChange={toggleAll} style={{ width: 14, height: 14, cursor: 'pointer' }} /></th>
                <th>Name</th><th>Role</th><th className="hide-mobile">Company</th>
                <th className="hide-mobile">Location</th><th>Contact</th>
                <th style={{ width: 26, textAlign: 'center' }}>📄</th>
              </tr></thead>
              <tbody>
                {paginated.map((c: any) => (
                  <tr key={c.id}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                    </td>
                    <td onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ background: colorFor(c.name), color: 'white', width: 26, height: 26, fontSize: 10 }}>{initials(c.name)}</div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer', fontSize: 12 }}>{c.current_title || '—'}</td>
                    <td className="hide-mobile" onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer', fontSize: 12 }}>{c.current_company || '—'}</td>
                    <td className="hide-mobile" onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer', fontSize: 12 }}>
                      {c.location ? `📍 ${c.location}` : '—'}
                      {c.metro_area && <span className="badge badge-gray" style={{ fontSize: 9, marginLeft: 4 }}>{c.metro_area}</span>}
                    </td>
                    <td onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: lastContacted[c.id] ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{formatLastContact(c.id)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{c.resume_url ? <span title="Resume" style={{ fontSize: 12 }}>✅</span> : <span style={{ opacity: 0.15 }}>—</span>}</td>
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

      {/* Pagination */}
      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{((page-1)*pageSize)+1}–{Math.min(page*pageSize, sorted.length)} of {sorted.length}</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[25,50,100,250,500].map((s) => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1) }} className={`btn btn-sm ${pageSize === s ? 'btn-primary' : ''}`} style={{ padding: '2px 7px', fontSize: 10 }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setPage(Math.max(1,page-1))} disabled={page===1} className="btn btn-sm" style={{ padding: '2px 8px' }}>←</button>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{page}/{totalPages||1}</span>
            <button onClick={() => setPage(Math.min(totalPages,page+1))} disabled={page>=totalPages} className="btn btn-sm" style={{ padding: '2px 8px' }}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}
