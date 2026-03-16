import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KanbanBoard from './KanbanBoard'

export default async function PipelinePage({ params }: { params: { jobId: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const [{ data: job }, { data: pipelineRows }, { data: { session } }] = await Promise.all([
    (supabase as any).from('jobs').select('*, companies(name), company_contacts(name)').eq('id', params.jobId).single(),
    (supabase as any).from('pipeline').select('*, candidates(id, name, current_title, current_company, current_salary)').eq('job_id', params.jobId),
    supabase.auth.getSession(),
  ])
  if (!job) notFound()
  const { data: profile } = await (supabase as any).from('profiles').select('*').eq('id', session!.user.id).single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Link href="/jobs" style={{ color: 'var(--text-3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}><ArrowLeft size={16} /></Link>
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{job.title}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-4)' }}>{(job.companies as any)?.name}{job.location ? ' · ' + job.location : ''}{job.salary_min ? ' · $' + Math.round(job.salary_min/1000) + 'K–$' + Math.round(job.salary_max/1000) + 'K' : ''}</p>
        </div>
        <span className={'badge ' + (job.status === 'Active' ? 'badge-green' : 'badge-gray')} style={{ marginLeft: 'auto' }}>{job.status}</span>
      </div>
      <KanbanBoard jobId={job.id} initialRows={pipelineRows ?? []} currentProfile={profile} />
    </div>
  )
}
