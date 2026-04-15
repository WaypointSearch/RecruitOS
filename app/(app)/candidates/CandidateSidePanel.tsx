'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import ActivityFeed from './[id]/ActivityFeed'

interface Props {
  candidateId: string; onClose: () => void; onUpdated?: () => void
  onNext?: () => void; onPrev?: () => void; hasNext?: boolean; hasPrev?: boolean
  currentIndex?: number; totalCount?: number
}

export default function CandidateSidePanel({ candidateId, onClose, onUpdated, onNext, onPrev, hasNext, hasPrev, currentIndex, totalCount }: Props) {
  const sb = useRef(createClientComponentClient()).current
  const [c, setC] = useState<any>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [hotlists, setHotlists] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [showHotlistAdd, setShowHotlistAdd] = useState(false)
  const [showJobMatch, setShowJobMatch] = useState(false)
  const [selectedHotlist, setSelectedHotlist] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarFocused, setAvatarFocused] = useState(false)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleAvatarPaste = useCallback(async (e: ClipboardEvent) => {
    if (!avatarFocused) return
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        setUploadingAvatar(true)
        const blob = items[i].getAsFile()
        if (!blob) { setUploadingAvatar(false); return }
        const ext = blob.type.split('/')[1] || 'png'
        const path = candidateId + '/avatar-' + Date.now() + '.' + ext
        const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert: true })
        if (error) { showToast('Upload failed: ' + error.message); setUploadingAvatar(false); return }
        const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path)
        await (sb as any).from('candidates').update({ avatar_url: publicUrl }).eq('id', candidateId)
        setC((prev: any) => ({ ...prev, avatar_url: publicUrl }))
        showToast('Avatar saved!')
        setUploadingAvatar(false)
        if (onUpdated) onUpdated()
        return
      }
    }
  }, [avatarFocused, candidateId, sb, onUpdated])

  useEffect(() => {
    document.addEventListener('paste', handleAvatarPaste)
    return () => document.removeEventListener('paste', handleAvatarPaste)
  }, [handleAvatarPaste])

  const load = async () => {
    const {data} = await (sb as any).from('candidates').select('*').eq('id', candidateId).single()
    setC(data)
    const {data:p} = await (sb as any).from('pipeline').select('*, jobs(id, title, companies(name))').eq('candidate_id', candidateId)
    setPipeline(p??[])
    const {data:hl} = await (sb as any).from('hotlists').select('*').order('name')
    setHotlists(hl??[])
    const {data:j} = await (sb as any).from('jobs').select('id, title, companies(name)').eq('status','Active').order('title')
    setJobs(j??[])
  }
  useEffect(() => { load() }, [candidateId])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext && onNext) { e.preventDefault(); onNext() }
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) { e.preventDefault(); onPrev() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasNext, hasPrev, onNext, onPrev, onClose])

  const saveField = async (field: string, value: string) => {
    const update: any = {}
    if (field === 'current_salary') update[field] = value ? parseInt(value.replace(/[^0-9]/g, '')) : null
    else update[field] = value || null
    setC((prev: any) => ({ ...prev, ...update }))
    await (sb as any).from('candidates').update(update).eq('id', candidateId)
    showToast('Saved')
    if (onUpdated) onUpdated()
  }

  const addToHotlist = async () => {
    if (!selectedHotlist) return
    const {data:{user}} = await sb.auth.getUser()
    const {data:ex} = await (sb as any).from('hotlist_candidates').select('id').eq('hotlist_id',selectedHotlist).eq('candidate_id',candidateId).limit(1)
    if (ex && ex.length > 0) { showToast('Already in this hotlist'); setShowHotlistAdd(false); return }
    await (sb as any).from('hotlist_candidates').insert([{hotlist_id:selectedHotlist,candidate_id:candidateId,added_by:user?.id}])
    showToast('Added to hotlist! 🔥'); setShowHotlistAdd(false); setSelectedHotlist('')
  }

  const matchToJob = async () => {
    if (!selectedJob) return
    const {data:{user}} = await sb.auth.getUser()
    const {data:ex} = await (sb as any).from('pipeline').select('id').eq('job_id',selectedJob).eq('candidate_id',candidateId).limit(1)
    if (ex && ex.length > 0) { showToast('Already matched to this job'); setShowJobMatch(false); return }
    await (sb as any).from('pipeline').insert([{
      job_id:selectedJob, candidate_id:candidateId, stage:'Prescreen Scheduled',
      added_by:user?.id, recruiter_id:user?.id, moved_at:new Date().toISOString()
    }])
    // Log activity
    await (sb as any).from('activities').insert([{
      candidate_id:candidateId, job_id:selectedJob, type:'stage_change',
      content:'Matched to job order', created_by:user?.id,
      created_by_name:user?.email?.split('@')[0]
    }])
    showToast('Matched to job! 🎯'); setShowJobMatch(false); setSelectedJob(''); load()
  }

  const Field = ({label,field,type='text'}:{label:string;field:string;type?:string}) => {
    const [editing,setEditing] = useState(false)
    const [val,setVal] = useState('')
    useEffect(() => {setVal(c?.[field]??'')}, [c?.[field]])
    const commit = () => {if(val!==String(c?.[field]??''))saveField(field,val);setEditing(false)}
    if(editing) return(
      <div style={{marginBottom:6}}>
        <label style={{fontSize:10,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:2}}>{label}</label>
        <input type={type} value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} onKeyDown={e=>e.key==='Enter'&&commit()} autoFocus style={{padding:'4px 8px',fontSize:12}} />
      </div>
    )
    const dv = field==='current_salary'&&c?.[field]?`$${c[field].toLocaleString()}`:(c?.[field]||'')
    return(
      <div style={{marginBottom:6,cursor:'pointer'}} onClick={()=>setEditing(true)} title="Click to edit">
        <label style={{fontSize:10,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:1}}>{label}</label>
        <p style={{fontSize:14,padding:'3px 0',color:dv?'var(--text-primary)':'var(--text-tertiary)',borderBottom:'1px dashed transparent',transition:'border-color 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'} onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
          {dv||'— click to add —'}
        </p>
      </div>
    )
  }

  if(!c) return <div style={{position:'fixed',top:0,right:0,bottom:0,width:420,background:'var(--panel-bg)',borderLeft:'1px solid var(--border)',zIndex:500,padding:24}}><p style={{color:'var(--text-tertiary)'}}>Loading...</p></div>

  const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null

  return(
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.2)',zIndex:400}} />
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:460,maxWidth:'92vw',background:'var(--panel-bg)',borderLeft:'1px solid var(--border)',zIndex:500,display:'flex',flexDirection:'column',boxShadow:'-8px 0 24px rgba(0,0,0,0.12)',animation:'slideInRight 0.2s ease'}}>
        {toast&&<div className="toast toast-success" style={{position:'absolute',top:10,right:10,left:'auto',bottom:'auto',zIndex:10}}>{toast}</div>}

        {/* Header with nav */}
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--panel-bg)',zIndex:5}}>
          {/* Nav bar */}
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <button onClick={onPrev} disabled={!hasPrev} className="btn btn-sm" style={{padding:'3px 10px',fontSize:12,opacity:hasPrev?1:0.3}}>← Prev</button>
            <span style={{fontSize:11,color:'var(--text-tertiary)',flex:1,textAlign:'center'}}>{currentIndex} of {totalCount}</span>
            <button onClick={onNext} disabled={!hasNext} className="btn btn-sm" style={{padding:'3px 10px',fontSize:12,opacity:hasNext?1:0.3}}>Next →</button>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text-secondary)',padding:'0 4px',marginLeft:4}}>×</button>
          </div>
          {/* Avatar + Name — centered card */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',paddingBottom:4}}>
            <div
              tabIndex={0}
              onClick={e => e.currentTarget.focus()}
              onFocus={() => setAvatarFocused(true)}
              onBlur={() => setAvatarFocused(false)}
              title={c.avatar_url ? 'Click here, then Ctrl+V to change photo' : 'Click here, then Ctrl+V to paste a photo'}
              style={{width:64,height:64,borderRadius:'50%',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,overflow:'hidden',cursor:'pointer',border:avatarFocused?'2px solid var(--neon-green)':'2px solid var(--accent)',background:c.avatar_url?'transparent':'var(--accent)',color:'white',transition:'all 0.25s',outline:'none',boxShadow:avatarFocused?'0 0 16px var(--neon-green)':'none'}}
            >
              {uploadingAvatar ? <span style={{fontSize:14}}>⏳</span>
              : c.avatar_url ? <img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
              : c.name?.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)}
            </div>
            {avatarFocused && <p style={{fontSize:10,color:'var(--neon-green)',marginBottom:4,fontWeight:600}}>Ready — paste image (Ctrl+V)</p>}
            <h2 style={{fontSize:18,fontWeight:700}}>{c.name}</h2>
            {c.current_title&&<p style={{fontSize:14,color:'var(--text-secondary)',marginTop:2}}>{c.current_title}{c.current_company?` @ ${c.current_company}`:''}</p>}
            <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap',justifyContent:'center'}}>
              {c.state&&<span className="panel-pill-glow" style={{display:'inline-flex',padding:'3px 10px',borderRadius:100,fontSize:10,fontWeight:700,color:'var(--accent)',background:'var(--accent-bg)',border:'1px solid var(--accent)'}}>{c.state}</span>}
              {(c.disciplines??[]).map((d:string)=><span key={d} className="panel-pill-glow" style={{display:'inline-flex',padding:'3px 8px',borderRadius:100,fontSize:9,fontWeight:600,color:'var(--neon-green)',background:'var(--success-bg)',border:'1px solid var(--neon-green)',animationDelay:Math.random()*2+'s'}}>{d}</span>)}
            </div>
          </div>
          <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:6}}>
            <button onClick={()=>setShowHotlistAdd(!showHotlistAdd)} className="btn btn-sm" style={{fontSize:11,padding:'5px 10px'}}>🔥 Hotlist</button>
            <button onClick={()=>setShowJobMatch(!showJobMatch)} className="btn btn-sm" style={{fontSize:11,padding:'5px 10px'}}>🎯 Match</button>
            <Link href={`/candidates/${candidateId}`} className="btn btn-sm" style={{textDecoration:'none',fontSize:11,padding:'5px 10px'}}>Full Profile →</Link>
          </div>
        </div>

        {/* Hotlist add */}
        {showHotlistAdd&&(
          <div style={{padding:'8px 16px',borderBottom:'1px solid var(--border)',background:'var(--warning-bg)',display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:14}}>🔥</span>
            {hotlists.length===0?<span style={{fontSize:12,color:'var(--text-secondary)'}}>No hotlists. <Link href="/hotlists" style={{color:'var(--accent)'}}>Create →</Link></span>
            :<><select value={selectedHotlist} onChange={e=>setSelectedHotlist(e.target.value)} style={{flex:1,fontSize:12}}>
              <option value="">Select hotlist...</option>{hotlists.map((h:any)=><option key={h.id} value={h.id}>{h.name}</option>)}
            </select><button onClick={addToHotlist} disabled={!selectedHotlist} className="btn btn-primary btn-sm" style={{fontSize:11}}>Add</button></>}
          </div>
        )}

        {/* Job match */}
        {showJobMatch&&(
          <div style={{padding:'8px 16px',borderBottom:'1px solid var(--border)',background:'var(--accent-bg)',display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:14}}>🎯</span>
            {jobs.length===0?<span style={{fontSize:12,color:'var(--text-secondary)'}}>No active jobs. <Link href="/jobs" style={{color:'var(--accent)'}}>Create one →</Link></span>
            :<><select value={selectedJob} onChange={e=>setSelectedJob(e.target.value)} style={{flex:1,fontSize:12}}>
              <option value="">Select job order...</option>{jobs.map((j:any)=><option key={j.id} value={j.id}>{j.title} — {j.companies?.name}</option>)}
            </select><button onClick={matchToJob} disabled={!selectedJob} className="btn btn-primary btn-sm" style={{fontSize:11}}>Match</button></>}
          </div>
        )}

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'12px 16px'}}>
          {commission&&(
            <div className="commission-banner">
              <span style={{fontSize:15,fontWeight:800,color:'var(--neon-green)'}}>💰 ${commission.toLocaleString()}</span>
              <span style={{fontSize:10,color:'var(--text-secondary)'}}>${c.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          {/* Contact — phone first, stacked on left */}
          <div style={{marginBottom:14}}>
            <h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Contact</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
              <Field label="Work Phone" field="work_phone" type="tel" />
              <Field label="Cell Phone" field="cell_phone" type="tel" />
              <Field label="Work Email" field="work_email" type="email" />
              <Field label="Personal Email" field="personal_email" type="email" />
            </div>
            {c.linkedin&&<div style={{marginTop:2}}><label style={{fontSize:9,fontWeight:700,color:'var(--accent)',textTransform:'uppercase'}}>LinkedIn</label><a href={c.linkedin} target="_blank" rel="noreferrer" style={{fontSize:11,color:'var(--accent)',display:'block',wordBreak:'break-all'}}>{c.linkedin.length>55?c.linkedin.slice(0,53)+'…':c.linkedin}</a></div>}
          </div>

          {/* Professional */}
          <div style={{marginBottom:14}}>
            <h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Professional</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
              <Field label="Title" field="current_title" />
              <Field label="Company" field="current_company" />
              <Field label="Location" field="location" />
              <Field label="State" field="state" />
              <Field label="Salary" field="current_salary" type="number" />
              <Field label="Time in Role" field="time_in_current_role" />
              <Field label="Previous Title" field="previous_title" />
              <Field label="Previous Company" field="previous_company" />
            </div>
          </div>

          {/* Pipeline — linked to job orders */}
          {pipeline.length>0&&(
            <div style={{marginBottom:14}}>
              <h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Matched Job Orders</h3>
              {pipeline.map((p:any)=>(
                <Link key={p.id} href={`/pipeline/${p.job_id || p.jobs?.id}`} style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:6,marginBottom:4,background:'var(--card-bg-hover)',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--accent-bg)'} onMouseLeave={e=>e.currentTarget.style.background='var(--card-bg-hover)'}>
                  <span style={{fontSize:14}}>🎯</span>
                  <div style={{flex:1}}>
                    <p style={{fontSize:12,fontWeight:600,color:'var(--accent)'}}>{p.jobs?.title||'Job Order'}</p>
                    <p style={{fontSize:10,color:'var(--text-secondary)'}}>{p.jobs?.companies?.name} · {p.stage}</p>
                  </div>
                  <span style={{fontSize:11,color:'var(--text-tertiary)'}}>→</span>
                </Link>
              ))}
            </div>
          )}

          {c.tags?.length>0&&<div style={{marginBottom:14}}><h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Tags</h3><div style={{display:'flex',flexWrap:'wrap',gap:4}}>{c.tags.map((t:string)=><span key={t} className="badge badge-gray" style={{fontSize:11}}>{t}</span>)}</div></div>}

                    {/* Documents */}
          <div style={{marginBottom:14}}>
            <h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Documents</h3>
            {c.resume_url ? (
              <div style={{padding:'8px 12px',background:'var(--accent-bg)',borderRadius:8,display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>📄</span>
                <a href={c.resume_url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--accent)',textDecoration:'none',fontWeight:600,flex:1}}>{c.resume_name||'View Resume'}</a>
                <button onClick={async()=>{await(sb as any).from('candidates').update({resume_url:null,resume_name:null}).eq('id',candidateId);load();showToast('Removed')}} className="btn btn-sm" style={{fontSize:10,color:'var(--danger)',padding:'2px 6px'}}>×</button>
              </div>
            ) : (
              <div onClick={()=>document.getElementById('sidepanel-resume-input')?.click()} style={{border:'1px dashed var(--border)',borderRadius:8,padding:'12px',textAlign:'center',cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='var(--accent-bg)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent'}}>
                <p style={{fontSize:11,fontWeight:600}}>📎 Upload Resume</p>
                <p style={{fontSize:10,color:'var(--text-tertiary)'}}>PDF or Word, max 10MB</p>
              </div>
            )}
            <input id="sidepanel-resume-input" type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={async(e)=>{
              const file=e.target.files?.[0];if(!file)return
              const ext=file.name.split('.').pop()
              const path=candidateId+'/'+Date.now()+'.'+ext
              const{error:ue}=await sb.storage.from('resumes').upload(path,file)
              if(ue){showToast('Upload failed');return}
              const{data:{publicUrl}}=sb.storage.from('resumes').getPublicUrl(path)
              await(sb as any).from('candidates').update({resume_url:publicUrl,resume_name:file.name}).eq('id',candidateId)
              load();showToast('Resume uploaded! 📄')
            }} />
          </div>

          <div><h3 style={{fontSize:12,fontWeight:700,marginBottom:10,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Activity</h3><ActivityFeed candidateId={candidateId} /></div>
        </div>
      </div>
      <style jsx global>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  )
}
