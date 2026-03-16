'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { Upload, MapPin, Search, Trash2, X, AlertTriangle, CheckSquare } from 'lucide-react'
import AddCandidateModal from './AddCandidateModal'
import { useRouter } from 'next/navigation'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [allLocations, setAllLocations] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const supabase = createSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    loadMeta()
  }, [])

  useEffect(() => {
    loadCandidates()
  }, [q, tagFilter, locationFilter])

  async function loadMeta() {
    const { data } = await (supabase as any).from('candidates').select('tags, location')
    const tags = Array.from(new Set((data ?? []).flatMap((c: any) => c.tags ?? []))).sort() as string[]
    const locs = Array.from(new Set((data ?? []).map((c: any) => c.location).filter(Boolean))).sort() as string[]
    setAllTags(tags)
    setAllLocations(locs)
  }

  async function loadCandidates() {
    setLoading(true)
    let query = (supabase as any).from('candidates').select('*').order('created_at', { ascending: false })
    if (q) {
      const qp = '%' + q + '%'
      query = query.or('name.ilike.' + qp + ',current_title.ilike.' + qp + ',current_company.ilike.' + qp + ',email.ilike.' + qp + ',work_email.ilike.' + qp + ',location.ilike.' + qp)
    }
    if (tagFilter) query = query.contains('tags', [tagFilter])
    if (locationFilter) query = query.ilike('location', '%' + locationFilter + '%')
    const { data } = await query
    setCandidates(data ?? [])
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
    await (supabase as any).from('candidates').delete().in('id', ids)
    setBulkDeleting(false)
    setConfirmBulk(false)
    setSelected(new Set())
    loadCandidates()
    loadMeta()
  }

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avColors = [['#e8f0fb','#0058b0'],['#eafaf0','#1a7a35'],['#fff5e0','#7d4800'],['#f3effe','#5c2d91'],['#fce8e8','#9b1a14']]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
          Candidates {candidates.length > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-4)', marginLeft: 6 }}>({candidates.length})</span>}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" className="btn btn-sm"><Upload size={13} />Import CSV</Link>
          <AddCandidateModal onAdded={loadCandidates} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={13} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, title, company, email, location..."
          />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, lineHeight: 1 }}><X size={13} /></button>}
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
          <button className="btn btn-danger btn-sm gap-1" onClick={() => setConfirmBulk(true)}>
            <Trash2 size={12} />Delete selected
          </button>
          <button className="btn btn-sm" onClick={() => setSelected(new Set())}>Deselect all</button>
        </div>
      )}

      {/* Bulk delete confirm modal */}
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
                  This will permanently delete {selected.size} candidate{selected.size !== 1 ? 's' : ''} and all their notes, activity history, and pipeline assignments.{' '}
                  <strong style={{ color: 'var(--red-text)' }}>This cannot be undone.</strong>
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>
                  Tip: use this to clean up bad CSV imports quickly.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setConfirmBulk(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={bulkDelete} disabled={bulkDeleting}>
                  <Trash2 size={13} />
                  {bulkDeleting ? 'Deleting...' : 'Yes, delete ' + selected.size}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mac-card" style={{ overflow: 'hidden' }}>
        <table className="mac-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={candidates.length > 0 && selected.size === candidates.length}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
              </th>
              {['Name','Current role','Company','Location','Tags',''].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)', fontSize: 13 }}>Loading...</td></tr>
            )}
            {!loading && candidates.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)', fontSize: 13 }}>No candidates found.</td></tr>
            )}
            {candidates.map((c: any, i: number) => {
              const [bg, fg] = avColors[i % avColors.length]
              const isSelected = selected.has(c.id)
              return (
                <tr key={c.id} style={{ background: isSelected ? 'var(--accent-light)' : undefined }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: fg, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <Link href={'/candidates/' + c.id} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget as any).style.color = 'var(--accent)'}
                        onMouseLeave={e => (e.currentTarget as any).style.color = 'var(--text)'}>
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{c.current_title || '—'}</td>
                  <td style={{ color: 'var(--text-2)' }}>{c.current_company || '—'}</td>
                  <td>
                    {c.location
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                          <MapPin size={11} style={{ color: 'var(--text-4)' }} />{c.location}
                        </span>
                      : <span style={{ color: 'var(--text-4)' }}>—</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(c.tags ?? []).map((t: string) => <span key={t} className="badge badge-gray">{t}</span>)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={'/candidates/' + c.id} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
