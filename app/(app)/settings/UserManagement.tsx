'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { useRouter } from 'next/navigation'
import { UserPlus, Lock, Unlock, Shield, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import AvatarUpload from './AvatarUpload'

function Avatar({ profile, size = 32 }: { profile: Profile & { avatar_url?: string | null }; size?: number }) {
  const initials = (profile.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: profile.is_locked ? 'var(--red-light)' : 'var(--accent-light)', color: profile.is_locked ? 'var(--red-text)' : 'var(--accent-text)', fontSize: size * 0.36, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function UserManagement({ users, currentUserId }: { users: (Profile & { avatar_url?: string | null })[]; currentUserId: string }) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [localUsers, setLocalUsers] = useState(users)
  const router = useRouter()

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg('')
    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteMsg('Invite sent to ' + inviteEmail)
      setInviteEmail('')
      router.refresh()
    } else {
      setInviteMsg('Error: ' + data.error)
    }
    setInviting(false)
  }

  async function toggleLock(user: Profile) {
    setActionLoading(user.id)
    await fetch('/api/users/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, locked: !user.is_locked }),
    })
    setActionLoading(null)
    router.refresh()
  }

  async function toggleRole(user: Profile) {
    setActionLoading(user.id + '-role')
    await fetch('/api/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' }),
    })
    setActionLoading(null)
    router.refresh()
  }

  function handleAvatarUpdated(userId: string, url: string) {
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar_url: url } : u))
  }

  const currentUser = localUsers.find(u => u.id === currentUserId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* My profile section */}
      {currentUser && (
        <div className="mac-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>My Profile</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <AvatarUpload
              userId={currentUser.id}
              currentUrl={currentUser.avatar_url ?? null}
              name={currentUser.full_name}
              onUpdated={url => handleAvatarUpdated(currentUser.id, url)}
            />
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{currentUser.full_name || currentUser.email}</p>
              <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 2 }}>{currentUser.email}</p>
              <span className={'badge ' + (currentUser.role === 'admin' ? 'badge-blue' : 'badge-gray')} style={{ marginTop: 6, display: 'inline-flex' }}>{currentUser.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Invite form */}
      <div className="mac-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Invite a recruiter</h2>
        <form onSubmit={invite} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Email address</label>
            <input className="input" type="email" required value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)} placeholder="recruiter@yourteam.com" />
          </div>
          <div style={{ width: 120 }}>
            <label className="label">Role</label>
            <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={inviting} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <UserPlus size={14} />{inviting ? 'Sending...' : 'Send invite'}
          </button>
        </form>
        {inviteMsg && (
          <p style={{ fontSize: 13, marginTop: 10, color: inviteMsg.startsWith('Error') ? 'var(--red-text)' : 'var(--green-text)' }}>
            {inviteMsg}
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 10, lineHeight: 1.5 }}>
          They'll receive an email with a login link. Users cannot export data or manage team members.
        </p>
      </div>

      {/* Team list */}
      <div className="mac-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Team members ({localUsers.length})
        </div>
        {localUsers.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <Avatar profile={u} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {u.full_name || '(no name yet)'}
                  {u.id === currentUserId && <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6 }}>(you)</span>}
                </p>
                <span className={'badge ' + (u.role === 'admin' ? 'badge-blue' : 'badge-gray')}>{u.role}</span>
                {u.is_locked && <span className="badge badge-red">Locked</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
                {u.email} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
              </p>
            </div>
            {u.id !== currentUserId && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleRole(u)} disabled={actionLoading === u.id + '-role'} className="btn btn-sm"
                  title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {u.role === 'admin' ? <User size={12} /> : <Shield size={12} />}
                  {u.role === 'admin' ? 'Make user' : 'Make admin'}
                </button>
                <button onClick={() => toggleLock(u)} disabled={actionLoading === u.id} className="btn btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: u.is_locked ? undefined : 'var(--red-text)', borderColor: u.is_locked ? undefined : 'var(--red-light)', background: u.is_locked ? undefined : 'var(--red-light)' }}>
                  {u.is_locked ? <Unlock size={12} /> : <Lock size={12} />}
                  {u.is_locked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--amber-light)', borderRadius: 10, fontSize: 12, color: 'var(--amber-text)', lineHeight: 1.6 }}>
        <strong>Export access:</strong> Only admins can export data via the Supabase dashboard.
        To export: Supabase → Table Editor → select table → Export as CSV.
      </div>
    </div>
  )
}
