'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/candidates', label: 'Candidates', icon: '◉' },
  { href: '/companies', label: 'Companies', icon: '◫' },
  { href: '/jobs', label: 'Job Orders', icon: '◈' },
  { href: '/import', label: 'CSV Import', icon: '⬆' },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState('user')
  const themeCtx = useTheme()
  const theme = themeCtx.theme
  const toggle = themeCtx.toggle || themeCtx.toggleTheme
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      setUser(u)
      const { data: p } = await (supabase as any).from('profiles').select('role').eq('id', u.id).single()
      if (p?.role) setRole(p.role)
    })()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="sidebar-mobile-toggle"
        aria-label="Toggle menu"
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div style={{ padding: '22px 18px 14px' }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>RecruitOS</h1>
          <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Recruiting CRM</p>
        </div>

        <nav style={{ flex: 1, padding: '4px 0' }}>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={closeMobile}
              className={`sidebar-link ${path?.startsWith(n.href) ? 'active' : ''}`}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center', opacity: 0.7 }}>{n.icon}</span>
              {n.label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link
              href="/settings"
              onClick={closeMobile}
              className={`sidebar-link ${path?.startsWith('/settings') ? 'active' : ''}`}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center', opacity: 0.7 }}>⚙</span>
              Settings
            </Link>
          )}
        </nav>

        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => toggle()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: 'var(--card-bg)', color: 'var(--text-primary)',
              marginBottom: 12, transition: 'all 0.15s',
            }}
          >
            <span>{theme === 'light' ? '🌙' : '☀️'}</span>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          {user && (
            <div style={{ fontSize: 12 }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.email?.split('@')[0]}
              </p>
              <p style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', marginTop: 3,
                color: role === 'admin' ? 'var(--accent)' : 'var(--text-tertiary)',
              }}>
                {role}
              </p>
              <button
                onClick={logout}
                style={{
                  marginTop: 8, fontSize: 11, color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  textDecoration: 'underline', opacity: 0.7,
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
