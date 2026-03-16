'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Copy, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, X, Loader } from 'lucide-react'

type DupGroup = {
  key: string
  name: string
  company: string
  location: string
  candidates: any[]
}

export default function DuplicateDetector() {
  const [running, setRunning] = useState(false)
  const [groups, setGroups] = useState<DupGroup[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const supabase = createSupabaseClient()

  async function scan() {
    setRunning(true)
    setDone(false)
    setGroups([])

    // Load all candidates with just the fields we need for comparison
    const { data } = await (supabase as any)
      .from('candidates')
      .select('id, name, current_company, location, created_at, current_title')
      .order('name')

    if (!data) { setRunning(false); return }

    // Group by normalized name + company
    const map: Record<string, any[]> = {}
    for (const c of data) {
      const normName = (c.name || '').toLowerCase().trim().replace(/\s+/g, ' ')
      const normCompany = (c.current_company || '').toLowerCase().trim()
      const key = normName + '||' + normCompany
      if (!map[key]) map[key] = []
      map[key].push(c)
    }

    // Only keep groups with 2+ candidates
    const dupGroups: DupGroup[] = Object.entries(map)
      .filter(([, candidates]) => candidates.length > 1)
      .map(([key, candidates]) => ({
        key,
        name: candidates[0].name,
        company: candidates[0].current_company || '—',
        location: candidates[0].location || '—',
        candidates: candidates.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }))
      .sort((a, b) => b.candidates.length - a.candidates.length)

    setGroups(dupGroups)
    setRunning(false)
    setDone(true)
  }

  async function deleteAllButFirst(group: DupGroup) {
    setDeleting(group.key)
    // Keep the oldest (index 0), delete the rest
    const toDelete = group.candidates.slice(1).map(c => c.id)
    for (let i = 0; i < toDelete.length; i += 50) {
      await (supabase as any).from('candidates').delete().in('id', toDelete.slice(i, i + 50))
    }
    setGroups(prev => prev.filter(g => g.key !== group.key))
    setDeleting(null)
  }

  async function deleteAllDuplicates() {
    setDeleting('all')
    for (const group of groups) {
      const toDelete = group.candidates.slice(1).map(c => c.id)
      for (let i = 0; i < toDelete.length; i += 50) {
        await (supabase as any).from('candidates').delete().in('id', toDelete.slice(i, i + 50))
      }
    }
    setGroups([])
    setDeleting(null)
  }

  const totalDups = groups.reduce((sum, g) => sum + g.candidates.length - 1, 0)

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="mac-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Copy size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Duplicate Detector</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 3 }}>
            Finds candidates with the same name and company. Keeps the oldest record, removes the rest.
          </p>
        </div>
        <button className="btn btn-primary" onClick={scan} disabled={running}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {running ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Copy size={13} />}
          {running ? 'Scanning...' : 'Scan for duplicates'}
        </button>
      </div>

      {/* Results summary */}
      {done && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: groups.length > 0 ? 'var(--amber-light)' : 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {groups.length > 0
              ? <AlertTriangle size={14} style={{ color: 'var(--amber-text)', flexShrink: 0 }} />
              : <CheckCircle size={14} style={{ color: 'var(--green-text)', flexShrink: 0 }} />
            }
            <span style={{ fontSize: 13, fontWeight: 600, color: groups.length > 0 ? 'var(--amber-text)' : 'var(--green-text)' }}>
              {groups.length > 0
                ? `Found ${groups.length} duplicate group${groups.length !== 1 ? 's' : ''} — ${totalDups} extra record${totalDups !== 1 ? 's' : ''} can be removed`
                : 'No duplicates found! Your candidate list is clean.'}
            </span>
          </div>
          {groups.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={deleteAllDuplicates} disabled={deleting === 'all'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <Trash2 size={12} />
              {deleting === 'all' ? 'Removing...' : 'Remove all ' + totalDups + ' duplicates'}
            </button>
          )}
        </div>
      )}

      {/* Duplicate groups list */}
      {groups.length > 0 && (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {groups.map(group => (
            <div key={group.key} style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer' }}
                onClick={() => toggleExpand(group.key)}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--amber-light)', color: 'var(--amber-text)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {group.candidates.length}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{group.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                    {group.company}{group.location !== '—' ? ' · ' + group.location : ''}
                    {' · '}<span style={{ color: 'var(--amber-text)' }}>{group.candidates.length - 1} duplicate{group.candidates.length - 1 !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteAllButFirst(group) }}
                  disabled={deleting === group.key}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Trash2 size={11} />
                  {deleting === group.key ? 'Removing...' : 'Keep oldest, remove ' + (group.candidates.length - 1)}
                </button>
                {expanded.has(group.key) ? <ChevronUp size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />}
              </div>

              {/* Expanded: show individual records */}
              {expanded.has(group.key) && (
                <div style={{ background: 'var(--surface-sunken)', padding: '8px 20px 12px 54px' }}>
                  {group.candidates.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < group.candidates.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, background: i === 0 ? 'var(--green-light)' : 'var(--red-light)', color: i === 0 ? 'var(--green-text)' : 'var(--red-text)', flexShrink: 0 }}>
                        {i === 0 ? 'KEEP' : 'REMOVE'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{c.current_title || '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 8 }}>
                          Added {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <a href={'/candidates/' + c.id} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!done && !running && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
          Click "Scan for duplicates" to check your candidate list.
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
