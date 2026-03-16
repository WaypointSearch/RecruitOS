'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, X, AlertTriangle } from 'lucide-react'

export default function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  async function doDelete() {
    setLoading(true)
    await (supabase as any).from('candidates').delete().eq('id', candidateId)
    setLoading(false)
    router.push('/candidates')
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}
        style={{ color: 'var(--red-text)', borderColor: 'transparent', background: 'var(--red-light)' }}>
        <Trash2 size={12} />
      </button>
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <div className="modal-box">
            <div className="modal-content" style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-text)' }}>
                  <AlertTriangle size={16} /><span style={{ fontSize: 15, fontWeight: 600 }}>Delete candidate?</span>
                </div>
                <button onClick={() => setOpen(false)} className="btn btn-sm"><X size={14} /></button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  This permanently deletes all their activity, notes, and pipeline assignments.{' '}
                  <strong style={{ color: 'var(--red-text)' }}>This cannot be undone.</strong>
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={doDelete} disabled={loading}>
                  <Trash2 size={13} />{loading ? 'Deleting...' : 'Yes, delete candidate'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
