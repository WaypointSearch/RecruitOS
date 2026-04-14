'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { detectMetroArea, getMetroNames } from '@/lib/metro-areas'

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

// Exact header → field mapping for Waypoint Search extension CSVs
const WAYPOINT_MAP: Record<string, string> = {
  'first name': '_skip_first',
  'last name': '_skip_last',
  'full name': 'name',
  'current title': 'current_title',
  'current company': 'current_company',
  'current company url': 'current_company_url',
  'location': 'location',
  'time in role': 'time_in_current_role',
  'previous title': 'previous_title',
  'previous company': 'previous_company',
  'previous date range': 'previous_dates',
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
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWaypoint, setIsWaypoint] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return { headers: [] as string[], rows: [] as string[][] }
    const parseLine = (line: string) => {
      const result: string[] = []; let cur = ''; let inQ = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') inQ = !inQ
        else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
        else cur += ch
      }
      result.push(cur.trim())
      return result
    }
    return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine).filter((r) => r.some((c) => c)) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      let text = ev.target?.result as string
      // Strip BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      const { headers, rows } = parseCSV(text)
      if (headers.length === 0) { setError('Could not parse CSV'); return }
      setCsvHeaders(headers)
      setCsvRows(rows)

      // Detect Waypoint extension CSV
      const lowerHeaders = headers.map((h) => h.toLowerCase().trim())
      const wpMatch = lowerHeaders.filter((h) => WAYPOINT_MAP[h] !== undefined).length
      const isWP = wpMatch >= 6 // 6+ matching headers = definitely Waypoint

      setIsWaypoint(isWP)

      // Auto-map
      const autoMap: Record<number, string> = {}
      headers.forEach((h, i) => {
        const lower = h.toLowerCase().trim()

        // Try exact Waypoint match first
        if (WAYPOINT_MAP[lower]) {
          const field = WAYPOINT_MAP[lower]
          if (!field.startsWith('_skip')) autoMap[i] = field
          return
        }

        // Fuzzy fallback
        const clean = lower.replace(/[^a-z0-9]/g, '')
        if (clean.includes('name') && !clean.includes('company') && !clean.includes('first') && !clean.includes('last')) autoMap[i] = 'name'
        else if (clean.includes('workemail') || clean.includes('businessemail')) autoMap[i] = 'work_email'
        else if (clean.includes('personalemail')) autoMap[i] = 'personal_email'
        else if (clean.includes('email')) autoMap[i] = 'email'
        else if (clean.includes('cellphone') || clean.includes('mobilephone') || clean.includes('mobile')) autoMap[i] = 'cell_phone'
        else if (clean.includes('workphone') || clean.includes('officephone') || clean.includes('directphone')) autoMap[i] = 'work_phone'
        else if (clean.includes('phone')) autoMap[i] = 'phone'
        else if (clean.includes('linkedin') || clean.includes('salesnav')) autoMap[i] = 'linkedin'
        else if (clean.includes('title') && !clean.includes('prev')) autoMap[i] = 'current_title'
        else if (clean.includes('company') && !clean.includes('prev') && !clean.includes('url')) autoMap[i] = 'current_company'
        else if (clean.includes('companyurl')) autoMap[i] = 'current_company_url'
        else if (clean.includes('location') || clean.includes('geography')) autoMap[i] = 'location'
        else if (clean.includes('salary')) autoMap[i] = 'current_salary'
        else if (clean.includes('timein') || clean.includes('tenure')) autoMap[i] = 'time_in_current_role'
        else if (clean.includes('previoustitle') || (clean.includes('prev') && clean.includes('title'))) autoMap[i] = 'previous_title'
        else if (clean.includes('previouscompany') || (clean.includes('prev') && clean.includes('company'))) autoMap[i] = 'previous_company'
        else if (clean.includes('previousdate') || clean.includes('daterange')) autoMap[i] = 'previous_dates'
      })
      setMapping(autoMap)

      // If Waypoint CSV and filename contains a search term, use as list name
      if (isWP && file.name.startsWith('waypoint_leads_')) {
        if (!listName) setListName('Waypoint Import ' + new Date().toLocaleDateString())
      }
    }
    reader.readAsText(file)
  }

  const doImport = async () => {
    setImporting(true)
    setProgress({ done: 0, total: csvRows.length })
    const { data: { user } } = await sb.auth.getUser()
    const tags = listName.trim() ? [listName.trim()] : []

    const CHUNK = 50
    let done = 0
    for (let i = 0; i < csvRows.length; i += CHUNK) {
      const chunk = csvRows.slice(i, i + CHUNK).map((row) => {
        const obj: any = { created_by: user?.id, tags }
        for (const [colIdx, field] of Object.entries(mapping)) {
          if (!field) continue
          const val = row[parseInt(colIdx)]?.trim()
          if (!val) continue
          if (field === 'current_salary') {
            const num = parseInt(val.replace(/[^0-9]/g, ''))
            obj[field] = isNaN(num) ? null : num
          } else {
            obj[field] = val
          }
        }

        // Auto-detect metro area from location
        if (obj.location) {
          obj.metro_area = metroOverride || detectMetroArea(obj.location) || null
        } else if (metroOverride) {
          obj.metro_area = metroOverride
        }

        return obj
      }).filter((o) => o.name)

      if (chunk.length > 0) {
        await (sb as any).from('candidates').insert(chunk)
      }
      done += csvRows.slice(i, i + CHUNK).length
      setProgress({ done, total: csvRows.length })
    }

    setImporting(false)
    showToast(`Imported ${csvRows.length} candidates!`)
    setTimeout(() => router.push('/candidates'), 1500)
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Import Candidates from CSV</h1>

      {/* Config row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            List / Tag Name
          </label>
          <input type="text" value={listName} onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Atlanta MEP Engineers Q1 2026" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            Assign Metro Area <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional — auto-detects if blank)</span>
          </label>
          <select value={metroOverride} onChange={(e) => setMetroOverride(e.target.value)}>
            <option value="">Auto-detect from location</option>
            {getMetroNames().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Upload zone */}
      {csvHeaders.length === 0 && (
        <div onClick={() => fileRef.current?.click()} style={{
          border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px',
          textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>⬆</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Click to upload or drag & drop</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>.csv files only — Waypoint Search exports auto-detected</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}

      {/* Mapping UI */}
      {csvHeaders.length > 0 && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Map Columns</h2>
              {isWaypoint && (
                <span className="badge badge-green" style={{ marginTop: 4 }}>✓ Waypoint Search CSV detected — auto-mapped</span>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {csvRows.length} rows · {mappedCount} fields mapped
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px 12px', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CSV Column</span>
            <span></span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CRM Field</span>

            {csvHeaders.map((h, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div style={{ padding: '6px 10px', background: 'var(--card-bg-hover)', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                  {h}
                  {csvRows[0]?.[i] && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 1 }}>
                      e.g. "{csvRows[0][i].slice(0, 50)}"
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>→</span>
                <select value={mapping[i] || ''} onChange={(e) => setMapping((p) => ({ ...p, [i]: e.target.value }))}>
                  {CRM_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={doImport} disabled={importing || !Object.values(mapping).includes('name')} className="btn btn-primary">
              {importing ? `Importing... ${progress.done}/${progress.total}` : `Import ${csvRows.length} Candidates`}
            </button>
            <button onClick={() => { setCsvHeaders([]); setCsvRows([]); setMapping({}); setIsWaypoint(false) }} className="btn btn-sm">Reset</button>
            {!Object.values(mapping).includes('name') && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ Map at least one column to "Full Name"</span>
            )}
          </div>
        </div>
      )}
      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  )
}
