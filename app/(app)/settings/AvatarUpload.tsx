'use client'
import { useState, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Camera, Loader } from 'lucide-react'

export default function AvatarUpload({
  userId,
  currentUrl,
  name,
  onUpdated,
}: {
  userId: string
  currentUrl: string | null
  name: string
  onUpdated: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseClient()

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return }

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    // Save to profile
    await (supabase as any).from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)

    setUploading(false)
    onUpdated(publicUrl)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => inputRef.current?.click()}>
        {currentUrl
          ? <img src={currentUrl} alt={name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
          : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-text)', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {initials(name)}
            </div>
        }
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
          {uploading ? <Loader size={11} style={{ color: 'white', animation: 'spin 1s linear infinite' }} /> : <Camera size={11} style={{ color: 'white' }} />}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      <p style={{ fontSize: 11, color: 'var(--text-4)' }}>Click to change photo</p>
      {error && <p style={{ fontSize: 11, color: 'var(--red-text)' }}>{error}</p>}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
