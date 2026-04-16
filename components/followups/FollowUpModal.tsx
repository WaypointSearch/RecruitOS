'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Props {
  candidateId: string
  existing?: any
  onClose: () => void
  onSaved: () => void
}

export default function FollowUpModal({ candidateId, existing, onClose, onSaved }: Props) {
  const sb = createClientComponentClient()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      const d = new Date(existing.follow_up_at)
      setDate(d.toISOString().slice(0, 10))
      // Check if time is meaningful (not midnight)
      const hours = d.getHours(), mins = d.getMinutes()
      if (hours !== 0 || mins !== 0) setTime(d.toTimeString().slice(0, 5))
      setNotes(existing.notes || '')
      setPriority(existing.priority || 'normal')
    } else {
      // Default: tomorrow at 9am
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(9, 0, 0, 0)
      setDate(t.toISOString().slice(0, 10))
      setTime('09:00')
    }
  }, [existing])

  const save = async () => {
    if (!date) return
    setSaving(true)
    const { data: { user } } = await sb.auth.getUser()
    const followUpAt = time ? new Date(`${date}T${time}:00`) : new Date(`${date}T00:00:00`)
    const payload = {
      candidate_id: candidateId,
      user_id: user?.id,
      follow_up_at: followUpAt.toISOString(),
      notes: notes || null,
      priority,
      status: 'pending',
    }
    if (existing) {
      await (sb as any).from('follow_ups').update(payload).eq('id', existing.id)
    } else {
      await (sb as any).from('follow_ups').insert([payload])
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  // Quick date shortcuts
  const setQuickDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0)
    setDate(d.toISOString().slice(0, 10))
    if (!time) setTime('09:00')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>📅 {existing ? 'Edit Follow-Up' : 'Set Follow-Up'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>
        <div className="modal-body">
          {/* Quick date pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[
              { l: 'Tomorrow', d: 1 }, { l: '3 Days', d: 3 }, { l: '1 Week', d: 7 }, { l: '2 Weeks', d: 14 }, { l: '1 Month', d: 30 },
            ].map(q => (
              <button key={q.l} onClick={() => setQuickDate(q.d)} className="btn btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>{q.l}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Time <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)' }}>(optional)</span></label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ fontSize: 14 }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder='e.g. "Call back in 2 weeks" or "Interested after bonus payout"' style={{ fontSize: 13, resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPriority('normal')} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 13, color: priority === 'normal' ? 'var(--accent)' : undefined, borderColor: priority === 'normal' ? 'var(--accent)' : undefined, background: priority === 'normal' ? 'var(--accent-bg)' : undefined }}>Normal</button>
              <button onClick={() => setPriority('urgent')} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 13, color: priority === 'urgent' ? 'var(--danger)' : undefined, borderColor: priority === 'urgent' ? 'var(--danger)' : undefined, background: priority === 'urgent' ? 'var(--danger-bg)' : undefined }}>🔥 Urgent</button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={save} disabled={saving || !date} className="btn btn-primary">{saving ? 'Saving...' : existing ? 'Update' : 'Set Follow-Up'}</button>
        </div>
      </div>
    </div>
  )
}
