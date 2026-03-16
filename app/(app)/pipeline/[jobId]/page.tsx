'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import KanbanBoard from './KanbanBoard'

export default function PipelinePage() {
  const params = useParams()
  const jobId = params.jobId as string
  const router = useRouter()
  const sb = useRef(createClientComponentClient()).current

  const [job, setJob] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    ;(async () => {
      const { data } = await (sb as any).from('jobs').select('*, companies(name)').eq('id', jobId).single()
      setJob(data)
    })()
  }, [jobId])

  const searchCandidates = async () => {
    if (!search.trim()) { setResults([]); return }
    const q = search.trim().toLowerCase()
    const { data } = await (sb as any)
      .from('candidates')
      .select('id, name, current_title, current_company, location, current_salary')
      .or(`name.ilike.%${q}%,current_title.ilike.%${q}%,current_company.ilike.%${q}%,location.ilike.%${q}%`)
      .limit(20)
    setResults(data ?? [])
  }

  const assignCandidate = async (candidateId: string) => {
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await (sb as any).from('pipeline').insert([{
      candidate_id: candidateId,
      job_id: jobId,
      stage: 'Prescreen Scheduled',
      added_by: user?.id,
      recruiter_id: user?.id,
      moved_at: new Date().toISOString(),
    }])
    if (error) {
      if (error.code === '23505') showToast('Already in pipeline')
      else showToast('Error: ' + error.message)
    } else {
      showToast('Candidate added to pipeline')
      setSearch('')
      setResults([])
      setRefresh((p) => p + 1)
    }
  }

  if (!job) return <div className="main-content"><p>Loading...</p></div>

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href="/jobs" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Jobs</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{job.title}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {job.companies?.name} {job.location && `· ${job.location}`}
            {job.salary_min && job.salary_max && ` · $${(job.salary_min/1000).toFixed(0)}k–$${(job.salary_max/1000).toFixed(0)}k`}
          </p>
        </div>
        <span className={`badge ${job.status === 'Active' ? 'badge-green' : 'badge-yellow'}`}>{job.status}</span>
      </div>

      {/* Search & Assign */}
      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search candidates to add to pipeline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCandidates()}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button onClick={searchCandidates} className="btn btn-primary btn-sm">Search</button>
        </div>

        {results.length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
            {results.map((c: any) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                borderRadius: 6, cursor: 'pointer', transition: 'background 0.1s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {c.current_title} {c.current_company && `@ ${c.current_company}`}
                    {c.location && ` · ${c.location}`}
                    {c.current_salary && ` · $${(c.current_salary/1000).toFixed(0)}k`}
                  </p>
                </div>
                <button onClick={() => assignCandidate(c.id)} className="btn btn-sm btn-primary" style={{ fontSize: 11 }}>
                  + Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban */}
      <KanbanBoard key={refresh} jobId={jobId} />
    </div>
  )
}
