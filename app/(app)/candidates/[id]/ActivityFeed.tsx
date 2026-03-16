'use client'
import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import type { Activity, Profile } from '@/types/database'
import { Phone, Mail, Linkedin, MessageSquare, Voicemail, FileText, Send, AlertCircle, CheckCircle } from 'lucide-react'

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

const iconColor: Record<string, string> = {
  note: 'var(--accent)', stage_change: 'var(--amber)',
  called: 'var(--green)', voicemail: 'var(--green)', emailed: 'var(--green)',
  linkedin: 'var(--green)', texted: 'var(--green)', added: 'var(--text-4)',
}

function UserAvatar({ name, avatarUrl, size = 24 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-text)', fontSize: size * 0.38, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function ActivityFeed({ candidateId, currentProfile }: { candidateId: string; currentProfile: Profile & { avatar_url?: string | null } }) {
  const [activities, setActivities] = useState<(Activity & { profiles?: { avatar_url?: string | null } | null })[]>([])
  const [profileAvatars, setProfileAvatars] = useState<Record<string, string | null>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createSupabaseClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    async function init() {
      setLoading(true)
      // Load activities
      const { data: acts, error: err } = await (supabase as any)
        .from('activities').select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false }).limit(50)
      if (err) { setError('Failed to load: ' + err.message); setLoading(false); return }
      setActivities(acts ?? [])

      // Load avatar urls for all unique creators
      const creatorIds = [...new Set((acts ?? []).map((a: any) => a.created_by).filter(Boolean))]
      if (creatorIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('profiles').select('id, avatar_url').in('id', creatorIds)
        const map: Record<string, string | null> = {}
        ;(profiles ?? []).forEach((p: any) => { map[p.id] = p.avatar_url ?? null })
        setProfileAvatars(map)
      }
      setLoading(false)
    }
    init()

    const channel = supabase.channel('activities-' + candidateId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: 'candidate_id=eq.' + candidateId },
        (payload: any) => setActivities(prev => [payload.new as Activity, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [candidateId])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function logActivity(type: Activity['type'], content: string) {
    setSaving(true); setError('')
    const { error: err } = await (supabase as any).from('activities').insert([{
      candidate_id: candidateId, type, content,
      created_by: currentProfile.id,
      created_by_name: currentProfile.full_name || currentProfile.email,
    }])
    if (err) setError('Save failed: ' + err.message)
    else showToast('Logged: ' + content)
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
        {toast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'var(--green-light)', color: 'var(--green-text)', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
            <CheckCircle size={12} />{toast}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_ACTIONS.map(({ label, type, content }) => (
            <button key={type} onClick={() => logActivity(type, content)} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--surface-sunken)', color: 'var(--text-3)', border: '1px solid var(--border)', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background='var(--green-light)'; el.style.color='var(--green-text)'; el.style.borderColor='var(--green)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background='var(--surface-sunken)'; el.style.color='var(--text-3)'; el.style.borderColor='var(--border)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
          className="input" rows={3} style={{ resize: 'none', fontSize: 13, lineHeight: 1.5 }}
          placeholder="Write a note... (Cmd+Enter to save)" />
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

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <p style={{ padding: 16, fontSize: 13, color: 'var(--text-4)', textAlign: 'center' }}>Loading...</p>}
        {!loading && activities.length === 0 && (
          <p style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-4)', textAlign: 'center' }}>No activity yet.</p>
        )}
        {activities.map((a: any) => {
          const Icon = activityIcon[a.type] ?? FileText
          const avatarUrl = a.created_by ? profileAvatars[a.created_by] : null
          return (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              {/* User avatar */}
              <UserAvatar name={a.created_by_name || '?'} avatarUrl={avatarUrl} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Icon size={12} style={{ color: iconColor[a.type] ?? 'var(--text-4)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{a.created_by_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.content}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
