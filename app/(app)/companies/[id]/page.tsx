import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone } from 'lucide-react'

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const [{ data: company }, { data: contacts }, { data: jobs }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', params.id).single(),
    supabase.from('company_contacts').select('*').eq('company_id', params.id).order('name'),
    supabase.from('jobs').select('*').eq('company_id', params.id).order('created_at', { ascending: false }),
  ])
  if (!company) notFound()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft size={14} /> Back to companies
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center">
          {company.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`badge ${company.status === 'Client' ? 'badge-green' : 'badge-amber'}`}>{company.status}</span>
            {company.industry && <span className="text-sm text-gray-500">{company.industry}</span>}
            {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{company.website}</a>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Contacts */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Contacts ({contacts?.length ?? 0})</h2>
          {contacts?.length === 0
            ? <p className="text-sm text-gray-400">No contacts yet.</p>
            : contacts?.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  {c.title && <p className="text-xs text-gray-500">{c.title}</p>}
                  <div className="flex gap-3 mt-1">
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-blue-600 flex items-center gap-1"><Mail size={11}/>{c.email}</a>}
                    {c.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11}/>{c.phone}</span>}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Jobs */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Job orders ({jobs?.length ?? 0})</h2>
            <Link href="/jobs" className="btn btn-sm">+ Add job</Link>
          </div>
          {jobs?.length === 0
            ? <p className="text-sm text-gray-400">No job orders yet.</p>
            : jobs?.map((j: any) => (
              <Link key={j.id} href={`/pipeline/${j.id}`}
                className="block py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{j.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {j.location}
                      {j.salary_min && ` · $${(j.salary_min/1000).toFixed(0)}K–$${(j.salary_max!/1000).toFixed(0)}K`}
                    </p>
                  </div>
                  <span className={`badge ${j.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{j.status}</span>
                </div>
              </Link>
            ))
          }
        </div>
      </div>

      {company.notes && (
        <div className="card p-5 mt-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{company.notes}</p>
        </div>
      )}
    </div>
  )
}
