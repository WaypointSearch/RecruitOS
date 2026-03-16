'use client'
import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import type { Activity, Profile } from '@/types/database'
import { Phone, Mail, Linkedin, MessageSquare, Voicemail, FileText, Send, AlertCircle } from 'lucide-react'

const QUICK_ACTIONS = [
  { label: 'Talked to', type: 'called' as const, content: 'Talked to candidate' },
  { label: 'Voicemail', type: 'voicemail' as const, content: 'Left voicemail' },
  { label: 'Emailed', type: 'emailed' as const, content: 'Sent email' },
  { label: 'LinkedIn', type: 'linkedin' as const, content: 'Sent LinkedIn message' },
  { label: 'Text', type: 'texted' as const, content: 'Sent text message' },
]

const activityIcon: Record<string, any> = {
  note: FileText, called: Phone, voicemail: Voicemail,
  emailed: Mail, linkedin: Linkedin, texted: MessageSquare,
  stage_change: Send, added: FileText,
}

export default function ActivityFeed({
  candidateId,
  currentProfile,
}: {
  candidateId: string
  currentProfile: Profile
}) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Use a ref for supabase to prevent re-creating subscriptions
  const supabaseRef = useRef(createSupabaseClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    async function loadActivities() {
      setLoading(true)
      const { data, error: err } = await (supabase as any)
        .from('activities').select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false }).limit(50)
      if (err) setError('Failed to load: ' + err.message)
      else setActivities(data ?? [])
      setLoading(false)
    }
    loadActivities()

    // Realtime subscription - only update activities list, don't cause full re-render
    const channel = supabase.channel('activities-' + candidateId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'activities',
        filter: 'candidate_id=eq.' + candidateId,
      }, (payload: any) => {
        setActivities(prev => [payload.new as Activity, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [candidateId]) // only re-run if candidateId changes

  async function logActivity(type: Activity['type'], content: string) {
    setSaving(true)
    setError('')
    const { error: err } = await (supabase as any).from('activities').insert([{
      candidate_id: candidateId, type, content,
      created_by: currentProfile.id,
      created_by_name: currentProfile.full_name || currentProfile.email,
    }])
    if (err) setError('Save failed: ' + err.message)
    setSaving(false)
  }

  async function saveNote() {
    const trimmed = note.trim()
    if (!trimmed) return
    await logActivity('note', trimmed)
    setNote('')
  }

  return (
    <div className="mac-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Activity & Notes</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_ACTIONS.map(({ label, type, content }) => (
            <button
              key={type}
              onClick={() => logActivity(type, content)}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', background: 'var(--surface-sunken)',
                color: 'var(--text-3)', border: '1px solid var(--border)',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--green-light)'
                el.style.color = 'var(--green-text)'
                el.style.borderColor = 'var(--green)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--surface-sunken)'
                el.style.color = 'var(--text-3)'
                el.style.borderColor = 'var(--border)'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Note input - isolated to prevent cursor loss */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
          className="input"
          rows={3}
          style={{ resize: 'none', fontSize: 13, lineHeight: 1.5 }}
          placeholder="Write a note... (Cmd+Enter to save)"
        />
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--red-text)', background: 'var(--red-light)', padding: '6px 10px', borderRadius: 6 }}>
            <AlertCircle size={12} />{error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={saveNote} disabled={saving || !note.trim()} className="btn btn-primary btn-sm">
            {saving ? 'Saving...' : 'Save note'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <p style={{ padding: 16, fontSize: 13, color: 'var(--text-4)', textAlign: 'center' }}>Loading...</p>}
        {!loading && activities.length === 0 && (
          <p style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-4)', textAlign: 'center' }}>
            No activity yet. Log an interaction above.
          </p>
        )}
        {activities.map((a: any) => {
          const Icon = activityIcon[a.type] ?? FileText
          return (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <Icon size={13} style={{
                color: a.type === 'note' ? 'var(--accent)' : a.type === 'stage_change' ? 'var(--amber)' : 'var(--green)',
                flexShrink: 0, marginTop: 2
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {a.content}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-3)' }}>{a.created_by_name}</span>
                  {' · '}{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
