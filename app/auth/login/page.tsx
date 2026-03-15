'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    // Check if account is locked
    const { data: profile } = await supabase
      .from('profiles' as any).select('is_locked').eq('id', data.user!.id).single()
    if (profile?.is_locked) {
      await supabase.auth.signOut()
      setError('Your account has been disabled. Contact your administrator.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Recruit<span className="text-blue-600">OS</span></h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          No account? Ask your admin to invite you.
        </p>
      </div>
    </div>
  )
}
