'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const quickActions = [
  { label: 'Talked to', type: 'called', icon: '📞' },
  { label: 'Voicemail', type: 'voicemail', icon: '📩' },
  { label: 'Emailed', type: 'email', icon: '✉️' },
  { label: 'LinkedIn', type: 'linkedin', icon: '💼' },
  { label: 'Text', type: 'text', icon: '💬' },
]

export default function ActivityFeed({ candidateId }: { candidateId: string }) {
  const sbRef = useRef(createClientComponentClient())
  const [activities, setActivities] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const loadActivities = useCallback(async () => {
    const { data } = await (sbRef.current as any)
      .from('activities').select('*').eq('candidate_id', candidateId)
      .order('created_at', { ascending: false }).limit(100)
    if (data) setActivities(data)
  }, [candidateId])

  useEffect(() => {
    loadActivities()
    const channel = sbRef.current
      .channel(`act-${candidateId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `candidate_id=eq.${candidateId}` }, () => loadActivities())
      .subscribe()
    return () => { sbRef.current.removeChannel(channel) }
  }, [candidateId, loadActivities])

  const logActivity = async (type: string, content?: string) => {
    setSaving(true)
    const sb = sbRef.current
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaving(false); return }
    const userName = user.email?.split('@')[0] || 'Unknown'
    const now = new Date().toISOString()

    // OPTIMISTIC: add to UI immediately
    const optimisticEntry = {
      id: 'temp-' + Date.now(),
      candidate_id: candidateId,
      type,
      content: content || null,
      created_by: user.id,
      created_by_name: userName,
      created_at: now,
    }
    setActivities(prev => [optimisticEntry, ...prev])
    if (type === 'note') setNote('')
    showToast(type === 'note' ? '📝 Note saved' : `✓ ${type} logged`)

    // Then save to DB
    const { error } = await (sb as any).from('activities').insert([{
      candidate_id: candidateId,
      type,
      content: content || null,
      created_by: user.id,
      created_by_name: userName,
    }])
    if (error) {
      // Revert optimistic update
      setActivities(prev => prev.filter(a => a.id !== optimisticEntry.id))
      showToast('Error saving — try again')
    }
    setSaving(false)
  }

  const deleteActivity = async (id: string) => {
    // Optimistic remove
    setActivities(prev => prev.filter(a => a.id !== id))
    setConfirmDelete(null)
    showToast('Deleted')
    await (sbRef.current as any).from('activities').delete().eq('id', id)
  }

  const typeIcon: Record<string, string> = {
    note: '📝', called: '📞', voicemail: '📩', email: '✉️', linkedin: '💼', text: '💬', stage_change: '🔄',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {toast && <div className="toast toast-success">{toast}</div>}

      {/* Quick actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {quickActions.map(qa => (
          <button key={qa.type} onClick={() => logActivity(qa.type)} disabled={saving}
            className="btn btn-sm" style={{ fontSize: 11, padding: '4px 8px' }}>
            {qa.icon} {qa.label}
          </button>
        ))}
      </div>

      {/* Note input */}
      <div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..."
          rows={2} style={{ resize: 'vertical', fontSize: 12 }} />
        <button onClick={() => note.trim() && logActivity('note', note.trim())} disabled={saving || !note.trim()}
          className="btn btn-primary btn-sm" style={{ marginTop: 4, width: '100%' }}>
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activities.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: 16 }}>No activity yet</p>}
        {activities.map(a => (
          <div key={a.id} style={{ padding: '6px 8px', borderRadius: 8, background: 'var(--card-bg-hover)', border: '1px solid var(--border-light)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontSize: 14, marginTop: 1 }}>{typeIcon[a.type] || '📋'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{a.created_by_name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{a.type}</span>
                </div>
                {a.content && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.content}</p>}
                <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setConfirmDelete(a.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-tertiary)', padding: '0 2px', opacity: 0.4, transition: 'opacity 0.15s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>×</button>
            </div>
            {confirmDelete === a.id && (
              <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--danger-bg)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1 }}>Delete?</span>
                <button onClick={() => deleteActivity(a.id)} className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>Yes</button>
                <button onClick={() => setConfirmDelete(null)} className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>No</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
