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
  const { theme, toggleTheme } = useTheme()
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
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="sidebar-mobile-toggle"
        aria-label="Toggle menu"
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>RecruitOS</h1>
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Recruiting CRM</p>
        </div>

        <nav style={{ flex: 1, padding: '0 8px' }}>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={closeMobile}
              className={`sidebar-link ${path?.startsWith(n.href) ? 'active' : ''}`}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link
              href="/settings"
              onClick={closeMobile}
              className={`sidebar-link ${path?.startsWith('/settings') ? 'active' : ''}`}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>⚙</span>
              Settings
            </Link>
          )}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, background: 'var(--card-bg)', color: 'var(--text-primary)',
              marginBottom: 8,
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
              <p style={{ opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{role}</p>
              <button
                onClick={logout}
                style={{
                  marginTop: 6, fontSize: 11, color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  textDecoration: 'underline',
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
