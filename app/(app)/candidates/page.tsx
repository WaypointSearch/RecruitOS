import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Upload, MapPin, Search } from 'lucide-react'
import AddCandidateModal from './AddCandidateModal'

export default async function CandidatesPage({ searchParams }: { searchParams: { q?: string; tag?: string; location?: string } }) {
  const supabase = createServerComponentClient({ cookies })
  let query = (supabase as any).from('candidates').select('*').order('created_at', { ascending: false })

  if (searchParams.q) {
    const q = '%' + searchParams.q + '%'
    query = query.or('name.ilike.' + q + ',current_title.ilike.' + q + ',current_company.ilike.' + q + ',email.ilike.' + q + ',work_email.ilike.' + q + ',location.ilike.' + q)
  }
  if (searchParams.tag) query = query.contains('tags', [searchParams.tag])
  if (searchParams.location) query = query.ilike('location', '%' + searchParams.location + '%')

  const { data: candidates } = await query
  const { data: allCandidates } = await (supabase as any).from('candidates').select('tags, location')
  
  // FIXED: Using Array.from() instead of spread operator to fix Vercel build error
  const allTags = Array.from(new Set((allCandidates ?? []).flatMap((c: any) => c.tags ?? []))).sort() as string[]
  const allLocations = Array.from(new Set((allCandidates ?? []).map((c: any) => c.location).filter(Boolean))).sort() as string[]

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avColors = [['#e8f0fb','#0058b0'],['#eafaf0','#1a7a35'],['#fff5e0','#7d4800'],['#f3effe','#5c2d91'],['#fce8e8','#9b1a14']]

  // ... rest of the file rendering logic
}import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Upload, MapPin, Search } from 'lucide-react'
import AddCandidateModal from './AddCandidateModal'

export default async function CandidatesPage({ searchParams }: { searchParams: { q?: string; tag?: string; location?: string } }) {
  const supabase = createServerComponentClient({ cookies })
  let query = (supabase as any).from('candidates').select('*').order('created_at', { ascending: false })

  if (searchParams.q) {
    const q = '%' + searchParams.q + '%'
    query = query.or('name.ilike.' + q + ',current_title.ilike.' + q + ',current_company.ilike.' + q + ',email.ilike.' + q + ',work_email.ilike.' + q + ',location.ilike.' + q)
  }
  if (searchParams.tag) query = query.contains('tags', [searchParams.tag])
  if (searchParams.location) query = query.ilike('location', '%' + searchParams.location + '%')

  const { data: candidates } = await query
  const { data: allCandidates } = await (supabase as any).from('candidates').select('tags, location')
  const allTags = [...new Set((allCandidates ?? []).flatMap((c: any) => c.tags ?? []))].sort() as string[]
  const allLocations = [...new Set((allCandidates ?? []).map((c: any) => c.location).filter(Boolean))].sort() as string[]

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avColors = [['#e8f0fb','#0058b0'],['#eafaf0','#1a7a35'],['#fff5e0','#7d4800'],['#f3effe','#5c2d91'],['#fce8e8','#9b1a14']]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Candidates</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/import" className="btn btn-sm"><Upload size={13} />Import CSV</Link>
          <AddCandidateModal />
        </div>
      </div>

      <form method="GET" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={13} />
          <input name="q" defaultValue={searchParams.q} placeholder="Search name, title, company, email, location..." />
        </div>
        <select name="location" defaultValue={searchParams.location} className="input" style={{ width: 160 }}>
          <option value="">All locations</option>
          {allLocations.map((l: string) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select name="tag" defaultValue={searchParams.tag} className="input" style={{ width: 140 }}>
          <option value="">All tags</option>
          {allTags.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn btn-sm btn-primary">Filter</button>
        {(searchParams.q || searchParams.tag || searchParams.location) && (
          <Link href="/candidates" className="btn btn-sm">Clear</Link>
        )}
      </form>

      <div className="mac-card" style={{ overflow: 'hidden' }}>
        <table className="mac-table">
          <thead><tr>{['Name','Current role','Company','Location','Tags',''].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(!candidates || candidates.length === 0) && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)', fontSize: 13 }}>No candidates found.</td></tr>
            )}
            {(candidates ?? []).map((c: any, i: number) => {
              const [bg, fg] = avColors[i % avColors.length]
              return (
                <tr key={c.id} onClick={() => window.location.href = '/candidates/' + c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, color: fg, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td>{c.current_title || '—'}</td>
                  <td>{c.current_company || '—'}</td>
                  <td>
                    {c.location
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><MapPin size={11} style={{ color: 'var(--text-4)' }} />{c.location}</span>
                      : '—'}
                  </td>
                  <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(c.tags ?? []).map((t: string) => <span key={t} className="badge badge-gray">{t}</span>)}</div></td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={'/candidates/' + c.id} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }} onClick={e => e.stopPropagation()}>View →</Link>
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
