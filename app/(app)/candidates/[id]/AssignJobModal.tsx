'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import type { Profile } from '@/types/database'

const STAGES = [
  'Prescreen Scheduled', 'Prescreen Complete', 'Resume Received',
  'Candidate Submitted', 'Interview Requested', 'Interview Scheduled',
  'Offer Extended', 'Offer Accepted', 'Started - Send Invoice',
]

export default function AssignJobModal({
  candidateId,
  jobs,
  currentProfile,
}: {
  candidateId: string
  jobs: { id: string; title: string; companies: any }[]
  currentProfile: Profile
}) {
  const [open, setOpen] = useState(false)
  const [jobId, setJobId] = useState('')
  const [stage, setStage] = useState('Prescreen Scheduled')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createSupabaseClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobId) { setError('Please select a job'); return }
    setLoading(true)
    const { error: err } = await (supabase.from('pipeline') as any).insert({
      candidate_id: candidateId,
      job_id: jobId,
      stage,
      added_by: currentProfile.id,
    })
    if (err) {
      setError(err.code === '23505' ? 'Already assigned to this job.' : err.message)
      setLoading(false)
      return
    }
    // Log activity
    const job = jobs.find(j => j.id === jobId)
    await (supabase.from('activities') as any).insert({
      candidate_id: candidateId,
      job_id: jobId,
      type: 'stage_change',
      content: `Added to pipeline: ${job?.title} (${stage})`,
      created_by: currentProfile.id,
      created_by_name: currentProfile.full_name,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button className="btn btn-sm gap-1.5 flex-shrink-0" onClick={() => setOpen(true)}>
      <Plus size={13} />Assign to job
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Assign to job pipeline</h2>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div>
              <label className="label">Job order *</label>
              <select className="input" value={jobId} onChange={e => setJobId(e.target.value)} required>
                <option value="">Select a job…</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} — {j.companies?.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Initial stage</label>
              <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving…' : 'Add to pipeline'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
