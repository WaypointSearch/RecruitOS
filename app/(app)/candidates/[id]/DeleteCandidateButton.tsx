'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DeleteCandidateButton({ candidateId, candidateName, onDeleted }: { candidateId: string; candidateName: string; onDeleted: () => void }) {
  const sb = useRef(createClientComponentClient()).current
  const [confirming, setConfirming] = useState(false)

  const handleDelete = async () => {
    await (sb as any).from('candidates').delete().eq('id', candidateId)
    onDeleted()
  }

  if (confirming) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setConfirming(false)}>
        <div className="confirm-dialog">
          <h3>Delete Candidate?</h3>
          <p>Are you sure you want to delete {candidateName}? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={handleDelete} className="btn btn-danger">Yes, Delete</button>
            <button onClick={() => setConfirming(false)} className="btn">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn btn-sm" style={{ color: 'var(--danger)' }}>
      🗑 Delete
    </button>
  )
}
