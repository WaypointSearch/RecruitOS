import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ActivityFeed from './ActivityFeed'
import AssignJobModal from './AssignJobModal'

export default async function CandidateProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })

  const [{ data: candidate }, { data: pipeline }, { data: jobs }, { data: session }] = await Promise.all([
    supabase.from('candidates').select('*').eq('id', params.id).single(),
    supabase.from('pipeline')
      .select('*, jobs(id, title, status, companies(name))')
      .eq('candidate_id', params.id)
      .order('added_at', { ascending: false }),
    supabase.from('jobs').select('id, title, companies(name)').eq('status', 'Active'),
    supabase.auth.getSession(),
  ])

  if (!candidate) notFound()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', session.session!.user.id).single()

  const initials = candidate.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const stageColor = (stage: string) => {
    if (['Offer Accepted', 'Started - Send Invoice'].includes(stage)) return 'badge-green'
    if (['Offer Extended'].includes(stage)) return 'badge-blue'
    if (['Interview Scheduled', 'Interview Requested'].includes(stage)) return 'badge-amber'
    return 'badge-gray'
  }

  const fields = [
    ['Current title', candidate.current_title],
    ['Current company', candidate.current_company],
    ['Company URL', candidate.current_company_url],
    ['Time in role', candidate.time_in_current_role],
    ['Previous title', candidate.previous_title],
    ['Previous company', candidate.previous_company],
    ['Previous dates', candidate.previous_dates],
    ['Email', candidate.email],
    ['Phone', candidate.phone],
    ['LinkedIn', candidate.linkedin],
    ['Source list', candidate.source_list],
  ].filter(([, v]) => v)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href="/candidates" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft size={14} /> Back to candidates
      </Link>

      <div className="grid grid-cols-[1fr_360px] gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Header card */}
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900">{candidate.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {candidate.current_title}{candidate.current_company ? ` · ${candidate.current_company}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(candidate.tags ?? []).map((t: string) => (
                    <span key={t} className="badge badge-gray">{t}</span>
                  ))}
                </div>
              </div>
              <AssignJobModal candidateId={candidate.id} jobs={jobs ?? []} currentProfile={profile!} />
            </div>
          </div>

          {/* Details */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {fields.map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                  <dd className="text-sm text-gray-800">
                    {String(label).toLowerCase().includes('url') || String(label).toLowerCase() === 'linkedin'
                      ? <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">{value}</a>
                      : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Active pipeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Pipeline assignments</h2>
            {pipeline?.length === 0
              ? <p className="text-sm text-gray-400">Not assigned to any jobs yet.</p>
              : (
                <div className="space-y-2">
                  {pipeline?.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1">
                        <Link href={`/pipeline/${p.jobs?.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600">
                          {(p.jobs as any)?.title}
                        </Link>
                        <p className="text-xs text-gray-400">{(p.jobs as any)?.companies?.name}</p>
                      </div>
                      <span className={`badge ${stageColor(p.stage)}`}>{p.stage}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Right column — activity feed */}
        <ActivityFeed
          candidateId={candidate.id}
          currentProfile={profile!}
        />
      </div>
    </div>
  )
}
