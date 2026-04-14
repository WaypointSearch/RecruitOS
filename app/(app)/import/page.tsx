'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { geocodeLocation, detectDisciplines, getMetroNames } from '@/lib/geo-intelligence'

const CRM_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'name', label: 'Full Name' },
  { value: 'work_email', label: 'Work Email' },
  { value: 'personal_email', label: 'Personal Email' },
  { value: 'email', label: 'Email (general)' },
  { value: 'cell_phone', label: 'Cell Phone' },
  { value: 'work_phone', label: 'Work Phone' },
  { value: 'phone', label: 'Phone (general)' },
  { value: 'linkedin', label: 'LinkedIn / Sales Nav URL' },
  { value: 'current_title', label: 'Current Title' },
  { value: 'current_company', label: 'Current Company' },
  { value: 'current_company_url', label: 'Current Company URL' },
  { value: 'location', label: 'Location' },
  { value: 'current_salary', label: 'Current Salary' },
  { value: 'time_in_current_role', label: 'Time in Current Role' },
  { value: 'previous_title', label: 'Previous Title' },
  { value: 'previous_company', label: 'Previous Company' },
  { value: 'previous_dates', label: 'Previous Date Range' },
]

const WAYPOINT_MAP: Record<string, string> = {
  'first name': '_skip', 'last name': '_skip', 'full name': 'name',
  'current title': 'current_title', 'current company': 'current_company',
  'current company url': 'current_company_url', 'location': 'location',
  'time in role': 'time_in_current_role', 'previous title': 'previous_title',
  'previous company': 'previous_company', 'previous date range': 'previous_dates',
  'sales nav url': 'linkedin',
}

export default function ImportPage() {
  const sb = useRef(createClientComponentClient()).current
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [listName, setListName] = useState('')
  const [metroOverride, setMetroOverride] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, geocoded: 0, tagged: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWaypoint, setIsWaypoint] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return { headers: [] as string[], rows: [] as string[][] }
    const parseLine = (line: string) => {
      const r: string[] = []; let c = ''; let q = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') q = !q
        else if (ch === ',' && !q) { r.push(c.trim()); c = '' }
        else c += ch
      }
      r.push(c.trim()); return r
    }
    return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine).filter(r => r.some(c => c)) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      let text = ev.target?.result as string
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      const { headers, rows } = parseCSV(text)
      if (!headers.length) { setError('Could not parse CSV'); return }
      setCsvHeaders(headers); setCsvRows(rows)

      const lowerH = headers.map(h => h.toLowerCase().trim())
      const wpMatch = lowerH.filter(h => WAYPOINT_MAP[h] !== undefined).length
      setIsWaypoint(wpMatch >= 6)

      const autoMap: Record<number, string> = {}
      headers.forEach((h, i) => {
        const lower = h.toLowerCase().trim()
        if (WAYPOINT_MAP[lower] && WAYPOINT_MAP[lower] !== '_skip') { autoMap[i] = WAYPOINT_MAP[lower]; return }
        if (WAYPOINT_MAP[lower] === '_skip') return
        const c = lower.replace(/[^a-z0-9]/g, '')
        if (c.includes('name') && !c.includes('company') && !c.includes('first') && !c.includes('last')) autoMap[i] = 'name'
        else if (c.includes('workemail') || c.includes('businessemail')) autoMap[i] = 'work_email'
        else if (c.includes('personalemail')) autoMap[i] = 'personal_email'
        else if (c.includes('email')) autoMap[i] = 'email'
        else if (c.includes('cellphone') || c.includes('mobile')) autoMap[i] = 'cell_phone'
        else if (c.includes('workphone') || c.includes('officephone') || c.includes('directphone')) autoMap[i] = 'work_phone'
        else if (c.includes('phone')) autoMap[i] = 'phone'
        else if (c.includes('linkedin') || c.includes('salesnav')) autoMap[i] = 'linkedin'
        else if (c.includes('title') && !c.includes('prev')) autoMap[i] = 'current_title'
        else if (c.includes('company') && !c.includes('prev') && !c.includes('url')) autoMap[i] = 'current_company'
        else if (c.includes('companyurl')) autoMap[i] = 'current_company_url'
        else if (c.includes('location') || c.includes('geography')) autoMap[i] = 'location'
        else if (c.includes('salary')) autoMap[i] = 'current_salary'
        else if (c.includes('timein') || c.includes('tenure')) autoMap[i] = 'time_in_current_role'
        else if (c.includes('previoustitle')) autoMap[i] = 'previous_title'
        else if (c.includes('previouscompany')) autoMap[i] = 'previous_company'
        else if (c.includes('previousdate') || c.includes('daterange')) autoMap[i] = 'previous_dates'
      })
      setMapping(autoMap)
      if (wpMatch >= 6 && !listName) setListName('Waypoint Import ' + new Date().toLocaleDateString())
    }
    reader.readAsText(file)
  }

  const doImport = async () => {
    setImporting(true)
    const stats = { done: 0, total: csvRows.length, geocoded: 0, tagged: 0 }
    setProgress(stats)
    const { data: { user } } = await sb.auth.getUser()
    const baseTags = listName.trim() ? [listName.trim()] : []

    const CHUNK = 50
    for (let i = 0; i < csvRows.length; i += CHUNK) {
      const chunk = csvRows.slice(i, i + CHUNK).map(row => {
        const obj: any = { created_by: user?.id }
        for (const [colIdx, field] of Object.entries(mapping)) {
          if (!field) continue
          const val = row[parseInt(colIdx)]?.trim()
          if (!val) continue
          if (field === 'current_salary') { const n = parseInt(val.replace(/[^0-9]/g, '')); obj[field] = isNaN(n) ? null : n }
          else obj[field] = val
        }

        // Auto-geocode location → coordinates + metro area
        if (obj.location) {
          const geo = geocodeLocation(obj.location)
          if (geo) {
            obj.metro_area = metroOverride || geo.metro
            // Store as WKT for PostGIS (will be cast by Supabase)
            obj.location_coords = `SRID=4326;POINT(${geo.lng} ${geo.lat})`
            stats.geocoded++
          } else {
            obj.metro_area = metroOverride || null
          }
        } else if (metroOverride) {
          obj.metro_area = metroOverride
        }

        // Auto-detect disciplines
        const discs = detectDisciplines(obj.current_title, obj.current_company, obj.previous_title, obj.previous_company)
        if (discs.length > 0) {
          obj.disciplines = discs
          stats.tagged++
        }

        // Combine base tags with discipline tags
        obj.tags = [...baseTags, ...discs]

        return obj
      }).filter(o => o.name)

      if (chunk.length > 0) {
        const { error: insertErr } = await (sb as any).from('candidates').insert(chunk)
        if (insertErr) console.error('Insert error:', insertErr)
      }
      stats.done += csvRows.slice(i, i + CHUNK).length
      setProgress({ ...stats })
    }

    setImporting(false)
    showToast(`Imported ${stats.total} candidates! (${stats.geocoded} geocoded, ${stats.tagged} discipline-tagged)`)
    setTimeout(() => router.push('/candidates'), 1500)
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Import Candidates</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Upload a CSV — Waypoint Search exports are auto-detected. Locations are geocoded and disciplines are tagged automatically.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>List / Tag Name</label>
          <input type="text" value={listName} onChange={e => setListName(e.target.value)} placeholder="e.g. Atlanta MEP Engineers Q1 2026" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            Override Metro Area <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(auto-detects if blank)</span>
          </label>
          <select value={metroOverride} onChange={e => setMetroOverride(e.target.value)}>
            <option value="">Auto-detect from location</option>
            {getMetroNames().map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {csvHeaders.length === 0 && (
        <div onClick={() => fileRef.current?.click()} style={{
          border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px',
          textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>⬆</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Click to upload or drag & drop</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>.csv — Waypoint Search exports auto-detected & mapped</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}

      {csvHeaders.length > 0 && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Map Columns</h2>
              {isWaypoint && <span className="badge badge-green" style={{ marginTop: 4 }}>✓ Waypoint CSV detected — auto-mapped</span>}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{csvRows.length} rows · {Object.values(mapping).filter(Boolean).length} mapped</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px 12px', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>CSV Column</span>
            <span></span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>CRM Field</span>
            {csvHeaders.map((h, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div style={{ padding: '6px 10px', background: 'var(--card-bg-hover)', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                  {h}
                  {csvRows[0]?.[i] && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginTop: 1 }}>e.g. "{csvRows[0][i].slice(0, 50)}"</span>}
                </div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>→</span>
                <select value={mapping[i] || ''} onChange={e => setMapping(p => ({ ...p, [i]: e.target.value }))}>
                  {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Intelligence preview */}
          {csvRows[0] && (
            <div style={{ marginTop: 14, padding: 12, background: 'var(--card-bg-hover)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>🧠 Auto-Intelligence Preview (first row)</p>
              {(() => {
                const locIdx = Object.entries(mapping).find(([_, v]) => v === 'location')?.[0]
                const titleIdx = Object.entries(mapping).find(([_, v]) => v === 'current_title')?.[0]
                const compIdx = Object.entries(mapping).find(([_, v]) => v === 'current_company')?.[0]
                const loc = locIdx ? csvRows[0][parseInt(locIdx)] : ''
                const title = titleIdx ? csvRows[0][parseInt(titleIdx)] : ''
                const comp = compIdx ? csvRows[0][parseInt(compIdx)] : ''
                const geo = geocodeLocation(loc)
                const discs = detectDisciplines(title, comp)
                return (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Location:</span>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{loc || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Metro:</span>{' '}
                      <span style={{ color: geo ? 'var(--success)' : 'var(--text-tertiary)' }}>{geo?.metro || 'Not detected'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Coords:</span>{' '}
                      <span style={{ color: geo ? 'var(--success)' : 'var(--text-tertiary)' }}>{geo ? `${geo.lat.toFixed(2)}, ${geo.lng.toFixed(2)}` : 'None'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Disciplines:</span>{' '}
                      {discs.length > 0 ? discs.map(d => <span key={d} className="badge badge-blue" style={{ fontSize: 10, marginLeft: 4 }}>{d}</span>) : <span style={{ color: 'var(--text-tertiary)' }}>None detected</span>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={doImport} disabled={importing || !Object.values(mapping).includes('name')} className="btn btn-primary">
              {importing ? `Importing... ${progress.done}/${progress.total}` : `Import ${csvRows.length} Candidates`}
            </button>
            {importing && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                📍 {progress.geocoded} geocoded · 🏷 {progress.tagged} tagged
              </span>
            )}
            <button onClick={() => { setCsvHeaders([]); setCsvRows([]); setMapping({}); setIsWaypoint(false) }} className="btn btn-sm">Reset</button>
            {!Object.values(mapping).includes('name') && <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ Map a column to "Full Name"</span>}
          </div>
        </div>
      )}
      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  )
}
