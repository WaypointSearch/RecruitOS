'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Profile } from '@/types/database'

const STAGES = [
  'Prescreen Scheduled',
  'Prescreen Complete',
  'Resume Received',
  'Candidate Submitted',
  'Interview Requested',
  'Interview Scheduled',
  'Offer Extended',
  'Offer Accepted',
  'Started - Send Invoice',
]

const stageColor = (stage: string) => {
  const idx = STAGES.indexOf(stage)
  if (idx <= 1) return 'text-gray-500'
  if (idx <= 3) return 'text-blue-600'
  if (idx <= 5) return 'text-amber-600'
  if (idx <= 7) return 'text-green-600'
  return 'text-emerald-700'
}

const stageHeaderBg = (stage: string) => {
  const idx = STAGES.indexOf(stage)
  if (idx <= 1) return 'bg-gray-50'
  if (idx <= 3) return 'bg-blue-50'
  if (idx <= 5) return 'bg-amber-50'
  return 'bg-green-50'
}

type Row = {
  id: string
  stage: string
  candidates: {
    id: string
    name: string
    current_title: string | null
    current_company: string | null
  } | null
}

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700'
]

export default function KanbanBoard({
  jobId,
  initialRows,
  currentProfile
}: {
  jobId: string
  initialRows: Row[]
  currentProfile: Profile
}) {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [moving, setMoving] = useState<string | null>(null)

  const supabase = createSupabaseClient()

  const byStage = (stage: string) => rows.filter(r => r.stage === stage)

  async function moveStage(row: Row, direction: 'left' | 'right') {
    const idx = STAGES.indexOf(row.stage)
    const newIdx = direction === 'right' ? idx + 1 : idx - 1

    if (newIdx < 0 || newIdx >= STAGES.length) return

    const newStage = STAGES[newIdx]

    setMoving(row.id)

    setRows(prev =>
      prev.map(r =>
        r.id === row.id ? { ...r, stage: newStage } : r
      )
    )

    await supabase
      .from('pipeline')
      .update({ stage: newStage })
      .eq('id', row.id)

    await supabase
      .from('activities')
      .insert([
        {
          candidate_id: row.candidates!.id,
          job_id: jobId,
          type: 'stage_change',
          content: `Stage moved to: ${newStage}`,
          created_by: currentProfile.id,
          created_by_name: currentProfile.full_name,
        }
      ])

    setMoving(null)
  }

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex gap-3 overflow-x-auto p-4 flex-1 items-start">
      {STAGES.map(stage => {
        const cards = byStage(stage)
        const isLast = stage === STAGES[STAGES.length - 1]

        return (
          <div
            key={stage}
            className="flex-shrink-0 w-48 rounded-xl border border-gray-100 bg-white flex flex-col overflow-hidden"
            style={{ minHeight: 120 }}
          >

            <div className={`px-3 py-2.5 border-b border-gray-100 ${stageHeaderBg(stage)}`}>
              <p className={`text-xs font-semibold leading-tight ${stageColor(stage)}`}>
                {stage}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {cards.length} candidate{cards.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex flex-col gap-2 p-2 flex-1">
              {cards.map((row, i) => {
                if (!row.candidates) return null

                const c = row.candidates
                const stageIdx = STAGES.indexOf(row.stage)

                return (
                  <div
                    key={row.id}
                    className={`bg-gray-50 rounded-lg border border-gray-100 p-2.5 transition-opacity ${moving === row.id ? 'opacity-50' : ''}`}
                  >

                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                        {initials(c.name)}
                      </div>

                      <Link
                        href={`/candidates/${c.id}`}
                        className="text-xs font-medium text-gray-800 hover:text-blue-600 leading-tight"
                      >
                        {c.name}
                      </Link>
                    </div>

                    {c.current_title && (
                      <p className="text-xs text-gray-400 mb-2 leading-tight">
                        {c.current_title}
                      </p>
                    )}

                    <div className="flex items-center gap-1">

                      <button
                        onClick={() => moveStage(row, 'left')}
                        disabled={stageIdx === 0 || moving === row.id}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                        title="Move back"
                      >
                        <ChevronLeft size={12} />
                      </button>

                      <button
                        onClick={() => moveStage(row, 'right')}
                        disabled={stageIdx === STAGES.length - 1 || moving === row.id}
                        className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-700 disabled:opacity-20 transition-colors"
                        title="Move forward"
                      >
                        <ChevronRight size={12} />
                      </button>

                    </div>

                  </div>
                )
              })}

              {isLast && cards.length > 0 && (
                <div className="mt-1 text-center">
                  <span className="text-xs text-emerald-600 font-medium">
                    🎉 Invoice time!
                  </span>
                </div>
              )}

            </div>
          </div>
        )
      })}
    </div>
  )
}