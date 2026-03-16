'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ResumeUpload({ candidateId, currentUrl, currentName, onUploaded }: {
  candidateId: string
  currentUrl?: string | null
  currentName?: string | null
  onUploaded: () => void
}) {
  const sb = useRef(createClientComponentClient()).current
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and Word documents are accepted')
      return
    }
    if (file.size > maxSize) {
      setError('File must be under 10MB')
      return
    }

    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${candidateId}/${Date.now()}.${ext}`

    const { error: uploadErr } = await sb.storage.from('resumes').upload(path, file)
    if (uploadErr) {
      setError('Upload failed: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = sb.storage.from('resumes').getPublicUrl(path)

    await (sb as any).from('candidates').update({
      resume_url: publicUrl,
      resume_name: file.name,
    }).eq('id', candidateId)

    setUploading(false)
    onUploaded()
  }

  const removeResume = async () => {
    await (sb as any).from('candidates').update({
      resume_url: null,
      resume_name: null,
    }).eq('id', candidateId)
    onUploaded()
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Resume</h3>

      {currentUrl ? (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: 'var(--accent-bg)', borderRadius: 8, marginBottom: 8,
          }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                {currentName || 'Resume'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {currentName?.endsWith('.pdf') ? 'PDF' : 'Document'}
              </p>
            </div>
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-primary"
              style={{ textDecoration: 'none', fontSize: 11 }}
            >
              View
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn btn-sm"
              style={{ flex: 1 }}
            >
              Replace
            </button>
            <button
              onClick={removeResume}
              className="btn btn-sm"
              style={{ color: 'var(--danger)' }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 10,
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: uploading ? 'var(--accent-bg)' : 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
        >
          <p style={{ fontSize: 24, marginBottom: 4 }}>📎</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            PDF or Word, max 10MB
          </p>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6 }}>{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={upload}
        style={{ display: 'none' }}
      />
    </div>
  )
}
