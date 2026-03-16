'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const CRM_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'name', label: 'Name' },
  { value: 'work_email', label: 'Work Email' },
  { value: 'personal_email', label: 'Personal Email' },
  { value: 'email', label: 'Email (general)' },
  { value: 'cell_phone', label: 'Cell Phone' },
  { value: 'work_phone', label: 'Work Phone' },
  { value: 'phone', label: 'Phone (general)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'current_title', label: 'Current Title' },
  { value: 'current_company', label: 'Current Company' },
  { value: 'current_company_url', label: 'Current Company URL' },
  { value: 'location', label: 'Location' },
  { value: 'current_salary', label: 'Current Salary' },
  { value: 'time_in_current_role', label: 'Time in Current Role' },
  { value: 'previous_title', label: 'Previous Title' },
  { value: 'previous_company', label: 'Previous Company' },
  { value: 'previous_dates', label: 'Previous Dates' },
]

export default function ImportPage() {
  const sb = useRef(createClientComponentClient()).current
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [listName, setListName] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }

    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuotes = !inQuotes }
        else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
        else { current += ch }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseLine(lines[0])
    const rows = lines.slice(1).map(parseLine).filter((r) => r.some((cell) => cell))
    return { headers, rows }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSV(text)
      if (headers.length === 0) { setError('Could not parse CSV'); return }
      setCsvHeaders(headers)
      setCsvRows(rows)

      // Auto-map by fuzzy matching header names
      const autoMap: Record<number, string> = {}
      headers.forEach((h, i) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (lower.includes('name') && !lower.includes('company')) autoMap[i] = 'name'
        else if (lower.includes('workemail') || lower.includes('work_email') || lower.includes('businessemail')) autoMap[i] = 'work_email'
        else if (lower.includes('personalemail') || lower.includes('personal_email')) autoMap[i] = 'personal_email'
        else if (lower.includes('email')) autoMap[i] = 'email'
        else if (lower.includes('cellphone') || lower.includes('cell_phone') || lower.includes('mobilephone') || lower.includes('mobile')) autoMap[i] = 'cell_phone'
        else if (lower.includes('workphone') || lower.includes('work_phone') || lower.includes('officephone') || lower.includes('directphone')) autoMap[i] = 'work_phone'
        else if (lower.includes('phone')) autoMap[i] = 'phone'
        else if (lower.includes('linkedin')) autoMap[i] = 'linkedin'
        else if (lower.includes('title') && !lower.includes('prev')) autoMap[i] = 'current_title'
        else if (lower.includes('company') && !lower.includes('prev') && !lower.includes('url')) autoMap[i] = 'current_company'
        else if (lower.includes('companyurl') || lower.includes('company_url')) autoMap[i] = 'current_company_url'
        else if (lower.includes('location') || lower.includes('city') || lower.includes('geography')) autoMap[i] = 'location'
        else if (lower.includes('salary') || lower.includes('compensation')) autoMap[i] = 'current_salary'
        else if (lower.includes('timein') || lower.includes('tenure') || lower.includes('time_in')) autoMap[i] = 'time_in_current_role'
        else if (lower.includes('previoustitle') || lower.includes('prev') && lower.includes('title')) autoMap[i] = 'previous_title'
        else if (lower.includes('previouscompany') || lower.includes('prev') && lower.includes('company')) autoMap[i] = 'previous_company'
        else if (lower.includes('previousdate') || lower.includes('prev') && lower.includes('date')) autoMap[i] = 'previous_dates'
      })
      setMapping(autoMap)
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

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Import Candidates from CSV</h1>

      {/* List name */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>List / tag name</label>
        <input type="text" value={listName} onChange={(e) => setListName(e.target.value)}
          placeholder="e.g. Engineering Leaders Q1 2026" style={{ flex: 1 }} />
      </div>

      {/* Upload zone */}
      {csvHeaders.length === 0 && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px',
            textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
        >
          <p style={{ fontSize: 28, marginBottom: 8 }}>⬆</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Click to upload or drag & drop</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>.csv files only</p>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}

      {/* Mapping UI */}
      {csvHeaders.length > 0 && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Map Columns</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{csvRows.length} rows found</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px 12px', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>CSV Column</span>
            <span></span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>CRM Field</span>

            {csvHeaders.map((h, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div style={{ padding: '6px 10px', background: 'var(--card-bg-hover)', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                  {h}
                  {csvRows[0]?.[i] && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 2 }}>
                      e.g. "{csvRows[0][i].slice(0, 40)}"
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <select
                  value={mapping[i] || ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [i]: e.target.value }))}
                >
                  {CRM_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Import button */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={doImport} disabled={importing || !Object.values(mapping).includes('name')}
              className="btn btn-primary">
              {importing ? `Importing... ${progress.done}/${progress.total}` : `Import ${csvRows.length} Candidates`}
            </button>
            <button onClick={() => { setCsvHeaders([]); setCsvRows([]); setMapping({}) }} className="btn btn-sm">
              Reset
            </button>
            {!Object.values(mapping).includes('name') && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ Map at least one column to "Name"</span>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  )
}
