import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createAdminClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (!profile || profile.role !== 'admin')
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const { userId, role } = await req.json()
  if (!userId || !['admin', 'user'].includes(role))
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  if (userId === session.user.id)
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

  const admin = createAdminClient()
  await (admin.from('profiles') as any).update({ role }).eq('id', userId)

  return NextResponse.json({ success: true })
}
