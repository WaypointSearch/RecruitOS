'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'

export default function AddCandidateModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', linkedin: '',
    current_title: '', current_company: '', current_company_url: '',
    time_in_current_role: '', previous_title: '', previous_company: '',
    previous_dates: '', tags: '', source_list: ''
  })
  const router = useRouter()
  const supabase = createSupabaseClient()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('candidates').insert({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      created_by: user!.id
    })
    setLoading(false)
    setOpen(false)
    setForm({ name:'',email:'',phone:'',linkedin:'',current_title:'',current_company:'',
      current_company_url:'',time_in_current_role:'',previous_title:'',previous_company:'',
      previous_dates:'',tags:'',source_list:'' })
    router.refresh()
  }

  if (!open) return (
    <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setOpen(true)}>
      <UserPlus size={13} />Add candidate
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <h2 className="font-semibold text-gray-900">Add candidate</h2>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Full name *</label><input className="input" required value={form.name} onChange={set('name')} /></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
              <div><label className="label">LinkedIn URL</label><input className="input" value={form.linkedin} onChange={set('linkedin')} /></div>
              <div><label className="label">Current title</label><input className="input" value={form.current_title} onChange={set('current_title')} /></div>
              <div><label className="label">Current company</label><input className="input" value={form.current_company} onChange={set('current_company')} /></div>
              <div><label className="label">Company URL</label><input className="input" value={form.current_company_url} onChange={set('current_company_url')} /></div>
              <div><label className="label">Time in current role</label><input className="input" placeholder="e.g. 2 years" value={form.time_in_current_role} onChange={set('time_in_current_role')} /></div>
              <div><label className="label">Previous title</label><input className="input" value={form.previous_title} onChange={set('previous_title')} /></div>
              <div><label className="label">Previous company</label><input className="input" value={form.previous_company} onChange={set('previous_company')} /></div>
              <div><label className="label">Previous dates</label><input className="input" placeholder="Jan 2020 – Mar 2022" value={form.previous_dates} onChange={set('previous_dates')} /></div>
              <div><label className="label">Source list</label><input className="input" placeholder="e.g. Engineering Q1" value={form.source_list} onChange={set('source_list')} /></div>
            </div>
            <div><label className="label">Tags (comma separated)</label><input className="input" placeholder="Engineering, Leadership" value={form.tags} onChange={set('tags')} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving…' : 'Save candidate'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
