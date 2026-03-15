import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KanbanBoard from './KanbanBoard'

export default async function PipelinePage({ params }: { params: { jobId: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const [{ data: job }, { data: pipelineRows }, { data: session }] = await Promise.all([
    supabase.from('jobs').select('*, companies(name), company_contacts(name)').eq('id', params.jobId).single(),
    supabase.from('pipeline')
      .select('*, candidates(id, name, current_title, current_company)')
      .eq('job_id', params.jobId),
    supabase.auth.getSession(),
  ])
  if (!job) notFound()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', session.session!.user.id).single()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-4 flex-shrink-0">
        <Link href="/jobs" className="text-gray-400 hover:text-gray-700"><ArrowLeft size={16}/></Link>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">{job.title}</h1>
          <p className="text-xs text-gray-500">
            {(job.companies as any)?.name}
            {job.location && ` · ${job.location}`}
            {job.salary_min && ` · $${(job.salary_min/1000).toFixed(0)}K–$${(job.salary_max!/1000).toFixed(0)}K`}
          </p>
        </div>
        <span className={`badge ml-auto ${job.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{job.status}</span>
      </div>
      <KanbanBoard
        jobId={job.id}
        initialRows={pipelineRows ?? []}
        currentProfile={profile!}
      />
    </div>
  )
}
