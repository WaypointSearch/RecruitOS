'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Building2, X } from 'lucide-react'

export default function AddCompanyModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', status: 'Prospect', website: '', industry: '', notes: '',
    contact_name: '', contact_title: '', contact_email: '', contact_phone: '', contact_linkedin: ''
  })
  const router = useRouter()
  const supabase = createSupabaseClient()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: company } = await supabase.from('companies').insert([{
      name: form.name, status: form.status as 'Prospect' | 'Client',
      website: form.website || null, industry: form.industry || null,
      notes: form.notes || null, created_by: user!.id,
    }).select().single()

    if (company && form.contact_name) {
      await supabase.from('company_contacts').insert([{
        company_id: company.id, name: form.contact_name,
        title: form.contact_title || null, email: form.contact_email || null,
        phone: form.contact_phone || null, linkedin: form.contact_linkedin || null,
      })
    }
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setOpen(true)}>
      <Building2 size={13} />Add company
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <h2 className="font-semibold">Add company</h2>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="label">Company name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
              <div><label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option>Prospect</option><option>Client</option>
                </select>
              </div>
              <div><label className="label">Industry</label><input className="input" value={form.industry} onChange={set('industry')} /></div>
              <div className="col-span-2"><label className="label">Website</label><input className="input" value={form.website} onChange={set('website')} /></div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Primary contact (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Name</label><input className="input" value={form.contact_name} onChange={set('contact_name')} /></div>
                <div><label className="label">Title</label><input className="input" value={form.contact_title} onChange={set('contact_title')} /></div>
                <div><label className="label">Email</label><input className="input" type="email" value={form.contact_email} onChange={set('contact_email')} /></div>
                <div><label className="label">Phone</label><input className="input" value={form.contact_phone} onChange={set('contact_phone')} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving…' : 'Save company'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
