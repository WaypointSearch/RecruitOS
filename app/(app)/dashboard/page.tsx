import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })

  const [
    { count: candidateCount },
    { count: jobCount },
    { count: clientCount },
    { data: recentActivity },
    { data: hotPipeline },
  ] = await Promise.all([
    supabase.from('candidates').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'Client'),
    supabase.from('activities').select('*, candidates(name)').order('created_at', { ascending: false }).limit(8),
    supabase.from('pipeline')
      .select('*, candidates(name, current_title, current_company), jobs(title, companies(name))')
      .in('stage', ['Interview Scheduled', 'Offer Extended', 'Offer Accepted', 'Interview Requested'])
      .order('added_at', { ascending: false }).limit(6),
  ])

  const activityLabel = (type: string, content: string | null) => {
    const map: Record<string, string> = {
      note: content ? `Note: "${content.slice(0, 60)}${content.length > 60 ? '…' : ''}"` : 'Note added',
      called: 'Talked to candidate',
      voicemail: 'Left voicemail',
      emailed: 'Sent email',
      linkedin: 'Sent LinkedIn message',
      texted: 'Sent text',
      stage_change: content || 'Stage updated',
      added: 'Added to CRM',
    }
    return map[type] || type
  }

  const stageColor = (stage: string) => {
    if (['Offer Accepted', 'Started - Send Invoice'].includes(stage)) return 'badge-green'
    if (['Offer Extended'].includes(stage)) return 'badge-blue'
    if (['Interview Scheduled', 'Interview Requested'].includes(stage)) return 'badge-amber'
    return 'badge-gray'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total candidates', value: candidateCount ?? 0 },
          { label: 'Active jobs', value: jobCount ?? 0 },
          { label: 'Client companies', value: clientCount ?? 0 },
        ].map(m => (
          <div key={m.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-3xl font-semibold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Recent activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity?.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No activity yet</p>
            )}
            {recentActivity?.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{(a.candidates as any)?.name}</span>
                    {' — '}{activityLabel(a.type, a.content)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.created_by_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Hot pipeline</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {hotPipeline?.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No active pipeline yet</p>
            )}
            {hotPipeline?.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{(p.candidates as any)?.name}</p>
                  <p className="text-xs text-gray-400">
                    {(p.jobs as any)?.title} · {(p.jobs as any)?.companies?.name}
                  </p>
                </div>
                <span className={`badge ${stageColor(p.stage)}`}>{p.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
