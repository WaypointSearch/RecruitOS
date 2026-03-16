'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function DashboardPage() {
  const sb = useRef(createClientComponentClient()).current
  const [stats, setStats] = useState({ candidates: 0, jobs: 0, companies: 0, pipeline: 0 })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [hotPipeline, setHotPipeline] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const { count: cCount } = await (sb as any).from('candidates').select('id', { count: 'exact', head: true })
      const { count: jCount } = await (sb as any).from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Active')
      const { count: coCount } = await (sb as any).from('companies').select('id', { count: 'exact', head: true }).eq('status', 'Client')
      const { count: pCount } = await (sb as any).from('pipeline').select('id', { count: 'exact', head: true })

      setStats({
        candidates: cCount || 0,
        jobs: jCount || 0,
        companies: coCount || 0,
        pipeline: pCount || 0,
      })

      const { data: acts } = await (sb as any)
        .from('activities')
        .select('*, candidates(name)')
        .order('created_at', { ascending: false })
        .limit(8)
      setRecentActivity(acts ?? [])

      const { data: pipes } = await (sb as any)
        .from('pipeline')
        .select('*, candidates(name, current_salary), jobs(title)')
        .order('moved_at', { ascending: false })
        .limit(6)
      setHotPipeline(pipes ?? [])
    })()
  }, [])

  const statCards = [
    { label: 'Candidates', value: stats.candidates, icon: '◉', color: 'var(--accent)' },
    { label: 'Active Jobs', value: stats.jobs, icon: '◈', color: 'var(--success)' },
    { label: 'Client Companies', value: stats.companies, icon: '◫', color: 'var(--warning)' },
    { label: 'In Pipeline', value: stats.pipeline, icon: '◆', color: '#af52de' },
  ]

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>Dashboard</h1>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </span>
              <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, marginTop: 6, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="stats-grid">
        {/* Recent Activity */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Activity</h2>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 340, overflowY: 'auto' }}>
            {recentActivity.length === 0 && (
              <p style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>No recent activity</p>
            )}
            {recentActivity.map((a: any) => (
              <div key={a.id} style={{ padding: '8px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    <strong>{a.created_by_name}</strong> — {a.type === 'note' ? `Note: "${(a.content || '').slice(0, 60)}"` : a.type === 'stage_change' ? a.content : a.type}
                    {a.candidates?.name && (
                      <span style={{ color: 'var(--text-secondary)' }}> on {a.candidates.name}</span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{timeAgo(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Pipeline */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Hot Pipeline</h2>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 340, overflowY: 'auto' }}>
            {hotPipeline.length === 0 && (
              <p style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>No active pipeline yet</p>
            )}
            {hotPipeline.map((p: any) => {
              const commission = p.candidates?.current_salary ? Math.round(p.candidates.current_salary * 0.2) : null
              return (
                <Link key={p.id} href={`/pipeline/${p.job_id}`} style={{ textDecoration: 'none', display: 'block', padding: '8px 18px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.candidates?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.jobs?.title}</p>
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.stage}</span>
                    {commission && (
                      <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                        ${(commission/1000).toFixed(0)}k
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
