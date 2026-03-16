'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { Upload, MapPin, Search, Trash2, X, AlertTriangle, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import AddCandidateModal from './AddCandidateModal'

const PAGE_SIZES = [25, 50, 100, 250, 500]

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allTags, setAllTags] = useState<string[]>([])
  const [allLocations, setAllLocations] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(0)
  const supabase = createSupabaseClient()

  useEffect(() => { loadMeta() }, [])
  useEffect(() => { setPage(0) }, [q, tagFilter, locationFilter, pageSize])
  useEffect(() => { loadCandidates() }, [q, tagFilter, locationFilter, pageSize, page])

  async function loadMeta() {
    const { data } = await (supabase as any).from('candidates').select('tags, location')
    const tags = Array.from(new Set((data ?? []).flatMap((c: any) => c.tags ?? []))).sort() as string[]
    const locs = Array.from(new Set((data ?? []).map((c: any) => c.location).filter(Boolean))).sort() as string[]
    setAllTags(tags)
    setAllLocations(locs)
  }

  async function loadCandidates() {
    setLoading(true)
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = (supabase as any).from('candidates').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)

    if (q) {
      const qp = '%' + q + '%'
      query = query.or('name.ilike.' + qp + ',current_title.ilike.' + qp + ',current_company.ilike.' + qp + ',email.ilike.' + qp + ',work_email.ilike.' + qp + ',location.ilike.' + qp)
    }
    if (tagFilter) query = query.contains('tags', [tagFilter])
    if (locationFilter) query = query.ilike('location', '%' + locationFilter + '%')

    const { data, count } = await query
    setCandidates(data ?? [])
    setTotalCount(count ?? 0)
    setSelected(new Set())
    setLoading(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === candidates.length) setSelected(new Set())
    else setSelected(new Set(candidates.map((c: any) => c.id)))
  }

  async function bulkDelete() {
    setBulkDeleting(true)
    const ids = Array.from(selected)
    for (let i = 0; i < ids.length; i += 50) {
      await (supabase as any).from('candidates').delete().in('id', ids.slice(i, i + 50))
    }
    setBulkDeleting(false)
    setConfirmBulk(false)
    setSelected(new Set())
    loadCandidates()
    loadMeta()
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const startNum = page * pageSize + 1
  const endNum = Math.min(page * pageSize + candidates.length, totalCount)

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avColors = [['#e8f0fb','#0058b0'],['#eafaf0','#1a7a35'],['#fff5e0','#7d4800'],['#f3effe','#5c2d91'],['#fce8e8','#9b1a14']]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
          Candidates
          {!loading && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-4)', marginLeft: 6 }}>({totalCount.toLocaleString()})</span>}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Upload size={13} />Import CSV
          </Link>
          <AddCandidateModal />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={13} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, title, company, email, location..." />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, display: 'flex' }}><X size={13} /></button>}
        </div>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="input" style={{ width: 160 }}>
          <option value="">All locations</option>
          {allLocations.map((l: string) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="input" style={{ width: 140 }}>
          <option value="">All tags</option>
          {allTags.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(q || tagFilter || locationFilter) && (
          <button className="btn btn-sm" onClick={() => { setQ(''); setTagFilter(''); setLocationFilter('') }}>Clear</button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, marginBottom: 12 }}>
          <CheckSquare size={15} style={{ color: 'var(--accent-text)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>{selected.size} selected</span>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmBulk(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={12} />Delete selected
          </button>
          <button className="btn btn-sm" onClick={() => setSelected(new Set())}>Deselect all</button>
          <span style={{ fontSize: 12, color: 'var(--accent-text)', marginLeft: 'auto' }}>
            Tip: select all {candidates.length} on this page, delete, then move to next page
          </span>
        </div>
      )}

      {/* Bulk delete confirm */}
      {confirmBulk && (
        <>
          <div className="modal-backdrop" onClick={() => setConfirmBulk(false)} />
          <div className="modal-box">
            <div className="modal-content" style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-text)' }}>
                  <AlertTriangle size={16} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Delete {selected.size} candidates?</span>
                </div>
                <button onClick={() => setConfirmBulk(false)} className="btn btn-sm"><X size={14} /></button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Permanently deletes {selected.size} candidate{selected.size !== 1 ? 's' : ''} and all their notes and pipeline history.{' '}
                  <strong style={{ color: 'var(--red-text)' }}>Cannot be undone.</strong>
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setConfirmBulk(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={bulkDelete} disabled={bulkDeleting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Trash2 size={13} />{bulkDeleting ? 'Deleting...' : 'Yes, delete ' + selected.size}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Table */}
      <div className="mac-card" style={{ overflow: 'hidden' }}>
        <table className="mac-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox"
                  checked={candidates.length > 0 && selected.size === candidates.length}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }} />
              </th>
              {['Name','Current role','Company','Location','Tags',''].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)', fontSize: 13 }}>Loading...</td></tr>}
            {!loading && candidates.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)', fontSize: 13 }}>No candidates found.</td></tr>}
            {candidates.map((c: any, i: number) => {
              const [bg, fg] = avColors[i % avColors.length]
              const isSelected = selected.has(c.id)
              return (
                <tr key={c.id} style={{ background: isSelected ? 'var(--accent-light)' : undefined }}>
                  <td onClick={e => e.stopPropagation()} style={{ paddingRight: 0 }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: fg, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <Link href={'/candidates/' + c.id} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>{c.name}</Link>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{c.current_title || '—'}</td>
                  <td style={{ color: 'var(--text-2)' }}>{c.current_company || '—'}</td>
                  <td>
                    {c.location
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}><MapPin size={11} />{c.location}</span>
                      : <span style={{ color: 'var(--text-4)' }}>—</span>}
                  </td>
                  <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(c.tags ?? []).map((t: string) => <span key={t} className="badge badge-gray">{t}</span>)}</div></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={'/candidates/' + c.id} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>

        {/* Left: showing X–Y of Z */}
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {loading ? 'Loading...' : totalCount === 0 ? 'No results' : `Showing ${startNum.toLocaleString()}–${endNum.toLocaleString()} of ${totalCount.toLocaleString()} candidates`}
        </div>

        {/* Center: page size selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>Show</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {PAGE_SIZES.map(size => (
              <button key={size} onClick={() => setPageSize(size)}
                style={{
                  padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: pageSize === size ? 'var(--accent)' : 'var(--surface)',
                  color: pageSize === size ? 'white' : 'var(--text-3)',
                  border: pageSize === size ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}>
                {size}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>per page</span>
        </div>

        {/* Right: prev/next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}
            className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px' }}>
            <ChevronLeft size={14} />Prev
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-3)', minWidth: 80, textAlign: 'center' }}>
            {totalPages > 0 ? `Page ${page + 1} of ${totalPages}` : '—'}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}
            className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px' }}>
            Next<ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
