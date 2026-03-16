'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import type { Profile } from '@/types/database'
import { LayoutDashboard, Users, Building2, Briefcase, KanbanSquare, Upload, Settings, LogOut, Moon, Sun } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/import', label: 'CSV Import', icon: Upload },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const supabase = createSupabaseClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = (profile.full_name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside style={{ width: 200, minWidth: 200, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' }}>
          Recruit<span style={{ color: 'var(--accent)' }}>OS</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1, fontWeight: 500 }}>RECRUITING CRM</div>
      </div>
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`sidebar-link${isActive(href) ? ' active' : ''}`}>
            <Icon size={15} strokeWidth={isActive(href) ? 2.2 : 1.8} />{label}
          </Link>
        ))}
        {profile.role === 'admin' && (
          <Link href="/settings" className={`sidebar-link${pathname === '/settings' ? ' active' : ''}`}>
            <Settings size={15} />Settings
          </Link>
        )}
      </nav>
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </div>
          <div onClick={toggle} style={{ width: 36, height: 20, borderRadius: 10, background: theme === 'dark' ? 'var(--green)' : 'var(--border-strong)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, background: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: theme === 'dark' ? 'translateX(16px)' : 'none' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-text)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name || profile.email}</div>
            <div style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 4 }}><LogOut size={14} /></button>
        </div>
      </div>
    </aside>
  )
}
