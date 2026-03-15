import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { MapPin, DollarSign } from 'lucide-react'
import AddJobModal from './AddJobModal'

export default async function JobsPage() {
  const supabase = createServerComponentClient({ cookies })
  const [{ data: jobs }, { data: companies }, { data: contacts }] = await Promise.all([
    supabase.from('jobs')
      .select('*, companies(name), company_contacts(name), pipeline(id)')
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name').eq('status', 'Client').order('name'),
    supabase.from('company_contacts').select('id, name, company_id').order('name'),
  ])

  const statusColor = (s: string) => ({
    Active: 'badge-green', 'On Hold': 'badge-amber',
    Filled: 'badge-blue', Cancelled: 'badge-gray'
  }[s] ?? 'badge-gray')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Job Orders</h1>
        <AddJobModal companies={companies ?? []} contacts={contacts ?? []} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs?.length === 0 && (
          <div className="col-span-3 card p-10 text-center text-sm text-gray-400">
            No job orders yet. Add your first one above.
          </div>
        )}
        {jobs?.map((j: any) => (
          <Link key={j.id} href={`/pipeline/${j.id}`}
            className="card p-4 hover:border-blue-200 hover:shadow transition-all block">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">{j.title}</h2>
              <span className={`badge ${statusColor(j.status)} ml-2 flex-shrink-0`}>{j.status}</span>
            </div>
            <p className="text-xs text-blue-600 font-medium mb-3">{(j.companies as any)?.name}</p>
            <div className="space-y-1.5">
              {j.location && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin size={11} className="flex-shrink-0" />{j.location}
                </div>
              )}
              {j.salary_min && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <DollarSign size={11} className="flex-shrink-0" />
                  ${(j.salary_min/1000).toFixed(0)}K – ${(j.salary_max!/1000).toFixed(0)}K
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">
                Contact: {(j.company_contacts as any)?.name ?? '—'}
              </span>
              <span className="text-xs font-medium text-gray-600">
                {(j.pipeline as any[])?.length ?? 0} candidates
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
