'use client'
import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import type { Activity, Profile } from '@/types/database'

const QUICK_ACTIONS = [
  { label: 'Talked to', type: 'called' as const },
  { label: 'Left voicemail', type: 'voicemail' as const },
  { label: 'Emailed', type: 'emailed' as const },
  { label: 'LinkedIn msg', type: 'linkedin' as const },
  { label: 'Sent text', type: 'texted' as const },
]

const activityIcon: Record<string, string> = {
  note: '📝', called: '📞', voicemail: '📬', emailed: '✉️',
  linkedin: '💼', texted: '💬', stage_change: '🔄', added: '➕'
}

const activityLabel: Record<string, string> = {
  called: 'Talked to candidate',
  voicemail: 'Left voicemail',
  emailed: 'Sent email',
  linkedin: 'Sent LinkedIn message',
  texted: 'Sent text message',
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
  const supabase = createSupabaseClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadActivities()
    // Realtime subscription — all recruiters see updates live
    const channel = supabase
      .channel(`activities-${candidateId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
        filter: `candidate_id=eq.${candidateId}`,
      }, payload => {
        setActivities(prev => [payload.new as Activity, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [candidateId])

  async function loadActivities() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(50)
    setActivities(data ?? [])
  }

  async function logActivity(type: Activity['type'], content?: string) {
    setSaving(true)
    await (supabase.from('activities') as any).insert({
      candidate_id: candidateId,
      type,
      content: content ?? activityLabel[type] ?? type,
      created_by: currentProfile.id,
      created_by_name: currentProfile.full_name,
    })
    setSaving(false)
  }

  async function saveNote() {
    if (!note.trim()) return
    await logActivity('note', note.trim())
    setNote('')
  }

  async function handleQuickAction(type: Activity['type']) {
    await logActivity(type)
  }

  return (
    <div className="card flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Activity & notes</h2>
      </div>

      {/* Quick action buttons */}
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="text-xs text-gray-400 mb-2">Log interaction</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map(({ label, type }) => (
            <button
              key={type}
              onClick={() => handleQuickAction(type)}
              disabled={saving}
              className="px-2.5 py-1 text-xs rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Note input */}
      <div className="px-4 py-3 border-b border-gray-100">
        <textarea
          ref={textareaRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote() }}
          className="input resize-none text-sm"
          rows={3}
          placeholder="Write a note… (Cmd+Enter to save)"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={saveNote}
            disabled={saving || !note.trim()}
            className="btn btn-primary btn-sm"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {activities.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">No activity yet</p>
        )}
        {activities.map(a => (
          <div key={a.id} className="px-4 py-3 flex gap-3">
            <span className="text-base flex-shrink-0 mt-0.5" style={{ fontSize: 14 }}>
              {activityIcon[a.type] ?? '•'}
            </span>
            <div className="flex-1 min-w-0">
              {a.type === 'note'
                ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.content}</p>
                : <p className="text-sm text-gray-600">{a.content}</p>
              }
              <p className="text-xs text-gray-400 mt-1">
                {a.created_by_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
