'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { geocodeLocation, detectDisciplines, getMetroNames, extractState } from '@/lib/geo-intelligence'

const CRM_FIELDS = [
  {value:'',label:'— Skip —'},{value:'name',label:'Full Name'},
  {value:'work_email',label:'Work Email'},{value:'personal_email',label:'Personal Email'},
  {value:'email',label:'Email'},{value:'cell_phone',label:'Cell Phone'},
  {value:'work_phone',label:'Work Phone'},{value:'phone',label:'Phone'},
  {value:'linkedin',label:'LinkedIn / Sales Nav'},{value:'current_title',label:'Current Title'},
  {value:'current_company',label:'Current Company'},{value:'current_company_url',label:'Company URL'},
  {value:'location',label:'Location'},{value:'state',label:'State'},
  {value:'metro_area',label:'Metro Area'},{value:'current_salary',label:'Salary'},
  {value:'time_in_current_role',label:'Time in Role'},{value:'previous_title',label:'Previous Title'},
  {value:'previous_company',label:'Previous Company'},{value:'previous_dates',label:'Previous Dates'},
  {value:'disciplines_csv',label:'Disciplines (pipe-separated)'},{value:'tags_csv',label:'Tags'},
]
const WP_MAP: Record<string,string> = {
  'first name':'_skip','last name':'_skip','full name':'name',
  'current title':'current_title','current company':'current_company',
  'current company url':'current_company_url','location':'location',
  'time in role':'time_in_current_role','previous title':'previous_title',
  'previous company':'previous_company','previous date range':'previous_dates',
  'sales nav url':'linkedin','state':'state','metro_area':'metro_area','metro area':'metro_area',
  'disciplines':'disciplines_csv','tags':'tags_csv','cell phone':'cell_phone',
  'work phone':'work_phone','work email':'work_email','personal email':'personal_email',
  'linkedin':'linkedin','company url':'current_company_url',
}

export default function ImportPage() {
  const sb = useRef(createClientComponentClient()).current
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [listName,setListName]=useState('')
  const [csvHeaders,setCsvHeaders]=useState<string[]>([])
  const [csvRows,setCsvRows]=useState<string[][]>([])
  const [mapping,setMapping]=useState<Record<number,string>>({})
  const [importing,setImporting]=useState(false)
  const [progress,setProgress]=useState({done:0,total:0,geo:0,tag:0})
  const [toast,setToast]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [isWP,setIsWP]=useState(false)
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(null),4000)}

  const parseCSV=(text:string)=>{const lines=text.split(/\r?\n/).filter(l=>l.trim());if(lines.length<2)return{headers:[]as string[],rows:[]as string[][]};const pl=(line:string)=>{const r:string[]=[];let c='';let q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"')q=!q;else if(ch===','&&!q){r.push(c.trim());c=''}else c+=ch};r.push(c.trim());return r};return{headers:pl(lines[0]),rows:lines.slice(1).map(pl).filter(r=>r.some(c=>c))}}

  const handleFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;setError(null)
    const reader=new FileReader();reader.onload=ev=>{
      let text=ev.target?.result as string;if(text.charCodeAt(0)===0xFEFF)text=text.slice(1)
      const{headers,rows}=parseCSV(text);if(!headers.length){setError('Could not parse');return}
      setCsvHeaders(headers);setCsvRows(rows)
      const lH=headers.map(h=>h.toLowerCase().trim());const wpM=lH.filter(h=>WP_MAP[h]!==undefined).length;setIsWP(wpM>=5)
      const am:Record<number,string>={}
      headers.forEach((h,i)=>{const l=h.toLowerCase().trim();if(WP_MAP[l]&&WP_MAP[l]!=='_skip'){am[i]=WP_MAP[l];return};if(WP_MAP[l]==='_skip')return;const c=l.replace(/[^a-z0-9]/g,'');if(c.includes('fullname')||(c.includes('name')&&!c.includes('company')&&!c.includes('first')&&!c.includes('last')))am[i]='name';else if(c.includes('workemail'))am[i]='work_email';else if(c.includes('personalemail'))am[i]='personal_email';else if(c.includes('email'))am[i]='email';else if(c.includes('cellphone')||c.includes('mobile'))am[i]='cell_phone';else if(c.includes('workphone')||c.includes('officephone'))am[i]='work_phone';else if(c.includes('phone'))am[i]='phone';else if(c.includes('linkedin')||c.includes('salesnav'))am[i]='linkedin';else if(c.includes('title')&&!c.includes('prev'))am[i]='current_title';else if(c.includes('company')&&!c.includes('prev')&&!c.includes('url')&&!c.includes('website')&&!c.includes('phone')&&!c.includes('address')&&!c.includes('sector')&&!c.includes('size')&&!c.includes('priority'))am[i]='current_company';else if(c.includes('companyurl'))am[i]='current_company_url';else if(c==='location'||c==='geography')am[i]='location';else if(c==='state')am[i]='state';else if(c.includes('metro'))am[i]='metro_area';else if(c.includes('salary'))am[i]='current_salary';else if(c.includes('timein')||c.includes('tenure'))am[i]='time_in_current_role';else if(c.includes('previoustitle'))am[i]='previous_title';else if(c.includes('previouscompany'))am[i]='previous_company';else if(c.includes('previousdate')||c.includes('daterange'))am[i]='previous_dates';else if(c.includes('discipline'))am[i]='disciplines_csv';else if(c==='tags')am[i]='tags_csv'})
      setMapping(am);if(wpM>=5&&!listName)setListName(file.name.replace('.csv','').replace(/_/g,' '))
    };reader.readAsText(file)
  }

  const doImport=async()=>{
    setImporting(true);const st={done:0,total:csvRows.length,geo:0,tag:0};setProgress(st)
    const{data:{user}}=await sb.auth.getUser();const baseTags=listName.trim()?[listName.trim()]:[]
    for(let i=0;i<csvRows.length;i+=50){
      const chunk=csvRows.slice(i,i+50).map(row=>{
        const obj:any={created_by:user?.id}
        for(const[ci,field]of Object.entries(mapping)){if(!field)continue;const val=row[parseInt(ci)]?.trim();if(!val)continue;if(field==='current_salary'){const n=parseInt(val.replace(/[^0-9]/g,''));obj[field]=isNaN(n)?null:n}else if(field==='disciplines_csv'){obj.disciplines=val.split('|').map((d:string)=>d.trim()).filter(Boolean)}else if(field==='tags_csv'){obj.tags=[...baseTags,...val.split('|').map((t:string)=>t.trim()).filter(Boolean)]}else obj[field]=val}
        // Geocode → lat/lng
        if(obj.location){const geo=geocodeLocation(obj.location);if(geo){obj.lat=geo.lat;obj.lng=geo.lng;if(!obj.metro_area)obj.metro_area=geo.metro;st.geo++};if(!obj.state)obj.state=extractState(obj.location)}
        // Disciplines
        if(!obj.disciplines||obj.disciplines.length===0){const d=detectDisciplines(obj.current_title,obj.current_company,obj.previous_title,obj.previous_company);if(d.length>0){obj.disciplines=d;st.tag++}}
        if(!obj.tags)obj.tags=baseTags
        return obj
      }).filter(o=>o.name)
      if(chunk.length>0)await(sb as any).from('candidates').insert(chunk)
      st.done+=csvRows.slice(i,i+50).length;setProgress({...st})
    }
    setImporting(false);showToast(`Imported ${st.total}! (${st.geo} geocoded, ${st.tag} tagged)`)
    setTimeout(()=>router.push('/candidates'),1500)
  }

  return(
    <div style={{maxWidth:720}}>
      <h1 style={{fontSize:24,fontWeight:700,marginBottom:6}}>Import Candidates</h1>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:20}}>Waypoint CSVs auto-detected. Locations geocoded, disciplines tagged, states extracted.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:4}}>List / Tag</label><input type="text" value={listName} onChange={e=>setListName(e.target.value)} placeholder="e.g. Atlanta MEP Q1 2026" /></div>
        <div><label style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:4}}>Override Metro</label><select value="" onChange={e=>{}}><option value="">Auto-detect</option>{getMetroNames().map(m=><option key={m} value={m}>{m}</option>)}</select></div>
      </div>
      {csvHeaders.length===0&&(<div onClick={()=>fileRef.current?.click()} style={{border:'2px dashed var(--border)',borderRadius:12,padding:'48px 24px',textAlign:'center',cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='var(--accent-bg)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='transparent'}}><p style={{fontSize:28,marginBottom:8}}>⬆</p><p style={{fontSize:14,fontWeight:600}}>Click to upload</p><p style={{fontSize:12,color:'var(--text-tertiary)',marginTop:4}}>.csv — Waypoint exports auto-detected</p></div>)}
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{display:'none'}} />
      {error&&<p style={{color:'var(--danger)',fontSize:13,marginTop:10}}>{error}</p>}
      {csvHeaders.length>0&&(
        <div className="card" style={{padding:16,marginTop:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div><h2 style={{fontSize:16,fontWeight:600}}>Map Columns</h2>{isWP&&<span className="badge badge-green" style={{marginTop:4}}>✓ Auto-mapped</span>}</div>
            <span style={{fontSize:12,color:'var(--text-secondary)'}}>{csvRows.length} rows · {Object.values(mapping).filter(Boolean).length} mapped</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'6px 12px',alignItems:'center'}}>
            <span style={{fontSize:10,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase'}}>CSV</span><span></span><span style={{fontSize:10,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase'}}>CRM Field</span>
            {csvHeaders.map((h,i)=>(<div key={i} style={{display:'contents'}}><div style={{padding:'6px 10px',background:'var(--card-bg-hover)',borderRadius:6,fontSize:13,fontWeight:500}}>{h}{csvRows[0]?.[i]&&<span style={{fontSize:10,color:'var(--text-tertiary)',display:'block',marginTop:1}}>"{csvRows[0][i].slice(0,50)}"</span>}</div><span style={{color:'var(--text-tertiary)',fontSize:14}}>→</span><select value={mapping[i]||''} onChange={e=>setMapping(p=>({...p,[i]:e.target.value}))}>{CRM_FIELDS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></div>))}
          </div>
          <div style={{marginTop:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={doImport} disabled={importing||!Object.values(mapping).includes('name')} className="btn btn-primary">{importing?`Importing... ${progress.done}/${progress.total}`:`Import ${csvRows.length}`}</button>
            {importing&&<span style={{fontSize:12,color:'var(--text-secondary)'}}>📍{progress.geo} geo · 🏷{progress.tag} tagged</span>}
            <button onClick={()=>{setCsvHeaders([]);setCsvRows([]);setMapping({});setIsWP(false)}} className="btn btn-sm">Reset</button>
          </div>
        </div>
      )}
      {toast&&<div className="toast toast-success">{toast}</div>}
    </div>
  )
}
