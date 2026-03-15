'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Briefcase, X } from 'lucide-react'

export default function AddJobModal({
  companies,
  contacts
}: {
  companies: { id: string; name: string }[]
  contacts: { id: string; name: string; company_id: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    salary_min: '',
    salary_max: '',
    location: '',
    status: 'Active',
    company_id: '',
    contact_id: ''
  })

  const router = useRouter()
  const supabase = createSupabaseClient()

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const filteredContacts = contacts.filter(c => c.company_id === form.company_id)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('jobs').insert([
      {
        title: form.title,
        description: form.description || null,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        location: form.location || null,
        status: form.status as any,
        company_id: form.company_id,
        contact_id: form.contact_id || null,
        created_by: user!.id,
      }
    ])

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open)
    return (
      <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setOpen(true)}>
        <Briefcase size={13} />
        Add job order
      </button>
    )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <h2 className="font-semibold">Add job order</h2>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} className="p-5 space-y-3">

            <div>
              <label className="label">Job title *</label>
              <input
                className="input"
                required
                value={form.title}
                onChange={set('title')}
                placeholder="VP of Engineering"
              />
            </div>

            <div>
              <label className="label">Client company *</label>
              <select
                className="input"
                required
                value={form.company_id}
                onChange={set('company_id')}
              >
                <option value="">Select client…</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {filteredContacts.length > 0 && (
              <div>
                <label className="label">Company contact</label>
                <select
                  className="input"
                  value={form.contact_id}
                  onChange={set('contact_id')}
                >
                  <option value="">Select contact…</option>
                  {filteredContacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Salary min</label>
                <input
                  className="input"
                  type="number"
                  placeholder="160000"
                  value={form.salary_min}
                  onChange={set('salary_min')}
                />
              </div>

              <div>
                <label className="label">Salary max</label>
                <input
                  className="input"
                  type="number"
                  placeholder="200000"
                  value={form.salary_max}
                  onChange={set('salary_max')}
                />
              </div>
            </div>

            <div>
              <label className="label">Location</label>
              <input
                className="input"
                placeholder="Remote / San Francisco, CA"
                value={form.location}
                onChange={set('location')}
              />
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={set('status')}
              >
                <option>Active</option>
                <option>On Hold</option>
                <option>Filled</option>
                <option>Cancelled</option>
              </select>
            </div>

            <div>
              <label className="label">Job description</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={form.description}
                onChange={set('description')}
                placeholder="Role overview, requirements, responsibilities…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>

              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving…' : 'Create job order'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}