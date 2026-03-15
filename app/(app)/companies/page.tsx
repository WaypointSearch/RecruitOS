import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import AddCompanyModal from './AddCompanyModal'

export default async function CompaniesPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: companies } = await supabase
    .from('companies')
    .select('*, company_contacts(id), jobs(id)')
    .order('name')

  const clients = companies?.filter(c => c.status === 'Client') ?? []
  const prospects = companies?.filter(c => c.status === 'Prospect') ?? []

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const avatarColors = ['bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-rose-100 text-rose-700']

  const CompanyTable = ({ items, offset = 0 }: { items: typeof companies, offset?: number }) => (
    <div className="card overflow-hidden mb-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Company', 'Industry', 'Contacts', 'Open jobs', 'Status', ''].map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items?.map((c, i) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColors[(i + offset) % avatarColors.length]}`}>
                    {initials(c.name)}
                  </div>
                  <Link href={`/companies/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {c.name}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-500">{c.industry || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{(c.company_contacts as any[])?.length ?? 0}</td>
              <td className="px-4 py-3 text-gray-600">{(c.jobs as any[])?.length ?? 0}</td>
              <td className="px-4 py-3">
                <span className={`badge ${c.status === 'Client' ? 'badge-green' : 'badge-amber'}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/companies/${c.id}`} className="text-xs text-blue-600 hover:underline">View →</Link>
              </td>
            </tr>
          ))}
          {items?.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">None yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Companies</h1>
        <AddCompanyModal />
      </div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Clients ({clients.length})
      </h2>
      <CompanyTable items={clients} />
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Prospects ({prospects.length})
      </h2>
      <CompanyTable items={prospects} offset={clients.length} />
    </div>
  )
}
