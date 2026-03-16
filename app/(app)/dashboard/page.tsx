'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function DashboardPage() {
  const sb = useRef(createClientComponentClient()).current
  const [stats, setStats] = useState({ candidates: 0, jobs: 0, companies: 0, pipeline: 0 })
  const [totalFees, setTotalFees] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [hotPipeline, setHotPipeline] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const { count: cCount } = await (sb as any).from('candidates').select('id', { count: 'exact', head: true })
      const { count: jCount } = await (sb as any).from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Active')
      const { count: coCount } = await (sb as any).from('companies').select('id', { count: 'exact', head: true }).eq('status', 'Client')
      const { count: pCount } = await (sb as any).from('pipeline').select('id', { count: 'exact', head: true })

      setStats({ candidates: cCount || 0, jobs: jCount || 0, companies: coCount || 0, pipeline: pCount || 0 })

      // Total potential fees across all pipelines
      const { data: pipeFees } = await (sb as any).from('pipeline').select('candidates(current_salary)')
      const fees = (pipeFees ?? []).reduce((sum: number, p: any) => {
        const sal = p.candidates?.current_salary
        return sum + (sal ? Math.round(sal * 0.2) : 0)
      }, 0)
      setTotalFees(fees)

      // Recent activity
      const { data: acts } = await (sb as any)
        .from('activities').select('*, candidates(name)')
        .order('created_at', { ascending: false }).limit(8)
      setRecentActivity(acts ?? [])

      // Hot pipeline
      const { data: pipes } = await (sb as any)
        .from('pipeline').select('*, candidates(name, current_salary), jobs(title)')
        .order('moved_at', { ascending: false }).limit(6)
      setHotPipeline(pipes ?? [])

      // User activity leaderboard — count activities per user this month
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { data: allActs } = await (sb as any)
        .from('activities').select('created_by, created_by_name, type')
        .gte('created_at', monthStart.toISOString())

      if (allActs) {
        const userMap: Record<string, { name: string; total: number; calls: number; emails: number; notes: number; linkedin: number }> = {}
        allActs.forEach((a: any) => {
          const uid = a.created_by
          if (!uid) return
          if (!userMap[uid]) userMap[uid] = { name: a.created_by_name || 'Unknown', total: 0, calls: 0, emails: 0, notes: 0, linkedin: 0 }
          userMap[uid].total++
          if (a.type === 'called' || a.type === 'voicemail') userMap[uid].calls++
          else if (a.type === 'email') userMap[uid].emails++
          else if (a.type === 'note') userMap[uid].notes++
          else if (a.type === 'linkedin') userMap[uid].linkedin++
        })
        const board = Object.values(userMap).sort((a, b) => b.total - a.total)
        setLeaderboard(board)
      }
    })()
  }, [])

  const statCards = [
    { label: 'Candidates', value: stats.candidates, icon: '◉', color: 'var(--accent)' },
    { label: 'Active Jobs', value: stats.jobs, icon: '◈', color: 'var(--success)' },
    { label: 'Clients', value: stats.companies, icon: '◫', color: 'var(--warning)' },
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

  const formatMoney = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`

  const monthName = new Date().toLocaleString('default', { month: 'long' })

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>Dashboard</h1>

      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              <span style={{ fontSize: 16, color: s.color }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: 30, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Total Fees Banner */}
      <div className="card" style={{
        padding: '16px 22px', marginBottom: 16,
        background: totalFees > 0 ? 'linear-gradient(135deg, var(--success-bg), var(--accent-bg))' : 'var(--card-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
            Total Potential Fees (All Pipelines)
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: totalFees > 0 ? 'var(--success)' : 'var(--text-tertiary)', marginTop: 2 }}>
            {totalFees > 0 ? formatMoney(totalFees) : '$0'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Based on 20% placement fee</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{stats.pipeline} candidates in pipeline</p>
        </div>
      </div>

      {/* Three column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }} className="stats-grid">

        {/* Recent Activity */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</h2>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {recentActivity.length === 0 && (
              <p style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>No recent activity</p>
            )}
            {recentActivity.map((a: any) => (
              <div key={a.id} style={{ padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12 }}>
                    <strong>{a.created_by_name}</strong> — {a.type === 'note' ? `Note: "${(a.content||'').slice(0,50)}"` : a.type === 'stage_change' ? a.content : a.type}
                    {a.candidates?.name && <span style={{ color: 'var(--text-secondary)' }}> on {a.candidates.name}</span>}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{timeAgo(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Pipeline */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Hot Pipeline</h2>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {hotPipeline.length === 0 && (
              <p style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>No active pipeline</p>
            )}
            {hotPipeline.map((p: any) => {
              const commission = p.candidates?.current_salary ? Math.round(p.candidates.current_salary * 0.2) : null
              return (
                <Link key={p.id} href={`/pipeline/${p.job_id}`} style={{ textDecoration: 'none', display: 'block', padding: '8px 16px', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.candidates?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.jobs?.title}</p>
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.stage?.split(' ').slice(0,2).join(' ')}</span>
                    {commission && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>{formatMoney(commission)}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>🏆 {monthName} Leaderboard</h2>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {leaderboard.length === 0 && (
              <p style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>No activity this month</p>
            )}
            {leaderboard.map((u: any, i: number) => (
              <div key={i} style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid var(--border-light)',
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                  background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--card-bg-hover)',
                  color: i < 3 ? '#1a1a1e' : 'var(--text-secondary)',
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    {u.calls > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>📞 {u.calls}</span>}
                    {u.emails > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>✉️ {u.emails}</span>}
                    {u.linkedin > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>💼 {u.linkedin}</span>}
                    {u.notes > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>📝 {u.notes}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent)' }}>{u.total}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>activities</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
