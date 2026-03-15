import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function PipelineIndexPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, companies(name), pipeline(id, stage)')
    .eq('status', 'Active')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Pipeline — All Active Jobs</h1>
      <div className="space-y-3">
        {jobs?.map(j => {
          const pipeline = (j.pipeline as any[]) ?? []
          const stageCounts = pipeline.reduce((acc: Record<string, number>, p) => {
            acc[p.stage] = (acc[p.stage] || 0) + 1; return acc
          }, {})
          return (
            <Link key={j.id} href={`/pipeline/${j.id}`}
              className="card p-4 flex items-center gap-4 hover:border-blue-200 transition-colors block">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{j.title}</p>
                <p className="text-xs text-blue-600">{(j.companies as any)?.name}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {Object.entries(stageCounts).map(([stage, count]) => (
                  <span key={stage} className="badge badge-gray text-xs">{stage}: {count as number}</span>
                ))}
                {pipeline.length === 0 && <span className="text-xs text-gray-400">No candidates yet</span>}
              </div>
              <span className="text-blue-600 text-sm">→</span>
            </Link>
          )
        })}
        {jobs?.length === 0 && (
          <div className="card p-10 text-center text-sm text-gray-400">
            No active jobs. <Link href="/jobs" className="text-blue-600 hover:underline">Create one first.</Link>
          </div>
        )}
      </div>
    </div>
  )
}
