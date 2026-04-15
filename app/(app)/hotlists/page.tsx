'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function HotlistsPage() {
  const sb = useRef(createClientComponentClient()).current
  const [hotlists, setHotlists] = useState<any[]>([])
  const [selectedList, setSelectedList] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    const { data } = await (sb as any).from('hotlists').select('*').order('created_at', { ascending: false })
    setHotlists(data ?? [])
  }

  useEffect(() => { load() }, [])

  const loadCandidates = async (listId: string) => {
    const { data } = await (sb as any)
      .from('hotlist_candidates')
      .select('*, candidates(*)')
      .eq('hotlist_id', listId)
      .order('added_at', { ascending: false })
    setCandidates(data ?? [])
  }

  const selectList = (h: any) => {
    setSelectedList(h)
    loadCandidates(h.id)
  }

  const createList = async () => {
    if (!newName.trim()) return
    const { data: { user } } = await sb.auth.getUser()
    await (sb as any).from('hotlists').insert([{ name: newName.trim(), created_by: user?.id }])
    showToast('Hotlist created'); setNewName(''); setCreating(false); load()
  }

  const deleteList = async (id: string) => {
    await (sb as any).from('hotlists').delete().eq('id', id)
    showToast('Hotlist deleted'); setConfirmDelete(null)
    if (selectedList?.id === id) { setSelectedList(null); setCandidates([]) }
    load()
  }

  const removeCandidate = async (hcId: string) => {
    await (sb as any).from('hotlist_candidates').delete().eq('id', hcId)
    showToast('Removed from hotlist')
    if (selectedList) loadCandidates(selectedList.id)
  }

  const initials = (n: string) => n?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>🔥 Hotlists</h1>
        <button onClick={() => setCreating(!creating)} className="btn btn-primary btn-sm">+ New Hotlist</button>
      </div>

      {creating && (
        <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Atlanta Mechanical Engineers" onKeyDown={e => e.key === 'Enter' && createList()}
            style={{ flex: 1 }} autoFocus />
          <button onClick={createList} className="btn btn-primary btn-sm">Create</button>
          <button onClick={() => setCreating(false)} className="btn btn-sm">Cancel</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }} className="candidate-profile-grid">
        {/* Left: hotlist cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hotlists.length === 0 && !creating && (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No hotlists yet</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>Create one to start building candidate pools</p>
            </div>
          )}
          {hotlists.map((h: any) => (
            <div key={h.id} onClick={() => selectList(h)} className="card" style={{
              padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s',
              border: selectedList?.id === h.id ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: selectedList?.id === h.id ? 'var(--accent-bg)' : 'var(--card-bg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>🔥 {h.name}</h3>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(h.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16 }}>×</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Created {new Date(h.created_at).toLocaleDateString()}
              </p>
              {confirmDelete === h.id && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); deleteList(h.id) }} className="btn btn-danger btn-sm" style={{ fontSize: 11 }}>Delete</button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }} className="btn btn-sm" style={{ fontSize: 11 }}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: candidates in selected hotlist */}
        <div className="card" style={{ overflow: 'hidden', minHeight: 200 }}>
          {!selectedList ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>👈</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Select a hotlist to view candidates</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>🔥 {selectedList.name}</h2>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{candidates.length} candidates</span>
              </div>
              {candidates.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No candidates in this hotlist</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>Add candidates from the Candidates page or their profile</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead><tr>
                      <th>Name</th><th>Title</th><th className="hide-mobile">Company</th>
                      <th className="hide-mobile">Location</th><th style={{ width: 70 }}></th>
                    </tr></thead>
                    <tbody>
                      {candidates.map((hc: any) => {
                        const c = hc.candidates
                        if (!c) return null
                        return (
                          <tr key={hc.id}>
                            <td>
                              <Link href={`/candidates/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                                <div className="avatar" style={{ background: 'var(--accent)', color: 'white', width: 24, height: 24, fontSize: 9 }}>
                                  {initials(c.name)}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{c.name}</span>
                              </Link>
                            </td>
                            <td style={{ fontSize: 12 }}>{c.current_title || '—'}</td>
                            <td className="hide-mobile" style={{ fontSize: 12 }}>{c.current_company || '—'}</td>
                            <td className="hide-mobile" style={{ fontSize: 12 }}>{c.location?.split(',')[0] || '—'}</td>
                            <td>
                              <button onClick={() => removeCandidate(hc.id)} className="btn btn-sm" style={{ color: 'var(--danger)', fontSize: 11 }}>Remove</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
