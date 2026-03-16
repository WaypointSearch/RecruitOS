import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { MapPin, Search } from 'lucide-react'
import AddCompanyModal from './AddCompanyModal'

export default async function CompaniesPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createServerComponentClient({ cookies })
  let query = (supabase as any).from('companies').select('*, company_contacts(id), jobs(id)').order('name')
  if (searchParams.q) {
    const q = '%' + searchParams.q + '%'
    query = query.or('name.ilike.' + q + ',location.ilike.' + q + ',industry.ilike.' + q)
  }
  const { data: companies } = await query
  const clients = (companies ?? []).filter((c: any) => c.status === 'Client')
  const prospects = (companies ?? []).filter((c: any) => c.status === 'Prospect')
  const avColors = [['#e8f0fb','#0058b0'],['#eafaf0','#1a7a35'],['#fff5e0','#7d4800'],['#f3effe','#5c2d91'],['#fce8e8','#9b1a14']]
  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const CompanyTable = ({ items, offset = 0 }: { items: any[]; offset?: number }) => (
    <div className="mac-card" style={{ overflow: 'hidden', marginBottom: 20 }}>
      <table className="mac-table">
        <thead><tr>{['Company','Location','Industry','Contacts','Jobs','Status',''].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((c: any, i: number) => {
            const [bg, fg] = avColors[(i + offset) % avColors.length]
            return (
              <tr key={c.id} onClick={() => window.location.href = '/companies/' + c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, color: fg, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(c.name)}</div>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                  </div>
                </td>
                <td>{c.location ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}><MapPin size={11} style={{ color: 'var(--text-4)' }} />{c.location}</span> : '—'}</td>
                <td style={{ color: 'var(--text-3)' }}>{c.industry || '—'}</td>
                <td style={{ color: 'var(--text-3)' }}>{(c.company_contacts as any[])?.length ?? 0}</td>
                <td style={{ color: 'var(--text-3)' }}>{(c.jobs as any[])?.length ?? 0}</td>
                <td><span className={'badge ' + (c.status === 'Client' ? 'badge-green' : 'badge-amber')}>{c.status}</span></td>
                <td style={{ textAlign: 'right' }}><Link href={'/companies/' + c.id} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }} onClick={e => e.stopPropagation()}>View →</Link></td>
              </tr>
            )
          })}
          {items.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-4)', fontSize: 13 }}>None yet</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Companies</h1>
        <AddCompanyModal />
      </div>
      <form method="GET" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={13} />
          <input name="q" defaultValue={searchParams.q} placeholder="Search by name, location, industry..." />
        </div>
        <button type="submit" className="btn btn-sm btn-primary">Search</button>
        {searchParams.q && <Link href="/companies" className="btn btn-sm">Clear</Link>}
      </form>
      <div className="section-title">Clients ({clients.length})</div>
      <CompanyTable items={clients} />
      <div className="section-title">Prospects ({prospects.length})</div>
      <CompanyTable items={prospects} offset={clients.length} />
    </div>
  )
}
