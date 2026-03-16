'use client'
import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Check if locked
    const { data: profile } = await (supabase as any)
      .from('profiles').select('is_locked').eq('id', data.user!.id).single()
    if (profile?.is_locked) {
      await supabase.auth.signOut()
      setError('Your account has been disabled. Contact your administrator.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 20,
    }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
          color: 'var(--accent)', marginBottom: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        }}>
          Recruit<span style={{ fontWeight: 400 }}>OS</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          Sign in to your account
        </p>

        <form onSubmit={handleLogin} style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 16,
              background: 'var(--danger-bg)', color: 'var(--danger)',
              fontSize: 12, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14, textAlign: 'left' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--input-border)',
                background: 'var(--input-bg)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              background: 'var(--accent)', color: 'white', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>
          No account? Ask your admin to invite you.
        </p>
      </div>
    </div>
  )
}
