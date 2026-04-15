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

// Widget 1: Global Stream — Tech, AI, trending
const STREAM_CARDS = [
  { icon: '⚡', label: 'AI', text: 'Google DeepMind trains AI to design HVAC systems 40% more efficient than human engineers.' },
  { icon: '🔥', label: 'TRENDING', text: 'Construction tech VC funding hit $4.2B in 2025 — Procore, PlanGrid, and OpenSpace leading the charge.' },
  { icon: '🧠', label: 'AI', text: 'GPT-5 can now review MEP clash detection reports and auto-flag coordination issues in Revit models.' },
  { icon: '📱', label: 'TECH', text: 'Apple Vision Pro now being used for virtual walkthroughs of data center MEP installations before construction.' },
  { icon: '🌐', label: 'TRENDING', text: '"The future of recruiting is AI-assisted, but the close is still human." — trending on X with 12K+ likes' },
  { icon: '⚡', label: 'TECH', text: 'Boston Dynamics robots now autonomously scan rebar and MEP rough-ins for QA compliance on job sites.' },
  { icon: '🧠', label: 'AI', text: 'Autodesk Forma uses generative AI to optimize building energy performance during early design.' },
  { icon: '🔥', label: 'STARTUP', text: 'Maidbot raises $15M to deploy autonomous cleaning robots in commercial buildings nationwide.' },
  { icon: '📱', label: 'TECH', text: 'Spot the Robot Dog is now doing regular facility inspections at Amazon data centers.' },
  { icon: '🌐', label: 'X POST', text: '"Hiring one great engineer is worth more than 10 average ones." — @elonmusk, 45K likes' },
]

// Widget 2: AEC Command Center — Industry, motivation, facts
const AEC_CARDS = [
  { icon: '🏗️', label: 'AEC NEWS', text: 'US infrastructure bill driving $110B in MEP-heavy projects: hospitals, data centers, transit.' },
  { icon: '💪', label: 'FUEL', text: '"Every dial, every email, every follow-up compounds. You are building a pipeline empire." — Recruiter Fuel' },
  { icon: '🏛️', label: 'DID YOU KNOW', text: 'The Hoover Dam contains enough concrete to build a two-lane highway from San Francisco to New York.' },
  { icon: '📊', label: 'HIRING TREND', text: '2026 MEP hiring: Fire Protection Engineers are the hardest-to-fill role, with 3.2 openings per candidate.' },
  { icon: '🏗️', label: 'MEGAPROJECT', text: 'TSMC Arizona fab — $40B investment, 10,000+ construction jobs. Massive MEP scope for cleanroom systems.' },
  { icon: '💪', label: 'FUEL', text: '"Outwork everyone. Out-call everyone. Out-care everyone. The market rewards relentless value." — Gary Vee' },
  { icon: '🏛️', label: 'ARCHITECTURE', text: 'The Pantheon in Rome, built in 125 AD, still has the worlds largest unreinforced concrete dome.' },
  { icon: '📊', label: 'MARKET', text: 'Average recruiter placement: 47 days from initial contact to offer acceptance. Top performers: 28 days.' },
  { icon: '🏗️', label: 'AEC NEWS', text: 'Skanska commits to net-zero construction by 2030 — reshaping MEP specifications industry-wide.' },
  { icon: '💪', label: 'FUEL', text: '"Your next placement is one phone call away. Pick up the phone." — Daily Recruiter Mantra' },
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
  const [zenMode, setZenMode] = useState(false)

  // Widget 1: Global Stream
  const [streamIdx, setStreamIdx] = useState(0)
  const [streamFade, setStreamFade] = useState(true)
  const [streamPaused, setStreamPaused] = useState(false)

  // Widget 2: AEC Command Center
  const [aecIdx, setAecIdx] = useState(0)
  const [aecFade, setAecFade] = useState(true)
  const [aecPaused, setAecPaused] = useState(false)

  const rotateStream = useCallback(() => {
    setStreamFade(false)
    setTimeout(() => { setStreamIdx(p => (p + 1) % STREAM_CARDS.length); setStreamFade(true) }, 300)
  }, [])

  const rotateAec = useCallback(() => {
    setAecFade(false)
    setTimeout(() => { setAecIdx(p => (p + 1) % AEC_CARDS.length); setAecFade(true) }, 300)
  }, [])

  useEffect(() => {
    if (streamPaused || zenMode) return
    const t = setInterval(rotateStream, 10000)
    return () => clearInterval(t)
  }, [streamPaused, zenMode, rotateStream])

  useEffect(() => {
    if (aecPaused || zenMode) return
    const t = setInterval(rotateAec, 12000)
    return () => clearInterval(t)
  }, [aecPaused, zenMode, rotateAec])

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
  const sw = STREAM_CARDS[streamIdx]
  const aw = AEC_CARDS[aecIdx]

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="sidebar-mobile-toggle" aria-label="Menu">
        <span style={{ fontSize: 18, lineHeight: 1 }}>{mobileOpen ? '✕' : '☰'}</span>
      </button>
      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 14px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>
            <span style={{ color: 'var(--text-primary)' }}>Recruit</span>
            <span style={{ color: 'var(--neon-green)', fontWeight: 400 }}>OS</span>
          </h1>
          <p style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recruiting Command Center</p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '2px 0' }}>
          {nav.map(n => (
            <Link key={n.href} href={n.href} onClick={closeMobile} className={`sidebar-link ${path?.startsWith(n.href) ? 'active' : ''}`}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{n.icon}</span>{n.label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link href="/settings" onClick={closeMobile} className={`sidebar-link ${path?.startsWith('/settings') ? 'active' : ''}`}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>⚙</span>Settings
            </Link>
          )}
        </nav>

        {/* Widgets */}
        {!zenMode ? (
          <div style={{ padding: '8px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            {/* Widget 1: Global Stream */}
            <div className="sidebar-widget stream"
              onMouseEnter={() => setStreamPaused(true)} onMouseLeave={() => setStreamPaused(false)}
              style={{ opacity: streamFade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <button className="widget-pause" onClick={(e) => { e.stopPropagation(); rotateStream() }} title="Skip">↻</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{sw.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--neon-blue)' }}>{sw.label}</span>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>Global Stream</span>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{sw.text}</p>
            </div>

            {/* Widget 2: AEC Command Center */}
            <div className="sidebar-widget aec"
              onMouseEnter={() => setAecPaused(true)} onMouseLeave={() => setAecPaused(false)}
              style={{ opacity: aecFade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              <button className="widget-pause" onClick={(e) => { e.stopPropagation(); rotateAec() }} title="Skip">↻</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{aw.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--neon-green)' }}>{aw.label}</span>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>AEC Intel</span>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{aw.text}</p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 }}>
            <span style={{ fontSize: 16, opacity: 0.3, cursor: 'pointer' }} onClick={() => setZenMode(false)} title="Show widgets">⚡</span>
            <span style={{ fontSize: 16, opacity: 0.3, cursor: 'pointer' }} onClick={() => setZenMode(false)} title="Show widgets">🏗️</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button onClick={() => toggle()} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button onClick={() => setZenMode(!zenMode)} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 11, color: zenMode ? 'var(--neon-green)' : undefined }}>
              {zenMode ? '📡 Live' : '🧘 Zen'}
            </button>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, overflow: 'hidden', background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--neon-green))', color: 'white' }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: role === 'admin' ? 'var(--neon-green)' : 'var(--text-tertiary)' }}>{role}</p>
                <button onClick={logout} style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
