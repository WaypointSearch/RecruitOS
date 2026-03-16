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

export default function ActivityFeed({ candidateId, jobId }: { candidateId: string; jobId?: string }) {
  const supabaseRef = useRef(createClientComponentClient())
  const [activities, setActivities] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadActivities = useCallback(async () => {
    const sb = supabaseRef.current
    const { data, error } = await (sb as any)
      .from('activities')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) { console.error('Load activities error:', error); return }
    setActivities(data ?? [])

    // Load avatars
    const ids = Array.from(new Set((data ?? []).map((a: any) => a.created_by).filter(Boolean)))
    if (ids.length > 0) {
      const { data: profiles } = await (sb as any)
        .from('profiles').select('id, avatar_url').in('id', ids)
      if (profiles) {
        const map: Record<string, string> = {}
        profiles.forEach((p: any) => { if (p.avatar_url) map[p.id] = p.avatar_url })
        setAvatars(map)
      }
    }
  }, [candidateId])

  useEffect(() => {
    loadActivities()
    const channel = supabaseRef.current
      .channel(`activities-${candidateId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `candidate_id=eq.${candidateId}` }, () => {
        loadActivities()
      })
      .subscribe()
    return () => { supabaseRef.current.removeChannel(channel) }
  }, [candidateId, loadActivities])

  const logActivity = async (type: string, content?: string) => {
    setSaving(true)
    const sb = supabaseRef.current
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await (sb as any).from('activities').insert([{
      candidate_id: candidateId,
      job_id: jobId || null,
      type,
      content: content || null,
      created_by: user.id,
      created_by_name: user.email?.split('@')[0] || 'Unknown',
    }])

    if (error) {
      console.error('Save activity error:', error)
      showToast('Error saving — check console')
    } else {
      showToast(type === 'note' ? 'Note saved' : `Logged: ${type}`)
      if (type === 'note') setNote('')
    }
    setSaving(false)
  }

  const deleteActivity = async (id: string) => {
    const sb = supabaseRef.current
    const { error } = await (sb as any).from('activities').delete().eq('id', id)
    if (error) {
      showToast('Error deleting')
    } else {
      setActivities((prev) => prev.filter((a) => a.id !== id))
      showToast('Activity deleted')
    }
    setConfirmDelete(null)
  }

  const saveNote = () => {
    if (!note.trim()) return
    logActivity('note', note.trim())
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      note: '📝 Note', called: '📞 Called', voicemail: '📩 Voicemail',
      email: '✉️ Emailed', linkedin: '💼 LinkedIn', text: '💬 Text',
      stage_change: '🔄 Stage Change',
    }
    return map[t] || t
  }

  const initials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Toast */}
      {toast && <div className="toast toast-success">{toast}</div>}

      {/* Quick Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {quickActions.map((qa) => (
          <button
            key={qa.type}
            onClick={() => logActivity(qa.type)}
            disabled={saving}
            className="btn btn-sm"
            style={{ fontSize: 11 }}
          >
            {qa.icon} {qa.label}
          </button>
        ))}
      </div>

      {/* Note input */}
      <div>
        <textarea
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          style={{ resize: 'vertical', fontSize: 12 }}
        />
        <button
          onClick={saveNote}
          disabled={saving || !note.trim()}
          className="btn btn-primary btn-sm"
          style={{ marginTop: 6, width: '100%' }}
        >
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>

      {/* Activity Feed */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activities.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }}>
            No activity yet
          </p>
        )}
        {activities.map((a) => (
          <div key={a.id} style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--card-bg-hover)',
            border: '1px solid var(--border-light)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {/* Avatar */}
              <div className="avatar" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', marginTop: 2 }}>
                {avatars[a.created_by]
                  ? <img src={avatars[a.created_by]} alt="" />
                  : initials(a.created_by_name || 'U')
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {a.created_by_name || 'Unknown'}
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>
                    {typeLabel(a.type)}
                  </span>
                </div>
                {a.content && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {a.content}
                  </p>
                )}
                <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              {/* Delete button */}
              <button
                onClick={() => setConfirmDelete(a.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-tertiary)', padding: '0 4px',
                  opacity: 0.5, transition: 'opacity 0.15s', flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                title="Delete"
              >
                ×
              </button>
            </div>

            {/* Delete confirm */}
            {confirmDelete === a.id && (
              <div style={{
                marginTop: 8, padding: '8px 10px', background: 'var(--danger-bg)',
                borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1 }}>Delete this entry?</span>
                <button onClick={() => deleteActivity(a.id)} className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}>
                  Yes
                </button>
                <button onClick={() => setConfirmDelete(null)} className="btn btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}>
                  No
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
