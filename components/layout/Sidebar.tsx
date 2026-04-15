'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/candidates', label: 'Candidates', icon: '◉' },
  { href: '/hotlists', label: 'Hotlists', icon: '🔥' },
  { href: '/companies', label: 'Companies', icon: '◫' },
  { href: '/jobs', label: 'Job Orders', icon: '◈' },
  { href: '/import', label: 'CSV Import', icon: '⬆' },
]

// Static widget content — refreshes on page load, rotates client-side
const WIDGETS = [
  { icon: '🧠', cat: 'AI Insight', text: 'AI is now being used to auto-generate MEP shop drawings — reducing turnaround from weeks to days.' },
  { icon: '🏗️', cat: 'AEC News', text: 'US construction spending hit $2.2T in 2025. MEP trades seeing strongest growth in healthcare and data centers.' },
  { icon: '🚀', cat: 'Space Tech', text: "SpaceX's Starship is designed with 33 Raptor engines — the most powerful rocket system ever built." },
  { icon: '💡', cat: 'Did You Know?', text: 'The Empire State Building was built in just 410 days. Modern BIM could have cut that timeline further.' },
  { icon: '🎯', cat: 'Recruiter Tip', text: 'The best time to call candidates is Tuesday-Thursday between 10-11am. Avoid Monday mornings and Friday afternoons.' },
  { icon: '⚡', cat: 'Inspiration', text: '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt' },
  { icon: '🏢', cat: 'Megaproject', text: 'NEOM / The Line in Saudi Arabia: A 170km linear city with zero cars, zero streets, and zero carbon emissions.' },
  { icon: '🔧', cat: 'MEP Trend', text: 'Prefabricated MEP racks are cutting on-site labor by 40% on large commercial projects.' },
  { icon: '📊', cat: 'Market Data', text: 'Average MEP engineer salary in the US: $95K. Senior PMs in NYC/SF commanding $150K+.' },
  { icon: '🌍', cat: 'Future Cities', text: 'Singapore is building an underground highway system to free surface land for parks and housing.' },
  { icon: '🎯', cat: 'One Thing Today', text: 'Send 3 personalized LinkedIn messages to passive candidates before noon. Consistency compounds.' },
  { icon: '⚡', cat: 'Motivation', text: '"Speed is the currency of business. The person who moves fastest wins." — Grant Cardone' },
  { icon: '🏗️', cat: 'Construction Tech', text: 'Boston Dynamics robots are now being used for autonomous site inspections on active construction sites.' },
  { icon: '💡', cat: 'Fun Fact', text: 'The Burj Khalifa uses 22 million gallons of water just for its cooling system — equivalent to 20 Olympic pools.' },
  { icon: '🚀', cat: 'AI + AEC', text: 'Autodesk Forma now uses AI to optimize building orientation, reducing energy costs by up to 30%.' },
  { icon: '📊', cat: 'Industry', text: 'The global MEP market is projected to reach $280B by 2028, driven by smart building and net-zero mandates.' },
  { icon: '⚡', cat: 'Hustle', text: '"Your income is directly proportional to the problems you solve for other people." — Grant Cardone' },
  { icon: '🏢', cat: 'Architecture', text: 'The Vessel at Hudson Yards: 154 interconnecting flights of stairs — pure engineering poetry.' },
  { icon: '💡', cat: 'Productivity', text: 'Block your calendar into 90-minute "power sessions" — deep focus on sourcing, then breaks. Your brain will thank you.' },
  { icon: '🔧', cat: 'Placement Win', text: 'A single senior PM placement at 20% fee on a $140K salary = $28,000 in revenue. Keep dialing.' },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [role, setRole] = useState('user')
  const themeCtx = useTheme()
  const theme = themeCtx.theme
  const toggle = (themeCtx as any).toggle || (themeCtx as any).toggleTheme
  const [mobileOpen, setMobileOpen] = useState(false)

  // Widget rotation
  const [widgetIdx, setWidgetIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [widgetFade, setWidgetFade] = useState(true)
  const timerRef = useRef<any>(null)

  const rotateWidget = useCallback(() => {
    setWidgetFade(false)
    setTimeout(() => {
      setWidgetIdx(prev => (prev + 1) % WIDGETS.length)
      setWidgetFade(true)
    }, 300)
  }, [])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(rotateWidget, 10000)
    return () => clearInterval(timerRef.current)
  }, [paused, rotateWidget])

  useEffect(() => {
    ;(async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return; setUser(u)
      const { data: p } = await (supabase as any).from('profiles').select('role, full_name, avatar_url').eq('id', u.id).single()
      if (p) { setRole(p.role || 'user'); setProfile(p) }
    })()
  }, [])

  const logout = async () => { await supabase.auth.signOut(); router.push('/auth/login') }
  const closeMobile = () => setMobileOpen(false)
  const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  const displayName = profile?.full_name ? capitalize(profile.full_name) : user?.email ? capitalize(user.email.split('@')[0].replace(/[._]/g, ' ')) : 'User'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const w = WIDGETS[widgetIdx]

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="sidebar-mobile-toggle" aria-label="Menu">
        <span style={{ fontSize: 18, lineHeight: 1 }}>{mobileOpen ? '✕' : '☰'}</span>
      </button>
      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent)' }}>
            Recruit<span style={{ color: 'var(--neon-green)', fontWeight: 400 }}>OS</span>
          </h1>
          <p style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recruiting CRM</p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '4px 0' }}>
          {nav.map(n => (
            <Link key={n.href} href={n.href} onClick={closeMobile} className={`sidebar-link ${path?.startsWith(n.href) ? 'active' : ''}`}>
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{n.icon}</span>{n.label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link href="/settings" onClick={closeMobile} className={`sidebar-link ${path?.startsWith('/settings') ? 'active' : ''}`}>
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>⚙</span>Settings
            </Link>
          )}
        </nav>

        {/* Dynamic Widget */}
        <div style={{ padding: '8px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            className="sidebar-widget"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            style={{
              opacity: widgetFade ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{w.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neon-green)' }}>{w.cat}</span>
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{w.text}</p>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 3, marginTop: 6, justifyContent: 'center' }}>
              {[0,1,2,3,4].map(i => {
                const dotIdx = (widgetIdx + i) % WIDGETS.length
                return <div key={i} style={{ width: i===0?8:4, height: 4, borderRadius: 2, background: i===0?'var(--accent)':'var(--border)', transition: 'all 0.3s' }} />
              })}
            </div>
          </div>
        </div>

        {/* Theme + User */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => toggle()} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: 'var(--card-bg)', color: 'var(--text-primary)', marginBottom: 10,
          }}>
            <span>{theme === 'light' ? '🌙' : '☀️'}</span>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, overflow: 'hidden', background: profile?.avatar_url ? 'transparent' : 'var(--accent)', color: 'white' }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: role === 'admin' ? 'var(--neon-green)' : 'var(--text-tertiary)' }}>{role}</p>
                <button onClick={logout} style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', opacity: 0.7 }}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
