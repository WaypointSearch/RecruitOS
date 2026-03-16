'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

export default function AddCompanyModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [form, setForm] = useState({
    name: '',
    status: 'Prospect',
    industry: '',
    website: '',
    location: '',
    notes: '',
    contact_name: '',
    contact_title: '',
    contact_email: '',
    contact_phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([
          {
            name: form.name,
            status: form.status,
            website: form.website || null,
            industry: form.industry || null,
            location: form.location || null,
            notes: form.notes || null,
            user_id: user.id,
          },
        ])
        .select()
        .single()

      if (companyError) throw companyError

      if (company && form.contact_name) {
        const { error: contactError } = await supabase
          .from('company_contacts')
          .insert([
            {
              company_id: (company as any).id,
              name: form.contact_name,
              title: form.contact_title || null,
              email: form.contact_email || null,
              phone: form.contact_phone || null,
            },
          ] as any)
        if (contactError) throw contactError
      }

      setOpen(false)
      setForm({ name: '', status: 'Prospect', industry: '', website: '', location: '', notes: '', contact_name: '', contact_title: '', contact_email: '', contact_phone: '' })
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error adding company')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add Company</button>

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <h2 className="text-lg font-bold">Add Company</h2>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">Company Name</label>
            <input required className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="Prospect">Prospect</option>
                <option value="Client">Client</option>
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="City, State" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
          </div>
          <div className="border-t dark:border-gray-800 pt-4 mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Primary Contact (Optional)</p>
            <div className="space-y-3">
              <input className="input" placeholder="Contact Name" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
              <input className="input" placeholder="Title" value={form.contact_title} onChange={e => setForm({...form, contact_title: e.target.value})} />
              <input className="input" placeholder="Email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-gray">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save Company'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
