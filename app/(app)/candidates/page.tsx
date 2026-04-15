'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AddCandidateModal from './AddCandidateModal'
import CandidateSidePanel from './CandidateSidePanel'
import { getMetroNames, getDisciplineNames, getMetroCenter } from '@/lib/geo-intelligence'

export default function CandidatesPage() {
  const sb = useRef(createClientComponentClient()).current
  const router = useRouter()
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allTags, setAllTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [metroFilter, setMetroFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(0)
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
  // Saved searches
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [showSaveSearch, setShowSaveSearch] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  // Hotlists for bulk add
  const [hotlists, setHotlists] = useState<any[]>([])
  const [showHotlistAdd, setShowHotlistAdd] = useState(false)
  const [selectedHotlist, setSelectedHotlist] = useState('')
  // Radius search results
  const [radiusResults, setRadiusResults] = useState<any[] | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { count } = await (sb as any).from('candidates').select('id', { count: 'exact', head: true })
    setTotalCount(count || 0)
    let all: any[] = []; let from = 0
    while (true) {
      const { data } = await (sb as any).from('candidates').select('*').order('name').range(from, from + 999)
      if (!data || !data.length) break; all = all.concat(data); if (data.length < 1000) break; from += 1000
    }
    setCandidates(all)
    setAllTags(Array.from(new Set(all.flatMap((c: any) => c.tags ?? []).filter(Boolean))).sort() as string[])

    // Last contacted
    const ids = all.slice(0, 500).map((c: any) => c.id); const map: Record<string, string> = {}
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { data: acts } = await (sb as any).from('activities').select('candidate_id, created_at').in('candidate_id', chunk).order('created_at', { ascending: false }).limit(500)
      if (acts) acts.forEach((a: any) => { if (!map[a.candidate_id]) map[a.candidate_id] = a.created_at })
    }
    setLastContacted(map)

    const { data: ss } = await (sb as any).from('saved_searches').select('*').order('created_at', { ascending: false })
    setSavedSearches(ss ?? [])
    const { data: hl } = await (sb as any).from('hotlists').select('*').order('name')
    setHotlists(hl ?? [])
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  // Radius search via PostGIS
  const doRadiusSearch = useCallback(async () => {
    if (!metroFilter || radiusMiles <= 0) { setRadiusResults(null); return }
    const center = getMetroCenter(metroFilter)
    if (!center) { setRadiusResults(null); return }
    try {
      const { data, error } = await (sb as any).rpc('search_candidates_by_radius', { lat: center.lat, lng: center.lng, radius_miles: radiusMiles })
      if (error) { console.error('Radius search error:', error); setRadiusResults(null); return }
      setRadiusResults(data ?? [])
    } catch { setRadiusResults(null) }
  }, [metroFilter, radiusMiles, sb])

  useEffect(() => { doRadiusSearch() }, [doRadiusSearch])

  const baseList = radiusResults !== null ? radiusResults : candidates
  const filtered = baseList.filter((c: any) => {
    const kws = search.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (kws.length > 0) {
      const s = [c.name, c.current_title, c.current_company, c.location, c.metro_area,
        c.email, c.work_email, c.previous_title, c.previous_company, c.linkedin,
        ...(c.tags ?? []), ...(c.disciplines ?? [])].filter(Boolean).join(' ').toLowerCase()
      if (!kws.every((kw: string) => s.includes(kw))) return false
    }
    if (metroFilter && radiusResults === null) {
      if (!(c.metro_area === metroFilter || (c.location || '').toLowerCase().includes(metroFilter.toLowerCase()))) return false
    }
    if (disciplineFilter && !(c.disciplines ?? []).includes(disciplineFilter)) return false
    if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false
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
    showToast(`Deleted ${ids.length}`); setSelected(new Set()); setConfirmBulkDelete(false); load()
  }

  const bulkAddToHotlist = async () => {
    if (!selectedHotlist || selected.size === 0) return
    const { data: { user } } = await sb.auth.getUser()
    const rows = Array.from(selected).map(cid => ({ hotlist_id: selectedHotlist, candidate_id: cid, added_by: user?.id }))
    for (let i = 0; i < rows.length; i += 50) {
      await (sb as any).from('hotlist_candidates').upsert(rows.slice(i, i + 50), { onConflict: 'hotlist_id,candidate_id' })
    }
    showToast(`Added ${selected.size} to hotlist`); setShowHotlistAdd(false); setSelected(new Set())
  }

  const saveSearch = async () => {
    if (!searchName.trim()) return
    const { data: { user } } = await sb.auth.getUser()
    await (sb as any).from('saved_searches').insert([{
      name: searchName.trim(), search_query: search, metro_filter: metroFilter,
      discipline_filter: disciplineFilter, tag_filter: tagFilter, radius_miles: radiusMiles || null, created_by: user?.id,
    }])
    showToast('Search saved!'); setSearchName(''); setShowSaveSearch(false); load()
  }
  const loadSearch = (s: any) => {
    setSearch(s.search_query || ''); setMetroFilter(s.metro_filter || '')
    setDisciplineFilter(s.discipline_filter || ''); setTagFilter(s.tag_filter || '')
    setRadiusMiles(s.radius_miles || 0); setPage(1); setShowSaved(false); showToast(`Loaded: ${s.name}`)
  }
  const deleteSearch = async (id: string) => {
    await (sb as any).from('saved_searches').delete().eq('id', id); load()
  }

  const initials = (n: string) => n?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const colors = ['#007aff', '#30d158', '#ff9f0a', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#00c7be']
  const colorFor = (n: string) => colors[Math.abs((n||'').charCodeAt(0)+(n||'').length)%colors.length]
  const fmtContact = (id: string) => {
    const d = lastContacted[id]; if (!d) return '—'
    const days = Math.floor((Date.now()-new Date(d).getTime())/86400000)
    if (days===0) return 'Today'; if (days===1) return 'Yday'; if (days<7) return `${days}d`; if (days<30) return `${Math.floor(days/7)}w`
    return `${Math.floor(days/30)}mo`
  }
  const hasFilters = search || metroFilter || tagFilter || disciplineFilter

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}
      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); load() }} />}
      {sidePanelId && <CandidateSidePanel candidateId={sidePanelId} onClose={() => setSidePanelId(null)} onUpdated={load} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Candidates <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-tertiary)' }}>({totalCount})</span>
        </h1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setShowSaved(!showSaved)} className="btn btn-sm">💾 Searches{savedSearches.length > 0 ? ` (${savedSearches.length})` : ''}</button>
          <Link href="/hotlists" className="btn btn-sm" style={{ textDecoration: 'none' }}>🔥 Hotlists</Link>
          <Link href="/import" className="btn btn-sm" style={{ textDecoration: 'none' }}>⬆ Import</Link>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">+ Add</button>
        </div>
      </div>

      {/* Saved searches panel */}
      {showSaved && savedSearches.length > 0 && (
        <div className="card" style={{ padding: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600 }}>💾 Saved Searches</h3>
            <button onClick={() => setShowSaved(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {savedSearches.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button onClick={() => loadSearch(s)} className="btn btn-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', borderColor: 'var(--accent)', fontSize: 11 }}>
                  {s.name} {s.radius_miles ? `(${s.radius_miles}mi)` : ''}
                </button>
                <button onClick={() => deleteSearch(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="search" placeholder="Keywords: mechanical, engineer, HVAC..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ flex: 1, minWidth: 160 }} />
        <select value={metroFilter} onChange={e => { setMetroFilter(e.target.value); setRadiusMiles(0); setRadiusResults(null); setPage(1) }} style={{ maxWidth: 140 }}>
          <option value="">All locations</option>
          {getMetroNames().map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {metroFilter && (
          <select value={radiusMiles} onChange={e => { setRadiusMiles(parseInt(e.target.value)); setPage(1) }} style={{ maxWidth: 120 }}>
            <option value="0">Metro text</option>
            <option value="10">10 mi radius</option>
            <option value="25">25 mi radius</option>
            <option value="50">50 mi radius</option>
            <option value="100">100 mi radius</option>
            <option value="150">150 mi radius</option>
          </select>
        )}
        <select value={disciplineFilter} onChange={e => { setDisciplineFilter(e.target.value); setPage(1) }} style={{ maxWidth: 130 }}>
          <option value="">All disciplines</option>
          {getDisciplineNames().map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={tagFilter} onChange={e => { setTagFilter(e.target.value); setPage(1) }} style={{ maxWidth: 120 }}>
          <option value="">All tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} style={{ maxWidth: 130 }}>
          <option value="name">Name</option>
          <option value="last_contacted">Last Contact</option>
          <option value="created_at">Newest</option>
          <option value="has_resume">Resume</option>
        </select>
        {hasFilters && !showSaveSearch && (
          <button onClick={() => setShowSaveSearch(true)} className="btn btn-sm" style={{ fontSize: 10 }}>💾</button>
        )}
        {showSaveSearch && (
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Name this search..."
              onKeyDown={e => e.key === 'Enter' && saveSearch()} style={{ width: 130, padding: '4px 8px', fontSize: 11 }} autoFocus />
            <button onClick={saveSearch} className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: 10 }}>Save</button>
            <button onClick={() => setShowSaveSearch(false)} className="btn btn-sm" style={{ padding: '3px 6px', fontSize: 10 }}>×</button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      {hasFilters && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {search && <span className="badge badge-blue" style={{ fontSize: 10 }}>🔍 {search}</span>}
          {metroFilter && <span className="badge badge-green" style={{ fontSize: 10 }}>📍 {metroFilter}{radiusMiles > 0 ? ` +${radiusMiles}mi` : ''}</span>}
          {disciplineFilter && <span className="badge badge-yellow" style={{ fontSize: 10 }}>🔧 {disciplineFilter}</span>}
          {tagFilter && <span className="badge badge-gray" style={{ fontSize: 10 }}>🏷 {tagFilter}</span>}
          {radiusResults !== null && <span style={{ fontSize: 10, color: 'var(--success)' }}>🛰 PostGIS radius active</span>}
          <button onClick={() => { setSearch(''); setMetroFilter(''); setTagFilter(''); setDisciplineFilter(''); setRadiusMiles(0); setRadiusResults(null); setPage(1) }}
            style={{ fontSize: 10, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{sorted.length} results</span>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card" style={{ padding: '8px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>{selected.size} selected</span>
          <button onClick={() => setConfirmBulkDelete(true)} className="btn btn-danger btn-sm" style={{ fontSize: 11 }}>Delete</button>
          <button onClick={() => setShowHotlistAdd(true)} className="btn btn-sm" style={{ fontSize: 11, background: 'var(--warning-bg)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>🔥 Add to Hotlist</button>
          <button onClick={() => setSelected(new Set())} className="btn btn-sm" style={{ fontSize: 11 }}>Clear</button>
        </div>
      )}

      {/* Hotlist add modal */}
      {showHotlistAdd && (
        <div className="modal-overlay"><div className="confirm-dialog" style={{ textAlign: 'left' }}>
          <h3>Add {selected.size} candidates to hotlist</h3>
          {hotlists.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0' }}>No hotlists yet. <Link href="/hotlists" style={{ color: 'var(--accent)' }}>Create one first →</Link></p>
          ) : (
            <div style={{ margin: '12px 0' }}>
              <select value={selectedHotlist} onChange={e => setSelectedHotlist(e.target.value)} style={{ marginBottom: 12 }}>
                <option value="">Select a hotlist...</option>
                {hotlists.map((h: any) => <option key={h.id} value={h.id}>🔥 {h.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={bulkAddToHotlist} disabled={!selectedHotlist} className="btn btn-primary btn-sm">Add to Hotlist</button>
            <button onClick={() => setShowHotlistAdd(false)} className="btn btn-sm">Cancel</button>
          </div>
        </div></div>
      )}

      {confirmBulkDelete && (
        <div className="modal-overlay"><div className="confirm-dialog">
          <h3>Delete {selected.size} Candidates?</h3><p>This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={bulkDelete} className="btn btn-danger">Delete</button>
            <button onClick={() => setConfirmBulkDelete(false)} className="btn">Cancel</button>
          </div>
        </div></div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>
                <th style={{ width: 30 }}><input type="checkbox" checked={paginated.length > 0 && selected.size === paginated.length} onChange={toggleAll} style={{ width: 14, height: 14, cursor: 'pointer' }} /></th>
                <th>Name</th><th>Role</th><th className="hide-mobile">Company</th>
                <th className="hide-mobile">Location</th><th className="hide-mobile">Disc.</th>
                <th>Contact</th><th style={{ width: 24 }}>📄</th>
              </tr></thead>
              <tbody>
                {paginated.map((c: any) => (
                  <tr key={c.id}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                    </td>
                    <td onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ background: colorFor(c.name), color: 'white', width: 24, height: 24, fontSize: 9 }}>{initials(c.name)}</div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer', fontSize: 12 }}>{c.current_title || '—'}</td>
                    <td className="hide-mobile" onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer', fontSize: 12 }}>{c.current_company || '—'}</td>
                    <td className="hide-mobile" onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer', fontSize: 12 }}>
                      {c.metro_area ? <span className="badge badge-green" style={{ fontSize: 9 }}>{c.metro_area}</span> : (c.location ? c.location.split(',')[0] : '—')}
                    </td>
                    <td className="hide-mobile" onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer' }}>
                      {(c.disciplines ?? []).slice(0,2).map((d: string) => <span key={d} className="badge badge-blue" style={{ fontSize: 9, marginRight: 2 }}>{d}</span>)}
                    </td>
                    <td onClick={() => setSidePanelId(c.id)} style={{ cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: lastContacted[c.id] ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{fmtContact(c.id)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{c.resume_url ? <span style={{ fontSize: 11 }}>✅</span> : <span style={{ opacity: 0.15 }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && paginated.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>{hasFilters ? 'No candidates match' : 'No candidates yet'}</div>}
      </div>

      {sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{((page-1)*pageSize)+1}–{Math.min(page*pageSize, sorted.length)} of {sorted.length}</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[25,50,100,250,500].map(s => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1) }} className={`btn btn-sm ${pageSize === s ? 'btn-primary' : ''}`} style={{ padding: '2px 6px', fontSize: 10 }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setPage(Math.max(1,page-1))} disabled={page===1} className="btn btn-sm" style={{ padding: '2px 8px' }}>←</button>
            <span style={{ fontSize: 11 }}>{page}/{totalPages||1}</span>
            <button onClick={() => setPage(Math.min(totalPages,page+1))} disabled={page>=totalPages} className="btn btn-sm" style={{ padding: '2px 8px' }}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}
