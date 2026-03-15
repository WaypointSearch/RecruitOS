import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { UserPlus, Upload } from 'lucide-react'
import AddCandidateModal from './AddCandidateModal'

export default async function CandidatesPage({
  searchParams
}: {
  searchParams: { q?: string; tag?: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  let query = supabase.from('candidates').select('*').order('created_at', { ascending: false })
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`)
  if (searchParams.tag) query = query.contains('tags', [searchParams.tag])
  const { data: candidates } = await query

  // Gather all unique tags for filter bar
  const { data: allCandidates } = await supabase.from('candidates').select('tags')
  const allTags = [...new Set((allCandidates ?? []).flatMap(c => c.tags ?? []))].sort()

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const avatarColors = ['bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-rose-100 text-rose-700']

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Candidates</h1>
        <div className="flex gap-2">
          <Link href="/import" className="btn btn-sm gap-1.5"><Upload size={13} />Import CSV</Link>
          <AddCandidateModal />
        </div>
      </div>

      {/* Search + tag filter */}
      <form method="GET" className="flex gap-3 mb-4">
        <input name="q" defaultValue={searchParams.q} className="input max-w-xs"
          placeholder="Search by name…" />
        <select name="tag" defaultValue={searchParams.tag} className="input max-w-[160px]">
          <option value="">All tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn btn-sm">Filter</button>
        {(searchParams.q || searchParams.tag) && (
          <Link href="/candidates" className="btn btn-sm text-gray-500">Clear</Link>
        )}
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Name', 'Current role', 'Company', 'Time in role', 'Tags', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {candidates?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                No candidates yet. Add one or import a CSV.
              </td></tr>
            )}
            {candidates?.map((c, i) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                      {initials(c.name)}
                    </div>
                    <Link href={`/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {c.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.current_title || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.current_company || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.time_in_current_role || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags ?? []).map(t => (
                      <span key={t} className="badge badge-gray">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/candidates/${c.id}`} className="text-xs text-blue-600 hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
