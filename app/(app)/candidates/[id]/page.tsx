import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, DollarSign, Briefcase, Mail, Phone, Globe, Linkedin } from 'lucide-react'
import ActivityFeed from './ActivityFeed'
import AssignJobModal from './AssignJobModal'
import EditCandidateModal from './EditCandidateModal'
import DeleteCandidateButton from './DeleteCandidateButton'

export default async function CandidateProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const [{ data: candidate }, { data: pipeline }, { data: jobs }, { data: { session } }] = await Promise.all([
    (supabase as any).from('candidates').select('*').eq('id', params.id).single(),
    (supabase as any).from('pipeline').select('*, jobs(id, title, status, companies(name))').eq('candidate_id', params.id).order('added_at', { ascending: false }),
    (supabase as any).from('jobs').select('id, title, companies(name)').eq('status', 'Active'),
    supabase.auth.getSession(),
  ])
  if (!candidate) notFound()
  const { data: profile } = await (supabase as any).from('profiles').select('*').eq('id', session!.user.id).single()

  const initials = candidate.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const fmt = (n: number) => '$' + (n / 1000).toFixed(0) + 'K'
  const commission = candidate.current_salary ? Math.round(candidate.current_salary * 0.20) : null

  const stageColor = (s: string) => {
    if (['Offer Accepted', 'Started - Send Invoice'].includes(s)) return 'badge-green'
    if (s === 'Offer Extended') return 'badge-blue'
    if (['Interview Scheduled', 'Interview Requested'].includes(s)) return 'badge-amber'
    return 'badge-gray'
  }

  const InfoRow = ({ icon: Icon, label, value, href }: any) => {
    if (!value) return null
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
        <Icon size={13} style={{ color: 'var(--text-4)', marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
          {href
            ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>{value}</a>
            : <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
          }
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px', maxWidth: '100%' }}>
      <Link href="/candidates" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to candidates
      </Link>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="mac-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-text)', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>{candidate.name}</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                  {candidate.current_title}{candidate.current_company ? ' · ' + candidate.current_company : ''}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {candidate.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}><MapPin size={11} />{candidate.location}</span>}
                  {commission && <span className="commission-pill"><DollarSign size={10} />{fmt(commission)} potential fee</span>}
                  {(candidate.tags ?? []).map((t: string) => <span key={t} className="badge badge-gray">{t}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <EditCandidateModal candidate={candidate} />
                <AssignJobModal candidateId={candidate.id} jobs={jobs ?? []} currentProfile={profile} />
                <DeleteCandidateButton candidateId={candidate.id} />
              </div>
            </div>
          </div>

          <div className="mac-card" style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div>
                <div className="section-title">Contact</div>
                <InfoRow icon={Mail} label="Work email" value={candidate.work_email} href={'mailto:' + candidate.work_email} />
                <InfoRow icon={Mail} label="Personal email" value={candidate.personal_email} href={'mailto:' + candidate.personal_email} />
                <InfoRow icon={Mail} label="Email" value={candidate.email} href={'mailto:' + candidate.email} />
                <InfoRow icon={Phone} label="Work phone" value={candidate.work_phone} />
                <InfoRow icon={Phone} label="Cell phone" value={candidate.cell_phone} />
                <InfoRow icon={Phone} label="Phone" value={candidate.phone} />
                <InfoRow icon={Linkedin} label="LinkedIn" value={candidate.linkedin} href={candidate.linkedin} />
              </div>
              <div>
                <div className="section-title">Background</div>
                <InfoRow icon={Briefcase} label="Current title" value={candidate.current_title} />
                <InfoRow icon={Briefcase} label="Current company" value={candidate.current_company} />
                <InfoRow icon={Globe} label="Company URL" value={candidate.current_company_url} href={candidate.current_company_url} />
                <InfoRow icon={Briefcase} label="Time in role" value={candidate.time_in_current_role} />
                <InfoRow icon={Briefcase} label="Previous title" value={candidate.previous_title} />
                <InfoRow icon={Briefcase} label="Previous company" value={candidate.previous_company} />
                <InfoRow icon={Briefcase} label="Previous dates" value={candidate.previous_dates} />
                <InfoRow icon={DollarSign} label="Current salary" value={candidate.current_salary ? '$' + candidate.current_salary.toLocaleString() : null} />
                <InfoRow icon={MapPin} label="Location" value={candidate.location} />
              </div>
            </div>
          </div>

          <div className="mac-card" style={{ padding: 16 }}>
            <div className="section-title">Pipeline ({(pipeline ?? []).length})</div>
            {(pipeline ?? []).length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Not assigned to any jobs yet.</p>
              : (pipeline ?? []).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <Link href={'/pipeline/' + p.jobs?.id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>{(p.jobs as any)?.title}</Link>
                    <p style={{ fontSize: 12, color: 'var(--text-4)' }}>{(p.jobs as any)?.companies?.name}</p>
                  </div>
                  <span className={'badge ' + stageColor(p.stage)}>{p.stage}</span>
                </div>
              ))
            }
          </div>
        </div>
        <ActivityFeed candidateId={candidate.id} currentProfile={profile} />
      </div>
    </div>
  )
}
