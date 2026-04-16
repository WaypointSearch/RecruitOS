'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ActivityFeed from './ActivityFeed'
import EditCandidateModal from './EditCandidateModal'
import DeleteCandidateButton from './DeleteCandidateButton'
import ResumeUpload from './ResumeUpload'
import FollowUpList from '@/components/followups/FollowUpList'

export default function CandidateDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const sb = useRef(createClientComponentClient()).current
  const [candidate, setCandidate] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarFocused, setAvatarFocused] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const load = async () => {
    const { data } = await (sb as any).from('candidates').select('*').eq('id', id).single()
    setCandidate(data)
    const { data: p } = await (sb as any).from('pipeline').select('*, jobs(title, companies(name))').eq('candidate_id', id)
    setPipeline(p ?? [])
  }

  useEffect(() => { load() }, [id])

  // Avatar paste
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!avatarFocused) return
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        setUploadingAvatar(true)
        const blob = items[i].getAsFile()
        if (!blob) { setUploadingAvatar(false); return }
        const ext = blob.type.split('/')[1] || 'png'
        const path = id + '/avatar-' + Date.now() + '.' + ext
        const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert: true })
        if (error) { showToast('Upload failed'); setUploadingAvatar(false); return }
        const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path)
        await (sb as any).from('candidates').update({ avatar_url: publicUrl }).eq('id', id)
        setCandidate((prev: any) => ({ ...prev, avatar_url: publicUrl }))
        showToast('Avatar saved!')
        setUploadingAvatar(false)
        return
      }
    }
  }, [avatarFocused, id, sb])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  if (!candidate) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>

  const c = candidate
  const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null
  const initials = c.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div style={{ maxWidth: '100%' }}>
      {toast && <div className="toast toast-success">{toast}</div>}
      {editing && <EditCandidateModal candidate={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => router.back()} style={{ fontSize: 14, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing(true)} className="btn btn-sm">✏️ Edit</button>
        <DeleteCandidateButton candidateId={id} candidateName={c.name} onDeleted={() => router.push('/candidates')} />
      </div>

      <div className="candidate-profile-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Hero card — centered avatar */}
          <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div
              tabIndex={0}
              onClick={e => e.currentTarget.focus()}
              onFocus={() => setAvatarFocused(true)}
              onBlur={() => setAvatarFocused(false)}
              title="Click, then Ctrl+V to paste photo"
              style={{ width: 192, height: 192, borderRadius: '50%', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 700, overflow: 'hidden', cursor: 'pointer', border: avatarFocused ? '3px solid var(--neon-green)' : '3px solid var(--accent)', background: c.avatar_url ? 'transparent' : 'var(--accent)', color: 'white', transition: 'all 0.25s', outline: 'none', boxShadow: avatarFocused ? '0 0 20px var(--neon-green)' : 'none' }}
            >
              {uploadingAvatar ? '⏳' : c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            {avatarFocused && <p style={{ fontSize: 11, color: 'var(--neon-green)', marginBottom: 6, fontWeight: 600 }}>Ready — paste image (Ctrl+V)</p>}
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{c.name}</h1>
            {c.current_title && <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>{c.current_title}{c.current_company ? ` at ${c.current_company}` : ''}</p>}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {c.state && <span className="panel-pill-glow" style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>{c.state}</span>}
              {(c.disciplines ?? []).map((d: string) => <span key={d} className="panel-pill-glow" style={{ padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600, color: 'var(--neon-green)', background: 'var(--success-bg)', border: '1px solid var(--neon-green)' }}>{d}</span>)}
            </div>
          </div>

          {/* Commission banner */}
          {commission && (
            <div className="commission-banner">
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--neon-green)' }}>💰 ${commission.toLocaleString()} potential fee</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>${c.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          {/* Contact */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[['Work Phone', c.work_phone, 'tel:'], ['Cell Phone', c.cell_phone || c.phone, 'tel:'], ['Work Email', c.work_email, 'mailto:'], ['Personal Email', c.personal_email || c.email, 'mailto:'], ['LinkedIn', c.linkedin, ''], ['Company URL', c.current_company_url, '']].map(([label, val, prefix]) => (
                <div key={label as string}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</p>
                  {val ? <a href={`${prefix}${val}`} target={prefix === '' ? '_blank' : undefined} rel="noreferrer" style={{ fontSize: 14, color: 'var(--accent)', wordBreak: 'break-all', textDecoration: 'none' }}>{(val as string).length > 40 ? (val as string).slice(0, 38) + '…' : val as string}</a>
                    : <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>—</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Professional */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[['Location', c.location], ['Metro', c.metro_area], ['Time in Role', c.time_in_current_role], ['Salary', c.current_salary ? `$${c.current_salary.toLocaleString()}` : null], ['Previous Title', c.previous_title], ['Previous Company', c.previous_company], ['Previous Dates', c.previous_dates]].map(([label, val]) => (
                <div key={label as string}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 14, color: val ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: (label as string) === 'Salary' ? 600 : 400 }}>{(val as string) || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <ResumeUpload candidateId={id} currentUrl={c.resume_url} currentName={c.resume_name} onUploaded={load} />

          {c.tags?.length > 0 && (
            <div className="card" style={{ padding: '16px 18px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{c.tags.map((t: string) => <span key={t} className="badge badge-gray" style={{ fontSize: 12 }}>{t}</span>)}</div>
            </div>
          )}

          {/* Follow-Ups */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <FollowUpList candidateId={id} />
          </div>

          {pipeline.length > 0 && (
            <div className="card" style={{ padding: '16px 18px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matched Jobs</h3>
              {pipeline.map((p: any) => (
                <Link key={p.id} href={`/pipeline/${p.job_id || p.jobs?.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 14 }}>🎯</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{p.jobs?.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.jobs?.companies?.name} · {p.stage}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column — Activity */}
        <div className="card" style={{ padding: '16px', position: 'sticky', top: 16, maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity</h3>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}><ActivityFeed candidateId={id} /></div>
        </div>
      </div>
    </div>
  )
}
