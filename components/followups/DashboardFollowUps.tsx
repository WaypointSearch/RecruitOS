'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function DashboardFollowUps() {
  const sb = createClientComponentClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await (sb as any).from('follow_ups')
      .select('*, candidates(id, name, current_title, current_company, work_phone, cell_phone)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('follow_up_at', { ascending: true })
      .limit(50)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const complete = async (id: string) => {
    await (sb as any).from('follow_ups').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    load()
  }
  const snooze = async (id: string, days: number) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const d = new Date(item.follow_up_at); d.setDate(d.getDate() + days)
    await (sb as any).from('follow_ups').update({ follow_up_at: d.toISOString() }).eq('id', id)
    load()
  }

  // Bucketing
  const now = Date.now()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const in48h = now + 48 * 3600 * 1000

  const overdue = items.filter(i => new Date(i.follow_up_at).getTime() < todayStart.getTime())
  const today = items.filter(i => {
    const t = new Date(i.follow_up_at).getTime()
    return t >= todayStart.getTime() && t <= todayEnd.getTime()
  })
  const next48 = items.filter(i => {
    const t = new Date(i.follow_up_at).getTime()
    return t > todayEnd.getTime() && t <= in48h
  })
  const future = items.filter(i => new Date(i.follow_up_at).getTime() > in48h)

  const fmtWhen = (d: string) => {
    const date = new Date(d)
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0
    const time = hasTime ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
    const diffDays = Math.floor((date.getTime() - now) / 86400000)
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue${time ? ' · ' + time : ''}`
    if (diffDays === -1) return `Yesterday${time ? ' · ' + time : ''}`
    if (diffDays === 0) return time || 'Today'
    if (diffDays === 1) return `Tomorrow${time ? ' · ' + time : ''}`
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' }) + (time ? ' · ' + time : '')
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + (time ? ' · ' + time : '')
  }

  const renderItem = (it: any, bucket: string) => {
    const c = it.candidates
    if (!c) return null
    const color = bucket === 'overdue' ? 'var(--danger)' : bucket === 'today' ? 'var(--warning)' : bucket === 'next48' ? 'var(--accent)' : 'var(--text-secondary)'
    const bg = bucket === 'overdue' ? 'var(--danger-bg)' : bucket === 'today' ? 'var(--warning-bg)' : 'var(--card-bg-hover)'
    const phone = c.work_phone || c.cell_phone
    return (
      <div key={it.id} style={{ padding: '10px 12px', borderRadius: 8, background: bg, border: `1px solid ${color}30`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 10, width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {it.priority === 'urgent' && <span style={{ fontSize: 11 }}>🔥</span>}
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</p>
            <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{fmtWhen(it.follow_up_at)}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.current_title || ''}{c.current_company ? ' @ ' + c.current_company : ''}</p>
          {it.notes && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, fontStyle: 'italic' }}>"{it.notes}"</p>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {phone && <a href={`tel:${phone}`} className="btn btn-sm" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--neon-green)' }}>📞</a>}
          <button onClick={() => complete(it.id)} className="btn btn-sm" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--success)' }} title="Mark done">✓</button>
          <button onClick={() => snooze(it.id, 1)} className="btn btn-sm" style={{ fontSize: 11, padding: '4px 8px' }} title="Snooze 1 day">💤</button>
          <Link href={`/candidates/${c.id}`} className="btn btn-sm" style={{ fontSize: 11, padding: '4px 8px', textDecoration: 'none' }} title="Open profile">→</Link>
        </div>
      </div>
    )
  }

  if (loading) return null
  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📅 Follow-Ups</h2>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>All clear — no pending follow-ups. Set one from any candidate profile.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700 }}>📅 Follow-Ups <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>({items.length} pending)</span></h2>
      </div>
      {overdue.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>⚠ OVERDUE ({overdue.length})</p>
          {overdue.map(it => renderItem(it, 'overdue'))}
        </div>
      )}
      {today.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>TODAY ({today.length})</p>
          {today.map(it => renderItem(it, 'today'))}
        </div>
      )}
      {next48.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>NEXT 48 HOURS ({next48.length})</p>
          {next48.map(it => renderItem(it, 'next48'))}
        </div>
      )}
      {future.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>UPCOMING ({future.length})</p>
          {future.slice(0, 5).map(it => renderItem(it, 'future'))}
        </div>
      )}
    </div>
  )
}
