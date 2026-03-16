'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react'
import type { Profile } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

const STAGES = [
  'Prescreen Scheduled','Prescreen Complete','Resume Received','Candidate Submitted',
  'Interview Requested','Interview Scheduled','Offer Extended','Offer Accepted','Started - Send Invoice',
]

const stageAccent = (stage: string) => {
  const i = STAGES.indexOf(stage)
  if (i <= 1) return 'var(--text-4)'
  if (i <= 3) return 'var(--accent)'
  if (i <= 5) return 'var(--amber)'
  return 'var(--green)'
}
const stageBg = (stage: string) => {
  const i = STAGES.indexOf(stage)
  if (i <= 1) return 'var(--surface-sunken)'
  if (i <= 3) return 'var(--accent-light)'
  if (i <= 5) return 'var(--amber-light)'
  return 'var(--green-light)'
}
const fmt = (n: number) => '$' + (n / 1000).toFixed(0) + 'K'
const avColors = [['#e8f0fb','#0058b0'],['#eafaf0','#1a7a35'],['#fff5e0','#7d4800'],['#f3effe','#5c2d91'],['#fce8e8','#9b1a14']]

type Row = { id: string; stage: string; last_moved_at: string | null; candidates: { id: string; name: string; current_title: string | null; current_salary: number | null } | null }

export default function KanbanBoard({ jobId, initialRows, currentProfile }: { jobId: string; initialRows: Row[]; currentProfile: Profile }) {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [moving, setMoving] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  const byStage = (stage: string) => rows.filter(r => r.stage === stage)

  const stageTotal = (stage: string) => {
    const total = byStage(stage).reduce((sum, r) => sum + (r.candidates?.current_salary ? Math.round(r.candidates.current_salary * 0.2) : 0), 0)
    return total > 0 ? total : null
  }

  async function moveStage(row: Row, dir: 'left' | 'right') {
    const idx = STAGES.indexOf(row.stage)
    const newIdx = dir === 'right' ? idx + 1 : idx - 1
    if (newIdx < 0 || newIdx >= STAGES.length) return
    const newStage = STAGES[newIdx]
    const now = new Date().toISOString()
    setMoving(row.id)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, stage: newStage, last_moved_at: now } : r))
    await (supabase as any).from('pipeline').update({ stage: newStage, last_moved_at: now }).eq('id', row.id)
    await (supabase as any).from('activities').insert([{
      candidate_id: row.candidates!.id, job_id: jobId, type: 'stage_change',
      content: 'Stage moved to: ' + newStage,
      created_by: currentProfile.id, created_by_name: currentProfile.full_name,
    }])
    setMoving(null)
  }

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '12px 16px', flex: 1, alignItems: 'flex-start' }}>
      {STAGES.map(stage => {
        const cards = byStage(stage)
        const total = stageTotal(stage)
        const isLast = stage === STAGES[STAGES.length - 1]
        return (
          <div key={stage} style={{ flexShrink: 0, width: 192, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '10px 12px 8px', background: stageBg(stage), borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: stageAccent(stage), textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>{stage}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>{cards.length} candidate{cards.length !== 1 ? 's' : ''}</span>
                {total && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: 'var(--green-text)', background: 'var(--green-light)', padding: '1px 6px', borderRadius: 100 }}><DollarSign size={9} />{fmt(total)}</span>}
              </div>
            </div>
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
              {cards.map((row, i) => {
                if (!row.candidates) return null
                const c = row.candidates
                const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null
                const stageIdx = STAGES.indexOf(row.stage)
                const [avBg, avFg] = avColors[i % avColors.length]
                return (
                  <div key={row.id} className="kanban-card" style={{ opacity: moving === row.id ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: avBg, color: avFg, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(c.name)}</div>
                      <Link href={'/candidates/' + c.id} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</Link>
                    </div>
                    {c.current_title && <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.current_title}</p>}
                    {commission && (
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green-text)', border: '1px solid rgba(52,199,89,0.2)' }}>
                          <DollarSign size={8} />{fmt(commission)} fee
                        </span>
                      </div>
                    )}
                    {row.last_moved_at && <p style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4 }}>Moved {formatDistanceToNow(new Date(row.last_moved_at), { addSuffix: true })}</p>}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => moveStage(row, 'left')} disabled={stageIdx === 0 || moving === row.id}
                        style={{ flex: 1, padding: '3px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-sunken)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', transition: 'all 0.1s' }}>
                        <ChevronLeft size={12} />
                      </button>
                      <button onClick={() => moveStage(row, 'right')} disabled={stageIdx === STAGES.length - 1 || moving === row.id}
                        style={{ flex: 1, padding: '3px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--accent-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', transition: 'all 0.1s' }}>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                    {isLast && <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, fontWeight: 600, color: 'var(--green-text)' }}>Send invoice!</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
