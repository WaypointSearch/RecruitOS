'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import {
  LayoutDashboard, Users, Building2, Briefcase,
  KanbanSquare, Upload, Settings, LogOut
} from 'lucide-react'
import { clsx } from 'clsx'

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
  const supabase = createSupabaseClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = profile.full_name
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <aside className="w-52 min-w-[13rem] h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-900">
          Recruit<span className="text-blue-600">OS</span>
        </span>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
        {profile.role === 'admin' && (
          <Link href="/settings"
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}>
            <Settings size={16} />
            Settings
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
          </div>
          <button onClick={signOut} className="text-gray-400 hover:text-gray-600" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
