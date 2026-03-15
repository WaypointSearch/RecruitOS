import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserManagement from './UserManagement'

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).single()

  // Non-admins cannot access settings
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles').select('*').order('created_at')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage team access. Admin only.</p>
      <UserManagement users={users ?? []} currentUserId={session.user.id} />
    </div>
  )
}
