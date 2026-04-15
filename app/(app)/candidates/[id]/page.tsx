'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ActivityFeed from './ActivityFeed'
import EditCandidateModal from './EditCandidateModal'
import DeleteCandidateButton from './DeleteCandidateButton'
import ResumeUpload from './ResumeUpload'

export default function CandidateDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const sb = useRef(createClientComponentClient()).current
  const [candidate, setCandidate] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [pipeline, setPipeline] = useState<any[]>([])

  const load = async () => {
    const { data } = await (sb as any).from('candidates').select('*').eq('id', id).single()
    setCandidate(data)
    const { data: p } = await (sb as any).from('pipeline').select('*, jobs(title, companies(name))').eq('candidate_id', id)
    setPipeline(p ?? [])
  }

  useEffect(() => { load() }, [id])

  if (!candidate) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>

  const commission = candidate.current_salary ? Math.round(candidate.current_salary * 0.2) : null

  // Contact fields: Work Phone | Cell Phone, Work Email | Personal Email, LinkedIn | Company URL
  const contactFields = [
    ['Work Phone', candidate.work_phone, 'tel:'],
    ['Cell Phone', candidate.cell_phone || candidate.phone, 'tel:'],
    ['Work Email', candidate.work_email, 'mailto:'],
    ['Personal Email', candidate.personal_email || candidate.email, 'mailto:'],
    ['LinkedIn', candidate.linkedin, ''],
    ['Company URL', candidate.current_company_url, ''],
  ]

  const fields = [
    ['Current Title', candidate.current_title],
    ['Current Company', candidate.current_company],
    ['Location', candidate.location],
    ['Metro Area', candidate.metro_area],
    ['Time in Role', candidate.time_in_current_role],
    ['Current Salary', candidate.current_salary ? `$${candidate.current_salary.toLocaleString()}` : null],
    ['Potential Fee (20%)', commission ? `$${commission.toLocaleString()}` : null],
    ['Previous Title', candidate.previous_title],
    ['Previous Company', candidate.previous_company],
    ['Previous Dates', candidate.previous_dates],
  ]

  return (
    <div style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => router.back()} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Back</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>{candidate.name}</h1>
        {candidate.disciplines?.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {candidate.disciplines.map((d: string) => <span key={d} className="badge badge-blue">{d}</span>)}
          </div>
        )}
        <button onClick={() => setEditing(true)} className="btn btn-sm">✏️ Edit</button>
        <DeleteCandidateButton candidateId={id} candidateName={candidate.name} onDeleted={() => router.push('/candidates')} />
      </div>

      {editing && <EditCandidateModal candidate={candidate} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}

      <div className="candidate-profile-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {/* Commission banner */}
          {commission && (
            <div className="card" style={{ padding: '12px 16px', background: 'linear-gradient(135deg, var(--success-bg), var(--accent-bg))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>💰 ${commission.toLocaleString()} potential fee</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>${candidate.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Contact Info</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {contactFields.map(([label, val, prefix]) => (
                <div key={label as string}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</p>
                  {val ? <a href={`${prefix}${val}`} target={prefix === '' ? '_blank' : undefined} rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>{val as string}</a>
                    : <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Professional Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {fields.map(([label, val]) => (
                <div key={label as string}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: 13, color: val ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: (label as string).includes('Fee') ? 700 : 400 }}>{(val as string) || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <ResumeUpload candidateId={id} currentUrl={candidate.resume_url} currentName={candidate.resume_name} onUploaded={load} />

          {candidate.tags?.length > 0 && (
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {candidate.tags.map((t: string) => <span key={t} className="badge badge-gray">{t}</span>)}
              </div>
            </div>
          )}

          {pipeline.length > 0 && (
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pipeline</h3>
              {pipeline.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span className="badge badge-blue">{p.stage}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.jobs?.title} @ {p.jobs?.companies?.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 12, position: 'sticky', top: 16, maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Activity</h3>
          <div style={{ flex: 1, minHeight: 0 }}><ActivityFeed candidateId={id} /></div>
        </div>
      </div>
    </div>
  )
}
