'use client'
import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle } from 'lucide-react'

const CRM_FIELDS = [
  { value: 'name', label: 'Name *' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin', label: 'LinkedIn URL' },
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
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        setCsvHeaders(headers)
        setCsvRows(result.data as Record<string, string>[])
        // Auto-guess mappings
        const autoMap: Record<string, string> = {}
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '')
          const match = CRM_FIELDS.find(f => {
            const fv = f.value.replace(/_/g, '').toLowerCase()
            return lower.includes(fv) || fv.includes(lower)
          })
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
      const rec: Record<string, any> = { created_by: user!.id, source_list: listName }
      Object.entries(mapping).forEach(([csvCol, crmField]) => {
        if (crmField === '__skip__' || !crmField) return
        const val = row[csvCol]?.trim()
        if (!val) return
        if (crmField === 'tags') rec.tags = val.split(',').map((t: string) => t.trim()).filter(Boolean)
        else rec[crmField] = val
      })
      if (!rec.tags) rec.tags = []
      return rec
    }).filter(r => r.name) // name is required

    // Batch insert in chunks of 100
    let inserted = 0
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100)
      const { data } = await (supabase.from('candidates') as any).insert(chunk).select('id')
      inserted += data?.length ?? 0
    }
    setImportedCount(inserted)
    setImporting(false)
    setStep('done')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Import Candidates from CSV</h1>

      {step === 'upload' && (
        <div className="card p-6">
          <div className="mb-4">
            <label className="label">List / tag name</label>
            <input className="input max-w-sm" value={listName} onChange={e => setListName(e.target.value)}
              placeholder="e.g. Engineering Leaders Q1 2025" />
          </div>
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
            <Upload className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
            <p className="text-xs text-gray-400 mt-1">.csv files only · up to 10,000 rows</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </div>
      )}

      {step === 'map' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Map columns from <span className="text-blue-600">{fileName}</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{csvRows.length} rows detected</p>
            </div>
            <div className="mb-4">
              <label className="label">List name</label>
              <input className="input" value={listName} onChange={e => setListName(e.target.value)} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg overflow-hidden mb-5">
            <div className="grid grid-cols-[1fr_32px_1fr] gap-3 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <span>CSV column</span><span></span><span>CRM field</span>
            </div>
            {csvHeaders.map(h => (
              <div key={h} className="grid grid-cols-[1fr_32px_1fr] gap-3 items-center px-4 py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700 font-mono truncate">{h}</span>
                <span className="text-gray-400 text-xs text-center">→</span>
                <select
                  className="input py-1.5 text-sm"
                  value={mapping[h] ?? '__skip__'}
                  onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}>
                  {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {csvRows.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview (first 3 rows)</p>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="text-xs w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {csvHeaders.filter(h => mapping[h] !== '__skip__').map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500">{mapping[h]}</th>
                    ))}
                  </tr></thead>
                  <tbody>{csvRows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      {csvHeaders.filter(h => mapping[h] !== '__skip__').map(h => (
                        <td key={h} className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button className="btn" onClick={() => { setStep('upload'); setCsvHeaders([]); setCsvRows([]) }}>← Back</button>
            <button className="btn btn-primary" onClick={runImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${csvRows.length} candidates`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card p-10 text-center">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Import complete!</h2>
          <p className="text-sm text-gray-500 mb-6">{importedCount} candidates added to the list "{listName}"</p>
          <div className="flex justify-center gap-3">
            <button className="btn" onClick={() => setStep('upload')}>Import another</button>
            <button className="btn btn-primary" onClick={() => router.push('/candidates')}>View candidates</button>
          </div>
        </div>
      )}
    </div>
  )
}
