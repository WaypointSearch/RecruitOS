'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import AddCandidateModal from './AddCandidateModal'
import CandidateSidePanel from './CandidateSidePanel'
import { getAllStateAbbrs, US_STATES, getCitiesForState, getDisciplineNames } from '@/lib/geo-intelligence'

// State color palette — vivid, unique per state region
const STATE_COLORS: Record<string,string> = {
  'NY':'#b388ff','NJ':'#9c7cff','CT':'#7c6cff','MA':'#8b5cf6','PA':'#7c4dff',
  'GA':'#ffab40','FL':'#ffd740','NC':'#00e5ff','SC':'#00bcd4','VA':'#ea80fc',
  'TX':'#ffd740','CO':'#69f0ae','CA':'#40c4ff','WA':'#18ffff','OR':'#64ffda',
  'IL':'#b388ff','OH':'#ea80fc','MI':'#ce93d8','IN':'#b39ddb','WI':'#9fa8da',
  'MD':'#f48fb1','DC':'#ea80fc','TN':'#ffcc80','AL':'#ffab40',
  'AZ':'#b2ff59','NV':'#69f0ae','UT':'#00e676','NM':'#00c853',
  'MN':'#80deea','MO':'#4fc3f7','KS':'#29b6f6','IA':'#03a9f4',
  'LA':'#b388ff','MS':'#9575cd','AR':'#7e57c2','OK':'#673ab7',
  'KY':'#ffcc80','WV':'#ffab40',
}
const getStateColor = (s: string) => STATE_COLORS[s] || 'var(--accent)'

// Discipline colors
const DISC_COLORS: Record<string,string> = {
  'Mechanical':'#69f0ae','Electrical':'#40c4ff','Plumbing':'#00e676',
  'Fire Protection':'#ffab40','Management':'#b388ff','Engineering':'#18ffff',
  'Estimating':'#ea80fc','Sales':'#ffd740','Construction':'#b2ff59',
}

export default function CandidatesPage() {
  const sb = useRef(createClientComponentClient()).current
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allTags, setAllTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(0)
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sidePanelId, setSidePanelId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [toast, setToast] = useState<string | null>(null)
  const [lastContacted, setLastContacted] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hotlists, setHotlists] = useState<any[]>([])
  const [showHotlistAdd, setShowHotlistAdd] = useState(false)
  const [selectedHotlist, setSelectedHotlist] = useState('')
  const [radiusResults, setRadiusResults] = useState<any[] | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const {count} = await (sb as any).from('candidates').select('id',{count:'exact',head:true})
    setTotalCount(count||0)
    let all: any[] = []; let from = 0
    while (true) {
      const {data} = await (sb as any).from('candidates').select('*').order('name').range(from, from+999)
      if (!data||!data.length) break; all=all.concat(data); if (data.length<1000) break; from+=1000
    }
    setCandidates(all)
    setAllTags(Array.from(new Set(all.flatMap((c:any) => c.tags??[]).filter(Boolean))).sort() as string[])
    const ids=all.slice(0,500).map((c:any)=>c.id); const map:Record<string,string>={}
    for (let i=0;i<ids.length;i+=100) {
      const chunk=ids.slice(i,i+100)
      const {data:acts}=await(sb as any).from('activities').select('candidate_id,created_at').in('candidate_id',chunk).order('created_at',{ascending:false}).limit(500)
      if(acts) acts.forEach((a:any)=>{if(!map[a.candidate_id])map[a.candidate_id]=a.created_at})
    }
    setLastContacted(map)
    const {data:hl}=await(sb as any).from('hotlists').select('*').order('name')
    setHotlists(hl??[])
    setLoading(false)
  }, [sb])

  useEffect(()=>{load()},[load])

  // Radius search
  const doRadiusSearch = useCallback(async () => {
    if (!cityFilter||radiusMiles<=0) {setRadiusResults(null);return}
    const cities=getCitiesForState(stateFilter)
    const city=cities.find(c=>c.name===cityFilter)
    if (!city) {setRadiusResults(null);return}
    try {
      const {data,error}=await(sb as any).rpc('search_candidates_by_radius',{lat:city.lat,lng:city.lng,radius_miles:radiusMiles})
      if (error){setRadiusResults(null);return}
      setRadiusResults(data??[])
    } catch {setRadiusResults(null)}
  },[stateFilter,cityFilter,radiusMiles,sb])
  useEffect(()=>{doRadiusSearch()},[doRadiusSearch])

  const baseList = radiusResults!==null?radiusResults:candidates
  const filtered = baseList.filter((c:any)=>{
    const kws=search.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if(kws.length>0){const s=[c.name,c.current_title,c.current_company,c.location,c.metro_area,c.state,c.email,c.work_email,c.previous_title,c.previous_company,c.linkedin,c.ai_notes,...(c.tags??[]),...(c.disciplines??[])].filter(Boolean).join(' ').toLowerCase();if(!kws.every((kw:string)=>s.includes(kw)))return false}
    if(stateFilter&&radiusResults===null){if(c.state!==stateFilter){const sn=US_STATES[stateFilter]?.toLowerCase();if(!sn||!(c.location||'').toLowerCase().includes(sn))return false}}
    if(cityFilter&&radiusMiles<=0&&radiusResults===null){if(!(c.location||'').toLowerCase().includes(cityFilter.toLowerCase())&&c.metro_area!==cityFilter)return false}
    if(disciplineFilter&&!(c.disciplines??[]).includes(disciplineFilter))return false
    if(tagFilter&&!(c.tags??[]).includes(tagFilter))return false
    return true
  })

  const sorted=[...filtered].sort((a:any,b:any)=>{
    if(sortBy==='last_contacted')return(lastContacted[b.id]||'1970').localeCompare(lastContacted[a.id]||'1970')
    if(sortBy==='created_at')return(b.created_at||'').localeCompare(a.created_at||'')
    if(sortBy==='has_resume')return(b.resume_url?1:0)-(a.resume_url?1:0)
    return(a.name||'').localeCompare(b.name||'')
  })

  const totalPages=Math.ceil(sorted.length/pageSize)
  const paginated=sorted.slice((page-1)*pageSize,page*pageSize)
  // Build ordered IDs for next/prev in side panel
  const sortedIds = sorted.map((c:any) => c.id)

  const toggleSelect=(id:string)=>{setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
  const toggleAll=()=>{setSelected(selected.size===paginated.length?new Set():new Set(paginated.map((c:any)=>c.id)))}
  const bulkDelete=async()=>{const ids=Array.from(selected);for(let i=0;i<ids.length;i+=50)await(sb as any).from('candidates').delete().in('id',ids.slice(i,i+50));showToast(`Deleted ${ids.length}`);setSelected(new Set());setConfirmBulkDelete(false);load()}
  const bulkAddToHotlist=async()=>{if(!selectedHotlist||selected.size===0)return;const{data:{user}}=await sb.auth.getUser();const ids=Array.from(selected);let added=0;for(const cid of ids){const{data:ex}=await(sb as any).from('hotlist_candidates').select('id').eq('hotlist_id',selectedHotlist).eq('candidate_id',cid).limit(1);if(!ex||ex.length===0){await(sb as any).from('hotlist_candidates').insert([{hotlist_id:selectedHotlist,candidate_id:cid,added_by:user?.id}]);added++}};showToast(`Added ${added} to hotlist`);setShowHotlistAdd(false);setSelected(new Set())}

  const clearFilters=()=>{setSearch('');setStateFilter('');setCityFilter('');setRadiusMiles(0);setDisciplineFilter('');setTagFilter('');setRadiusResults(null);setPage(1)}
  const stateCities=stateFilter?getCitiesForState(stateFilter):[]
  const initials=(n:string)=>n?.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)||'?'
  const colors=['#007aff','#30d158','#ff9f0a','#ff3b30','#af52de','#5856d6','#ff2d55','#00c7be']
  const colorFor=(n:string)=>colors[Math.abs((n||'').charCodeAt(0)+(n||'').length)%colors.length]
  const fmtContact=(id:string)=>{const d=lastContacted[id];if(!d)return'—';const days=Math.floor((Date.now()-new Date(d).getTime())/86400000);if(days===0)return'Today';if(days===1)return'Yday';if(days<7)return`${days}d`;if(days<30)return`${Math.floor(days/7)}w`;return`${Math.floor(days/30)}mo`}
  const hasFilters=search||stateFilter||cityFilter||disciplineFilter||tagFilter

  // Navigate to next/prev candidate in side panel
  const navigateSidePanel = (dir: number) => {
    if (!sidePanelId) return
    const idx = sortedIds.indexOf(sidePanelId)
    if (idx === -1) return
    const newIdx = idx + dir
    if (newIdx >= 0 && newIdx < sortedIds.length) setSidePanelId(sortedIds[newIdx])
  }

  return (
    <div>
      {toast&&<div className="toast toast-success">{toast}</div>}
      {showAddModal&&<AddCandidateModal onClose={()=>setShowAddModal(false)} onAdded={()=>{setShowAddModal(false);load()}} />}
      {sidePanelId&&<CandidateSidePanel candidateId={sidePanelId} onClose={()=>setSidePanelId(null)} onUpdated={load}
        onNext={()=>navigateSidePanel(1)} onPrev={()=>navigateSidePanel(-1)}
        hasNext={sortedIds.indexOf(sidePanelId)<sortedIds.length-1} hasPrev={sortedIds.indexOf(sidePanelId)>0}
        currentIndex={sortedIds.indexOf(sidePanelId)+1} totalCount={sortedIds.length} />}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <h1 style={{fontSize:24,fontWeight:700,letterSpacing:'-0.02em'}}>Candidates <span style={{fontSize:15,fontWeight:400,color:'var(--text-tertiary)'}}>({totalCount.toLocaleString()})</span></h1>
        <div style={{display:'flex',gap:6}}>
          <Link href="/hotlists" className="btn btn-sm" style={{textDecoration:'none'}}>🔥 Hotlists</Link>
          <Link href="/import" className="btn btn-sm" style={{textDecoration:'none'}}>⬆ Import</Link>
          <button onClick={()=>setShowAddModal(true)} className="btn btn-primary btn-sm">+ Add</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{padding:'10px 14px',marginBottom:10,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <input type="search" placeholder="Keywords: mechanical, engineer, HVAC..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{flex:1,minWidth:160}} />
        <select value={stateFilter} onChange={e=>{setStateFilter(e.target.value);setCityFilter('');setRadiusMiles(0);setRadiusResults(null);setPage(1)}} style={{maxWidth:140}}>
          <option value="">All States</option>
          {getAllStateAbbrs().map(s=><option key={s} value={s}>{s} — {US_STATES[s]}</option>)}
        </select>
        {stateFilter&&stateCities.length>0&&(
          <select value={cityFilter} onChange={e=>{setCityFilter(e.target.value);setRadiusMiles(0);setRadiusResults(null);setPage(1)}} style={{maxWidth:150}}>
            <option value="">All {US_STATES[stateFilter]}</option>
            {stateCities.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        )}
        {cityFilter&&(
          <select value={radiusMiles} onChange={e=>{setRadiusMiles(parseInt(e.target.value));setPage(1)}} style={{maxWidth:120}}>
            <option value="0">No radius</option>
            <option value="10">10 mi radius</option>
            <option value="25">25 mi radius</option>
            <option value="50">50 mi radius</option>
            <option value="100">100 mi radius</option>
            <option value="150">150 mi radius</option>
          </select>
        )}
        <select value={disciplineFilter} onChange={e=>{setDisciplineFilter(e.target.value);setPage(1)}} style={{maxWidth:130}}>
          <option value="">All disciplines</option>
          {getDisciplineNames().map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select value={tagFilter} onChange={e=>{setTagFilter(e.target.value);setPage(1)}} style={{maxWidth:120}}>
          <option value="">All tags</option>
          {allTags.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(1)}} style={{maxWidth:120}}>
          <option value="name">Name</option>
          <option value="last_contacted">Last Contact</option>
          <option value="created_at">Newest</option>
          <option value="has_resume">Resume</option>
        </select>
      </div>

      {hasFilters&&(
        <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
          {search&&<span className="badge badge-blue" style={{fontSize:10}}>🔍 {search}</span>}
          {stateFilter&&<span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:700,color:getStateColor(stateFilter),background:getStateColor(stateFilter)+'18',border:'1px solid '+getStateColor(stateFilter)+'40'}}>🏛 {US_STATES[stateFilter]}</span>}
          {cityFilter&&<span className="badge badge-green" style={{fontSize:10}}>📍 {cityFilter}{radiusMiles>0?` + ${radiusMiles}mi`:''}</span>}
          {disciplineFilter&&<span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:600,color:DISC_COLORS[disciplineFilter]||'var(--accent)',background:(DISC_COLORS[disciplineFilter]||'#7c6cff')+'18',border:'1px solid '+(DISC_COLORS[disciplineFilter]||'#7c6cff')+'40'}}>🔧 {disciplineFilter}</span>}
          {tagFilter&&<span className="badge badge-gray" style={{fontSize:10}}>🏷 {tagFilter}</span>}
          <button onClick={clearFilters} style={{fontSize:10,color:'var(--danger)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Clear</button>
          <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginLeft:'auto'}}>{sorted.length} results</span>
        </div>
      )}

      {selected.size>0&&(
        <div className="card" style={{padding:'8px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:8,background:'var(--accent-bg)',flexWrap:'wrap'}}>
          <span style={{fontSize:12,fontWeight:600,color:'var(--accent-text)'}}>{selected.size} selected</span>
          <button onClick={()=>setShowHotlistAdd(true)} className="btn btn-sm" style={{fontSize:11,background:'var(--warning-bg)',borderColor:'var(--warning)',color:'var(--warning)'}}>🔥 Hotlist</button>
          <button onClick={()=>setConfirmBulkDelete(true)} className="btn btn-danger btn-sm" style={{fontSize:11}}>Delete</button>
          <button onClick={()=>setSelected(new Set())} className="btn btn-sm" style={{fontSize:11}}>Clear</button>
        </div>
      )}

      {showHotlistAdd&&(<div className="modal-overlay"><div className="confirm-dialog" style={{textAlign:'left'}}>
        <h3 style={{marginBottom:12}}>🔥 Add {selected.size} to hotlist</h3>
        {hotlists.length===0?<p style={{fontSize:13,color:'var(--text-secondary)',margin:'12px 0'}}>No hotlists. <Link href="/hotlists" style={{color:'var(--accent)'}}>Create one →</Link></p>
        :<select value={selectedHotlist} onChange={e=>setSelectedHotlist(e.target.value)} style={{marginBottom:16,width:'100%'}}><option value="">Select hotlist...</option>{hotlists.map((h:any)=><option key={h.id} value={h.id}>🔥 {h.name}</option>)}</select>}
        <div style={{display:'flex',gap:8}}><button onClick={bulkAddToHotlist} disabled={!selectedHotlist} className="btn btn-primary btn-sm">Add</button><button onClick={()=>setShowHotlistAdd(false)} className="btn btn-sm">Cancel</button></div>
      </div></div>)}

      {confirmBulkDelete&&(<div className="modal-overlay"><div className="confirm-dialog"><h3>Delete {selected.size}?</h3><p>Cannot be undone.</p><div style={{display:'flex',gap:8,justifyContent:'center'}}><button onClick={bulkDelete} className="btn btn-danger">Delete</button><button onClick={()=>setConfirmBulkDelete(false)} className="btn">Cancel</button></div></div></div>)}

      {/* Table */}
      <div className="card" style={{overflow:'hidden'}}>
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>Loading...</div>:(
          <div style={{overflowX:'auto'}}>
            <table>
              <thead><tr>
                <th style={{width:30}}><input type="checkbox" checked={paginated.length>0&&selected.size===paginated.length} onChange={toggleAll} style={{width:14,height:14,cursor:'pointer'}} /></th>
                <th>Name</th><th>Role</th><th className="hide-mobile">Company</th>
                <th className="hide-mobile">State</th><th className="hide-mobile">Discipline</th>
                <th>Phone</th><th>Last</th><th style={{width:24}}>📄</th>
              </tr></thead>
              <tbody>
                {paginated.map((c:any)=>(
                  <tr key={c.id}>
                    <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={()=>toggleSelect(c.id)} style={{width:14,height:14,cursor:'pointer'}} /></td>
                    <td onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="avatar" style={{background:c.avatar_url?'transparent':colorFor(c.name),color:'white',width:30,height:30,fontSize:11}}>{c.avatar_url?<img src={c.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />:initials(c.name)}</div>
                        <span style={{fontWeight:600,fontSize:14,color:'var(--accent)'}}>{c.name}</span>
                      </div>
                    </td>
                    <td onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer',fontSize:12}}>{c.current_title||'—'}</td>
                    <td className="hide-mobile" onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer',fontSize:12}}>{c.current_company||'—'}</td>
                    <td className="hide-mobile" onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer'}}>
                      {c.state?<span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:700,color:getStateColor(c.state),background:getStateColor(c.state)+'18',letterSpacing:'0.03em',border:'1px solid '+getStateColor(c.state)+'40'}}>{c.state}</span>:'—'}
                    </td>
                    <td className="hide-mobile" onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer'}}>
                      {(c.disciplines??[]).slice(0,2).map((d:string)=><span key={d} style={{display:'inline-flex',padding:'3px 8px',borderRadius:100,fontSize:10,fontWeight:700,color:DISC_COLORS[d]||'var(--accent)',background:(DISC_COLORS[d]||'#7c6cff')+'18',marginRight:4,border:'1px solid '+(DISC_COLORS[d]||'#7c6cff')+'40'}}>{d}</span>)}
                    </td>
                    <td onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer'}}>
                      {c.work_phone?<a href={`tel:${c.work_phone}`} onClick={e=>e.stopPropagation()} style={{fontSize:13,color:'var(--neon-blue)',textDecoration:'none',fontWeight:500}} title={c.work_phone}>📞 Call</a>
                      :c.cell_phone?<a href={`tel:${c.cell_phone}`} onClick={e=>e.stopPropagation()} style={{fontSize:13,color:'var(--neon-blue)',textDecoration:'none',fontWeight:500}} title={c.cell_phone}>📱 Cell</a>
                      :<span style={{fontSize:11,color:'var(--text-tertiary)'}}>—</span>}
                    </td>
                    <td onClick={()=>setSidePanelId(c.id)} style={{cursor:'pointer'}}><span style={{fontSize:11,color:lastContacted[c.id]?'var(--text-secondary)':'var(--text-tertiary)'}}>{fmtContact(c.id)}</span></td>
                    <td style={{textAlign:'center'}}>{c.resume_url?<span style={{fontSize:11}}>✅</span>:<span style={{opacity:0.15}}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading&&paginated.length===0&&<div style={{padding:40,textAlign:'center',color:'var(--text-tertiary)'}}>{hasFilters?'No candidates match':'No candidates yet'}</div>}
      </div>

      {sorted.length>0&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10,flexWrap:'wrap',gap:6}}>
          <span style={{fontSize:11,color:'var(--text-secondary)'}}>{((page-1)*pageSize)+1}–{Math.min(page*pageSize,sorted.length)} of {sorted.length}</span>
          <div style={{display:'flex',gap:3}}>{[25,50,100,250,500].map(s=><button key={s} onClick={()=>{setPageSize(s);setPage(1)}} className={`btn btn-sm ${pageSize===s?'btn-primary':''}`} style={{padding:'2px 6px',fontSize:10}}>{s}</button>)}</div>
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1} className="btn btn-sm" style={{padding:'2px 8px'}}>←</button>
            <span style={{fontSize:11}}>{page}/{totalPages||1}</span>
            <button onClick={()=>setPage(Math.min(totalPages,page+1))} disabled={page>=totalPages} className="btn btn-sm" style={{padding:'2px 8px'}}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}
