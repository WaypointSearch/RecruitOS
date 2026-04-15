'use client'
import { useState, useRef, useEffect } from 'react'
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
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

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
        <label style={{fontSize:9,fontWeight:700,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:2}}>{label}</label>
        <input type={type} value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} onKeyDown={e=>e.key==='Enter'&&commit()} autoFocus style={{padding:'4px 8px',fontSize:12}} />
      </div>
    )
    const dv = field==='current_salary'&&c?.[field]?`$${c[field].toLocaleString()}`:(c?.[field]||'')
    return(
      <div style={{marginBottom:6,cursor:'pointer'}} onClick={()=>setEditing(true)} title="Click to edit">
        <label style={{fontSize:9,fontWeight:700,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:1}}>{label}</label>
        <p style={{fontSize:12,padding:'2px 0',color:dv?'var(--text-primary)':'var(--text-tertiary)',borderBottom:'1px dashed transparent',transition:'border-color 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'} onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
          {dv||'— click to add —'}
        </p>
      </div>
    )
  }

  if(!c) return <div style={{position:'fixed',top:0,right:0,bottom:0,width:420,background:'var(--card-bg)',borderLeft:'1px solid var(--border)',zIndex:500,padding:24}}><p style={{color:'var(--text-tertiary)'}}>Loading...</p></div>

  const commission = c.current_salary ? Math.round(c.current_salary * 0.2) : null

  return(
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.2)',zIndex:400}} />
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:460,maxWidth:'92vw',background:'var(--card-bg)',borderLeft:'1px solid var(--border)',zIndex:500,display:'flex',flexDirection:'column',boxShadow:'-8px 0 24px rgba(0,0,0,0.12)',animation:'slideInRight 0.2s ease'}}>
        {toast&&<div className="toast toast-success" style={{position:'absolute',top:10,right:10,left:'auto',bottom:'auto',zIndex:10}}>{toast}</div>}

        {/* Header with nav */}
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--card-bg)',zIndex:5}}>
          {/* Nav bar */}
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <button onClick={onPrev} disabled={!hasPrev} className="btn btn-sm" style={{padding:'3px 10px',fontSize:12,opacity:hasPrev?1:0.3}}>← Prev</button>
            <span style={{fontSize:11,color:'var(--text-tertiary)',flex:1,textAlign:'center'}}>{currentIndex} of {totalCount}</span>
            <button onClick={onNext} disabled={!hasNext} className="btn btn-sm" style={{padding:'3px 10px',fontSize:12,opacity:hasNext?1:0.3}}>Next →</button>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text-secondary)',padding:'0 4px',marginLeft:4}}>×</button>
          </div>
          {/* Name + meta */}
          <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{fontSize:16,fontWeight:700}}>{c.name}</h2>
              {c.current_title&&<p style={{fontSize:12,color:'var(--text-secondary)'}}>{c.current_title}{c.current_company?` @ ${c.current_company}`:''}</p>}
              <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                {c.state&&<span style={{display:'inline-flex',padding:'2px 8px',borderRadius:100,fontSize:9,fontWeight:700,color:'white',background:'var(--accent)'}}>{c.state}</span>}
                {(c.disciplines??[]).map((d:string)=><span key={d} style={{display:'inline-flex',padding:'2px 6px',borderRadius:100,fontSize:9,fontWeight:600,color:'white',background:'var(--success)'}}>{d}</span>)}
              </div>
            </div>
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>setShowHotlistAdd(!showHotlistAdd)} className="btn btn-sm" style={{fontSize:10,padding:'4px 8px'}}>🔥</button>
              <button onClick={()=>setShowJobMatch(!showJobMatch)} className="btn btn-sm" style={{fontSize:10,padding:'4px 8px'}}>🎯</button>
              <Link href={`/candidates/${candidateId}`} className="btn btn-sm" style={{textDecoration:'none',fontSize:11}}>Full →</Link>
            </div>
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
            <div style={{padding:'8px 12px',borderRadius:8,marginBottom:12,background:'linear-gradient(135deg,var(--success-bg),var(--accent-bg))',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--success)'}}>💰 ${commission.toLocaleString()} fee</span>
              <span style={{fontSize:10,color:'var(--text-tertiary)'}}>${c.current_salary.toLocaleString()} × 20%</span>
            </div>
          )}

          {/* Contact — phone first, stacked on left */}
          <div style={{marginBottom:14}}>
            <h3 style={{fontSize:11,fontWeight:700,marginBottom:8,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Contact</h3>
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
            <h3 style={{fontSize:11,fontWeight:700,marginBottom:8,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Professional</h3>
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
              <h3 style={{fontSize:11,fontWeight:700,marginBottom:8,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Matched Job Orders</h3>
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

          {c.resume_url&&<div style={{marginBottom:14,padding:'8px 12px',background:'var(--accent-bg)',borderRadius:8}}><a href={c.resume_url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--accent)',textDecoration:'none',fontWeight:600}}>📄 {c.resume_name||'View Resume'}</a></div>}
          {c.tags?.length>0&&<div style={{marginBottom:14}}><h3 style={{fontSize:11,fontWeight:700,marginBottom:6,color:'var(--accent)',textTransform:'uppercase'}}>Tags</h3><div style={{display:'flex',flexWrap:'wrap',gap:4}}>{c.tags.map((t:string)=><span key={t} className="badge badge-gray" style={{fontSize:10}}>{t}</span>)}</div></div>}

          <div><h3 style={{fontSize:11,fontWeight:700,marginBottom:8,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Activity</h3><ActivityFeed candidateId={candidateId} /></div>
        </div>
      </div>
      <style jsx global>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  )
}
