'use client'
import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle } from 'lucide-react'

const CRM_FIELDS = [
  { value: 'name', label: 'Name *' },
  { value: 'location', label: 'Location' },
  { value: 'work_email', label: 'Work email' },
  { value: 'personal_email', label: 'Personal email' },
  { value: 'email', label: 'Email (general)' },
  { value: 'work_phone', label: 'Work phone' },
  { value: 'cell_phone', label: 'Cell phone' },
  { value: 'phone', label: 'Phone (general)' },
  { value: 'linkedin', label: 'LinkedIn URL' },
  { value: 'current_salary', label: 'Current salary' },
  { value: 'current_title', label: 'Current title' },
  { value: 'current_company', label: 'Current company' },
  { value: 'current_company_url', label: 'Company URL' },
  { value: 'time_in_current_role', label: 'Time in current role' },
  { value: 'previous_title', label: 'Previous title' },
  { value: 'previous_company', label: 'Previous company' },
  { value: 'previous_dates', label: 'Previous dates' },
  { value: 'tags', label: 'Tags (comma separated)' },
  { value: '__skip__', label: '— Skip column —' },
]

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload')
  const [fileName, setFileName] = useState('')
  const [listName, setListName] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  function handleFile(file: File) {
    setFileName(file.name)
    setListName(file.name.replace(/\.[^/.]+$/, ''))
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        setCsvHeaders(headers)
        setCsvRows(result.data as Record<string, string>[])
        const autoMap: Record<string, string> = {}
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '')
          const match = CRM_FIELDS.find(f => { const fv = f.value.replace(/_/g, '').toLowerCase(); return lower.includes(fv) || fv.includes(lower) })
          autoMap[h] = match?.value ?? '__skip__'
        })
        setMapping(autoMap)
        setStep('map')
      }
    })
  }

  async function runImport() {
    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const records = csvRows.map(row => {
      const rec: Record<string, any> = { created_by: user!.id, source_list: listName, tags: [] }
      Object.entries(mapping).forEach(([csvCol, crmField]) => {
        if (crmField === '__skip__' || !crmField) return
        const val = row[csvCol]?.trim()
        if (!val) return
        if (crmField === 'tags') rec.tags = val.split(',').map((t: string) => t.trim()).filter(Boolean)
        else if (crmField === 'current_salary') rec.current_salary = parseInt(val) || null
        else rec[crmField] = val
      })
      return rec
    }).filter(r => r.name)
    let inserted = 0
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100)
      const { data } = await (supabase as any).from('candidates').insert(chunk).select('id')
      inserted += data?.length ?? 0
    }
    setImportedCount(inserted); setImporting(false); setStep('done')
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 16 }}>Import Candidates from CSV</h1>
      {step === 'upload' && (
        <div className="mac-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}><label className="label">List / tag name</label><input className="input" value={listName} onChange={e => setListName(e.target.value)} placeholder="e.g. Engineering Leaders Q1 2025" style={{ maxWidth: 360 }} /></div>
          <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{ border: '2px dashed var(--border-strong)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'var(--accent)'; (e.currentTarget as any).style.background = 'var(--accent-light)' }}
            onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'var(--border-strong)'; (e.currentTarget as any).style.background = 'transparent' }}>
            <Upload size={32} style={{ margin: '0 auto 12px', color: 'var(--text-4)', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Click to upload or drag & drop</p>
            <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>.csv files only</p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </div>
      )}
      {step === 'map' && (
        <div className="mac-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Map columns from <span style={{ color: 'var(--accent)' }}>{fileName}</span></p><p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{csvRows.length} rows</p></div>
            <div style={{ width: 200 }}><label className="label">List name</label><input className="input" value={listName} onChange={e => setListName(e.target.value)} /></div>
          </div>
          <div style={{ background: 'var(--surface-sunken)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 12, padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>
              <span>CSV column</span><span></span><span>CRM field</span>
            </div>
            {csvHeaders.map(h => (
              <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 12, alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{h}</span>
                <span style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center' }}>→</span>
                <select className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={mapping[h] ?? '__skip__'} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}>
                  {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn" onClick={() => { setStep('upload'); setCsvHeaders([]); setCsvRows([]) }}>← Back</button>
            <button className="btn btn-primary" onClick={runImport} disabled={importing}>{importing ? 'Importing...' : 'Import ' + csvRows.length + ' candidates'}</button>
          </div>
        </div>
      )}
      {step === 'done' && (
        <div className="mac-card" style={{ padding: 48, textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--green)', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Import complete!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>{importedCount} candidates added to "{listName}"</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button className="btn" onClick={() => setStep('upload')}>Import another</button>
            <button className="btn btn-primary" onClick={() => router.push('/candidates')}>View candidates</button>
          </div>
        </div>
      )}
    </div>
  )
}
