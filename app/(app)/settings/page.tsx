import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserManagement from './UserManagement'
import DuplicateDetector from './DuplicateDetector'

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: users } = await (supabase as any).from('profiles').select('*').order('created_at')

  return (
    <div style={{ padding: '20px 24px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 24 }}>Manage team access and data tools. Admin only.</p>

      <UserManagement users={users ?? []} currentUserId={session.user.id} />

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
          Data Tools
        </div>
        <DuplicateDetector />
      </div>
    </div>
  )
}
