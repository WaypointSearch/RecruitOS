'use client'
import { useState } from 'react'
import type { Profile } from '@/types/database'
import { useRouter } from 'next/navigation'
import { UserPlus, Lock, Unlock, Shield, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function UserManagement({
  users, currentUserId
}: {
  users: Profile[]
  currentUserId: string
}) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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
      setInviteMsg(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      router.refresh()
    } else {
      setInviteMsg(`Error: ${data.error}`)
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

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Invite a recruiter</h2>
        <form onSubmit={invite} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">Email address</label>
            <input className="input" type="email" required value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)} placeholder="recruiter@yourteam.com" />
          </div>
          <div className="w-32">
            <label className="label">Role</label>
            <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={inviting} className="btn btn-primary gap-1.5 flex-shrink-0">
            <UserPlus size={14} />{inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {inviteMsg && (
          <p className={`text-sm mt-3 ${inviteMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {inviteMsg}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-3">
          They'll receive an email with a link to set their password and log in.
          <br />Users cannot export data. Only admins can invite or lock users.
        </p>
      </div>

      {/* User list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Team members ({users.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0
                ${u.is_locked ? 'bg-red-100 text-red-400' : 'bg-blue-100 text-blue-700'}`}>
                {initials(u.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">
                    {u.full_name || '(no name yet)'}
                    {u.id === currentUserId && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                  </p>
                  <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                    {u.role}
                  </span>
                  {u.is_locked && <span className="badge badge-red">Locked</span>}
                </div>
                <p className="text-xs text-gray-400">{u.email} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</p>
              </div>

              {u.id !== currentUserId && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle role */}
                  <button
                    onClick={() => toggleRole(u)}
                    disabled={actionLoading === u.id + '-role'}
                    className="btn btn-sm gap-1.5"
                    title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}>
                    {u.role === 'admin' ? <User size={12} /> : <Shield size={12} />}
                    {u.role === 'admin' ? 'Make user' : 'Make admin'}
                  </button>
                  {/* Toggle lock */}
                  <button
                    onClick={() => toggleLock(u)}
                    disabled={actionLoading === u.id}
                    className={`btn btn-sm gap-1.5 ${u.is_locked ? '' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                    title={u.is_locked ? 'Unlock account' : 'Lock account'}>
                    {u.is_locked ? <Unlock size={12} /> : <Lock size={12} />}
                    {u.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export note */}
      <div className="card p-4 border-amber-100 bg-amber-50">
        <p className="text-xs text-amber-700">
          <strong>Export access:</strong> Only admins can export data. User-role accounts have no export capability.
          To export your full database, log in to your Supabase dashboard → Table Editor → export any table as CSV.
        </p>
      </div>
    </div>
  )
}
