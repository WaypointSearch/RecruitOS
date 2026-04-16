'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import FollowUpModal from './FollowUpModal'

interface Props {
  candidateId: string
  compact?: boolean
  onChanged?: () => void
}

export default function FollowUpList({ candidateId, compact, onChanged }: Props) {
  const sb = createClientComponentClient()
  const [items, setItems] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [showNew, setShowNew] = useState(false)

  const load = async () => {
    const { data } = await (sb as any).from('follow_ups').select('*').eq('candidate_id', candidateId).order('follow_up_at', { ascending: false })
    setItems(data || [])
  }
  useEffect(() => { load() }, [candidateId])

  const complete = async (id: string) => {
    await (sb as any).from('follow_ups').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    load(); if (onChanged) onChanged()
  }
  const del = async (id: string) => {
    if (!confirm('Delete this follow-up?')) return
    await (sb as any).from('follow_ups').delete().eq('id', id)
    load(); if (onChanged) onChanged()
  }
  const snooze = async (id: string, days: number) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const d = new Date(item.follow_up_at); d.setDate(d.getDate() + days)
    await (sb as any).from('follow_ups').update({ follow_up_at: d.toISOString(), status: 'pending' }).eq('id', id)
    load(); if (onChanged) onChanged()
  }

  const pending = items.filter(i => i.status === 'pending')
  const history = items.filter(i => i.status !== 'pending')

  const fmtDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diffDays = Math.floor((date.getTime() - now.getTime()) / 86400000)
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0
    const timeStr = hasTime ? ' at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`
    if (diffDays === -1) return 'Yesterday' + timeStr
    if (diffDays === 0) return 'Today' + timeStr
    if (diffDays === 1) return 'Tomorrow' + timeStr
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' }) + timeStr
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + timeStr
  }

  const isOverdue = (d: string) => new Date(d).getTime() < Date.now()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📅 Follow-Ups {pending.length > 0 && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>({pending.length})</span>}
        </h3>
        <button onClick={() => setShowNew(true)} className="btn btn-sm" style={{ fontSize: 11, color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }}>+ New</button>
      </div>

      {pending.length === 0 && history.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No reminders set — click +New to add one</p>}

      {/* Pending */}
      {pending.map(it => (
        <div key={it.id} style={{ padding: '8px 10px', marginBottom: 6, borderRadius: 8, border: '1px solid ' + (it.priority === 'urgent' ? 'var(--danger)' : isOverdue(it.follow_up_at) ? 'var(--warning)' : 'var(--border)'), background: it.priority === 'urgent' ? 'var(--danger-bg)' : isOverdue(it.follow_up_at) ? 'var(--warning-bg)' : 'var(--card-bg-hover)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {it.priority === 'urgent' && <span style={{ fontSize: 11 }}>🔥</span>}
            <span style={{ fontSize: 12, fontWeight: 700, color: isOverdue(it.follow_up_at) ? 'var(--danger)' : 'var(--text-primary)' }}>{fmtDate(it.follow_up_at)}</span>
          </div>
          {it.notes && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 6 }}>{it.notes}</p>}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button onClick={() => complete(it.id)} className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px', color: 'var(--success)' }}>✓ Done</button>
            <button onClick={() => snooze(it.id, 1)} className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}>💤 +1d</button>
            <button onClick={() => snooze(it.id, 7)} className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}>💤 +7d</button>
            <button onClick={() => setEditing(it)} className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}>✏️ Edit</button>
            <button onClick={() => del(it.id)} className="btn btn-sm" style={{ fontSize: 10, padding: '3px 8px', color: 'var(--danger)' }}>🗑</button>
          </div>
        </div>
      ))}

      {/* History */}
      {!compact && history.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 10, marginBottom: 6 }}>History</p>
          {history.slice(0, 10).map(it => (
            <div key={it.id} style={{ padding: '6px 10px', marginBottom: 4, borderRadius: 6, background: 'var(--card-bg-hover)', opacity: 0.65, fontSize: 11 }}>
              <span style={{ color: 'var(--success)' }}>✓</span> <span style={{ color: 'var(--text-secondary)' }}>{new Date(it.follow_up_at).toLocaleDateString()}</span>
              {it.notes && <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>— {it.notes.slice(0, 60)}{it.notes.length > 60 ? '…' : ''}</span>}
              <button onClick={() => del(it.id)} className="btn btn-sm" style={{ float: 'right', fontSize: 10, padding: '1px 6px', color: 'var(--text-tertiary)' }}>×</button>
            </div>
          ))}
        </>
      )}

      {(showNew || editing) && (
        <FollowUpModal
          candidateId={candidateId}
          existing={editing}
          onClose={() => { setShowNew(false); setEditing(null) }}
          onSaved={() => { load(); if (onChanged) onChanged() }}
        />
      )}
    </div>
  )
}
