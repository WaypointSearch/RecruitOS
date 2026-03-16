'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const STAGES = [
  'Prescreen Scheduled', 'Prescreen Complete', 'Resume Received',
  'Candidate Submitted', 'Interview Requested', 'Interview Scheduled',
  'Offer Extended', 'Offer Accepted', 'Started New Job! Send Invoice',
]

export default function KanbanBoard({ jobId }: { jobId: string }) {
  const sb = useRef(createClientComponentClient()).current
  const [rows, setRows] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [moving, setMoving] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [assigningRecruiter, setAssigningRecruiter] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    const { data } = await (sb as any)
      .from('pipeline')
      .select('*, candidates(*), profiles:recruiter_id(id, full_name, email, avatar_url)')
      .eq('job_id', jobId)
      .order('added_at')
    setRows(data ?? [])
    const { data: u } = await (sb as any).from('profiles').select('id, full_name, email, avatar_url')
    setUsers(u ?? [])
  }

  useEffect(() => { load() }, [jobId])

  const moveStage = async (row: any, direction: number) => {
    const idx = STAGES.indexOf(row.stage)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= STAGES.length) return
    const newStage = STAGES[newIdx]
    setMoving(row.id)
    setRows((prev) => prev.map((r: any) => r.id === row.id ? { ...r, stage: newStage, moved_at: new Date().toISOString() } : r))

    await (sb as any).from('pipeline').update({ stage: newStage, moved_at: new Date().toISOString() }).eq('id', row.id)

    const { data: { user } } = await sb.auth.getUser()
    await (sb as any).from('activities').insert([{
      candidate_id: row.candidates?.id,
      job_id: jobId,
      type: 'stage_change',
      content: `Moved to: ${newStage}`,
      created_by: user?.id,
      created_by_name: user?.email?.split('@')[0],
    }])
    setMoving(null)
    showToast(`→ ${newStage}`)
  }

  const removeFromPipeline = async (id: string) => {
    await (sb as any).from('pipeline').delete().eq('id', id)
    setRows((prev) => prev.filter((r: any) => r.id !== id))
    showToast('Removed from pipeline')
    setConfirmRemove(null)
  }

  const assignRecruiter = async (pipelineId: string, recruiterId: string) => {
    await (sb as any).from('pipeline').update({ recruiter_id: recruiterId || null }).eq('id', pipelineId)
    showToast('Recruiter assigned')
    setAssigningRecruiter(null)
    load()
  }

  const calcCommission = (salary: number | null) => {
    if (!salary) return null
    return Math.round(salary * 0.2)
  }

  const formatMoney = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
    return `$${n}`
  }

  const initials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="kanban-wrapper">
        {STAGES.map((stage) => {
          const stageRows = rows.filter((r: any) => r.stage === stage)
          const totalCommission = stageRows.reduce((sum: number, r: any) => {
            const sal = r.candidates?.current_salary
            return sum + (sal ? Math.round(sal * 0.2) : 0)
          }, 0)

          return (
            <div key={stage} className="kanban-col">
              {/* Column header */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                    {stage}
                  </h3>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{stageRows.length}</span>
                </div>
                {totalCommission > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                    💰 {formatMoney(totalCommission)} potential
                  </p>
                )}
              </div>

              {/* Cards */}
              {stageRows.map((row: any) => {
                const c = row.candidates
                const commission = calcCommission(c?.current_salary)
                const recruiter = row.profiles

                return (
                  <div key={row.id} className="kanban-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {/* Recruiter avatar */}
                      {recruiter ? (
                        <div className="avatar" style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', cursor: 'pointer' }}
                             title={recruiter.full_name || recruiter.email}
                             onClick={() => setAssigningRecruiter(row.id)}>
                          {recruiter.avatar_url
                            ? <img src={recruiter.avatar_url} alt="" />
                            : initials(recruiter.full_name || recruiter.email || '?')
                          }
                        </div>
                      ) : (
                        <div className="avatar" style={{ background: 'var(--card-bg-hover)', color: 'var(--text-tertiary)', cursor: 'pointer', border: '1px dashed var(--border)' }}
                             title="Assign recruiter"
                             onClick={() => setAssigningRecruiter(row.id)}>
                          +
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                          {c?.name || 'Unknown'}
                        </p>
                        {c?.current_title && (
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }} className="truncate">{c.current_title}</p>
                        )}
                        {c?.current_company && (
                          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }} className="truncate">{c.current_company}</p>
                        )}
                      </div>
                    </div>

                    {/* Commission pill */}
                    {commission && (
                      <div style={{
                        marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 100,
                        background: 'linear-gradient(135deg, var(--success-bg), var(--accent-bg))',
                        border: '1px solid var(--border-light)',
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>
                          {formatMoney(commission)} fee
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                          (${(c.current_salary / 1000).toFixed(0)}k × 20%)
                        </span>
                      </div>
                    )}

                    {/* Last moved date */}
                    {row.moved_at && (
                      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        Moved: {new Date(row.moved_at).toLocaleDateString()}
                      </p>
                    )}

                    {/* Recruiter assign dropdown */}
                    {assigningRecruiter === row.id && (
                      <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--card-bg-hover)', borderRadius: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Assign Recruiter</label>
                        <select
                          defaultValue={row.recruiter_id || ''}
                          onChange={(e) => assignRecruiter(row.id, e.target.value)}
                          style={{ marginTop: 4 }}
                        >
                          <option value="">Unassigned</option>
                          {users.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      <button
                        onClick={() => moveStage(row, -1)}
                        disabled={moving === row.id || STAGES.indexOf(row.stage) === 0}
                        className="btn btn-sm"
                        style={{ flex: 1, fontSize: 11, justifyContent: 'center' }}
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => moveStage(row, 1)}
                        disabled={moving === row.id || STAGES.indexOf(row.stage) === STAGES.length - 1}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, fontSize: 11, justifyContent: 'center' }}
                      >
                        Next →
                      </button>
                      <button
                        onClick={() => setConfirmRemove(row.id)}
                        className="btn btn-sm"
                        style={{ fontSize: 11, color: 'var(--danger)', padding: '4px 6px' }}
                        title="Remove from pipeline"
                      >
                        ×
                      </button>
                    </div>

                    {/* Confirm remove */}
                    {confirmRemove === row.id && (
                      <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--danger-bg)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1 }}>Remove from pipeline?</span>
                        <button onClick={() => removeFromPipeline(row.id)} className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>Yes</button>
                        <button onClick={() => setConfirmRemove(null)} className="btn btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>No</button>
                      </div>
                    )}
                  </div>
                )
              })}

              {stageRows.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', padding: 16 }}>Empty</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
