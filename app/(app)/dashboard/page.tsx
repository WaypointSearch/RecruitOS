'use client'
import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

// Curated motivational quotes
const QUOTES = [
  {q:"Speed is the currency of business. Move fast, win big.",a:"Grant Cardone"},
  {q:"You're not going to get what you want. You're going to get what you work for.",a:"Andrew Tate"},
  {q:"The phone is the most powerful weapon a recruiter has. Use it.",a:"Lou Adler"},
  {q:"Success is not for the lazy. Outwork everyone.",a:"Andrew Tate"},
  {q:"Every no gets me closer to a yes.",a:"Mark Cuban"},
  {q:"Activity breeds results. Results breed confidence. Confidence breeds success.",a:"David Goggins"},
  {q:"Your income is directly proportional to the value you bring and the problems you solve.",a:"Grant Cardone"},
  {q:"Don't wait for opportunity. Create it.",a:"Chris Voss"},
  {q:"The harder you work, the luckier you get.",a:"Gary Vaynerchuk"},
  {q:"Comfort is the enemy of achievement.",a:"Farrah Gray"},
  {q:"You either make money while you sleep, or work until you die.",a:"Warren Buffett"},
  {q:"Revenue solves all known problems.",a:"Jason Lemkin"},
  {q:"Be so good they can't ignore you.",a:"Steve Martin"},
  {q:"Execution over perfection. Ship it.",a:"Reid Hoffman"},
  {q:"Close the deal or close the door.",a:"Jordan Belfort"},
]

export default function DashboardPage() {
  const sb = useRef(createClientComponentClient()).current
  const [stats, setStats] = useState({candidates:0,jobs:0,companies:0,pipeline:0})
  const [totalFees, setTotalFees] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [hotPipeline, setHotPipeline] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [crypto, setCrypto] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [quote] = useState(QUOTES[Math.floor(Math.random()*QUOTES.length)])
  const [time, setTime] = useState(new Date())

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])

  // CRM stats
  useEffect(() => {
    (async () => {
      const {count:cc} = await (sb as any).from('candidates').select('id',{count:'exact',head:true})
      const {count:jc} = await (sb as any).from('jobs').select('id',{count:'exact',head:true}).eq('status','Active')
      const {count:coc} = await (sb as any).from('companies').select('id',{count:'exact',head:true}).eq('status','Client')
      const {count:pc} = await (sb as any).from('pipeline').select('id',{count:'exact',head:true})
      setStats({candidates:cc||0,jobs:jc||0,companies:coc||0,pipeline:pc||0})

      const {data:pf} = await (sb as any).from('pipeline').select('candidates(current_salary)')
      setTotalFees((pf??[]).reduce((s:number,p:any) => s+(p.candidates?.current_salary?Math.round(p.candidates.current_salary*0.2):0),0))

      const {data:acts} = await (sb as any).from('activities').select('*, candidates(name)').order('created_at',{ascending:false}).limit(8)
      setRecentActivity(acts??[])

      const {data:pipes} = await (sb as any).from('pipeline').select('*, candidates(name,current_salary), jobs(title)').order('moved_at',{ascending:false}).limit(6)
      setHotPipeline(pipes??[])

      // Leaderboard
      const ms = new Date(); ms.setDate(1); ms.setHours(0,0,0,0)
      const {data:aa} = await (sb as any).from('activities').select('created_by,created_by_name,type').gte('created_at',ms.toISOString())
      if (aa) {
        const m: Record<string,{name:string;total:number;calls:number;emails:number;notes:number}> = {}
        aa.forEach((a:any) => {
          if (!a.created_by) return
          if (!m[a.created_by]) m[a.created_by] = {name:a.created_by_name||'?',total:0,calls:0,emails:0,notes:0}
          m[a.created_by].total++
          if (a.type==='called'||a.type==='voicemail') m[a.created_by].calls++
          else if (a.type==='email') m[a.created_by].emails++
          else if (a.type==='note') m[a.created_by].notes++
        })
        setLeaderboard(Object.values(m).sort((a,b) => b.total-a.total))
      }
    })()
  }, [])

  // Crypto prices (free CoinGecko API)
  useEffect(() => {
    const fetchCrypto = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=usd&include_24hr_change=true')
        const d = await r.json()
        setCrypto([
          {name:'BTC',price:d.bitcoin?.usd,change:d.bitcoin?.usd_24h_change},
          {name:'ETH',price:d.ethereum?.usd,change:d.ethereum?.usd_24h_change},
          {name:'SOL',price:d.solana?.usd,change:d.solana?.usd_24h_change},
          {name:'DOGE',price:d.dogecoin?.usd,change:d.dogecoin?.usd_24h_change},
        ])
      } catch { /* silent */ }
    }
    fetchCrypto()
    const t = setInterval(fetchCrypto, 60000)
    return () => clearInterval(t)
  }, [])

  // News headlines (free RSS via API)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/business/rss.xml&count=6')
        const d = await r.json()
        if (d.items) setNews(d.items.slice(0,6))
      } catch { /* silent */ }
    })()
  }, [])

  const fmtMoney = (n:number) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n}`
  const timeAgo = (d:string) => { const m=Math.floor((Date.now()-new Date(d).getTime())/60000); if(m<60)return `${m}m`; const h=Math.floor(m/60); if(h<24)return `${h}h`; return `${Math.floor(h/24)}d` }
  const monthName = new Date().toLocaleString('default',{month:'long'})

  return (
    <div>
      {/* Clock + Quote Banner */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,letterSpacing:'-0.02em'}}>Dashboard</h1>
          <p style={{fontSize:11,color:'var(--text-tertiary)',marginTop:2}}>{time.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})} · {time.toLocaleTimeString()}</p>
        </div>
        <div style={{padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg, var(--accent-bg), var(--success-bg))',maxWidth:400,border:'1px solid var(--border)'}}>
          <p style={{fontSize:12,fontStyle:'italic',color:'var(--text-primary)',lineHeight:1.4}}>"{quote.q}"</p>
          <p style={{fontSize:10,color:'var(--accent)',fontWeight:600,marginTop:4}}>— {quote.a}</p>
        </div>
      </div>

      {/* Crypto Ticker */}
      {crypto.length > 0 && (
        <div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
          {crypto.map(c => (
            <div key={c.name} className="card" style={{padding:'8px 14px',minWidth:120,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{c.name}</span>
              <div style={{textAlign:'right',flex:1}}>
                <p style={{fontSize:13,fontWeight:600}}>${c.price?.toLocaleString(undefined,{maximumFractionDigits:c.price>100?0:2})}</p>
                <p style={{fontSize:10,fontWeight:600,color:c.change>=0?'var(--success)':'var(--danger)'}}>{c.change>=0?'▲':'▼'} {Math.abs(c.change||0).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{marginBottom:14}}>
        {[
          {l:'Candidates',v:stats.candidates,icon:'◉',color:'var(--accent)'},
          {l:'Active Jobs',v:stats.jobs,icon:'◈',color:'var(--success)'},
          {l:'Clients',v:stats.companies,icon:'◫',color:'var(--warning)'},
          {l:'Pipeline',v:stats.pipeline,icon:'◆',color:'#af52de'},
        ].map(s => (
          <div key={s.l} className="card" style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:10,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.l}</span>
              <span style={{fontSize:16,color:s.color}}>{s.icon}</span>
            </div>
            <p style={{fontSize:28,fontWeight:800,marginTop:4,letterSpacing:'-0.02em'}}>{s.v.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Fees Banner */}
      <div className="card" style={{padding:'14px 20px',marginBottom:14,background:totalFees>0?'linear-gradient(135deg,var(--success-bg),var(--accent-bg))':'var(--card-bg)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div>
          <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-secondary)'}}>Total Pipeline Fees</p>
          <p style={{fontSize:32,fontWeight:800,letterSpacing:'-0.03em',color:totalFees>0?'var(--success)':'var(--text-tertiary)'}}>{totalFees>0?fmtMoney(totalFees):'$0'}</p>
        </div>
        <p style={{fontSize:11,color:'var(--text-tertiary)'}}>{stats.pipeline} candidates · 20% fee</p>
      </div>

      {/* Three columns */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}} className="stats-grid">
        {/* Activity */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}><h2 style={{fontSize:13,fontWeight:700}}>Recent Activity</h2></div>
          <div style={{maxHeight:260,overflowY:'auto'}}>
            {recentActivity.length===0&&<p style={{padding:20,textAlign:'center',fontSize:12,color:'var(--text-tertiary)'}}>No activity</p>}
            {recentActivity.map((a:any)=>(
              <div key={a.id} style={{padding:'6px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{width:5,height:5,borderRadius:3,background:'var(--accent)',marginTop:6,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <p style={{fontSize:12}}><strong>{a.created_by_name}</strong> — {a.type==='note'?`"${(a.content||'').slice(0,40)}"`:a.content||a.type} {a.candidates?.name&&<span style={{color:'var(--text-secondary)'}}> on {a.candidates.name}</span>}</p>
                  <p style={{fontSize:10,color:'var(--text-tertiary)'}}>{timeAgo(a.created_at)} ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}><h2 style={{fontSize:13,fontWeight:700}}>Hot Pipeline</h2></div>
          <div style={{maxHeight:260,overflowY:'auto'}}>
            {hotPipeline.length===0&&<p style={{padding:20,textAlign:'center',fontSize:12,color:'var(--text-tertiary)'}}>No pipeline</p>}
            {hotPipeline.map((p:any)=>{const fee=p.candidates?.current_salary?Math.round(p.candidates.current_salary*0.2):null;return(
              <Link key={p.id} href={`/pipeline/${p.job_id}`} style={{textDecoration:'none',display:'block',padding:'6px 14px',transition:'background 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--card-bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1}}><p style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{p.candidates?.name}</p><p style={{fontSize:11,color:'var(--text-secondary)'}}>{p.jobs?.title}</p></div>
                  <span className="badge badge-blue" style={{fontSize:9}}>{p.stage?.split(' ').slice(0,2).join(' ')}</span>
                  {fee&&<span style={{fontSize:11,color:'var(--success)',fontWeight:700}}>{fmtMoney(fee)}</span>}
                </div>
              </Link>
            )})}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}><h2 style={{fontSize:13,fontWeight:700}}>🏆 {monthName} Leaderboard</h2></div>
          <div style={{maxHeight:260,overflowY:'auto'}}>
            {leaderboard.length===0&&<p style={{padding:20,textAlign:'center',fontSize:12,color:'var(--text-tertiary)'}}>No activity this month</p>}
            {leaderboard.map((u:any,i:number)=>(
              <div key={i} style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid var(--border-light)'}}>
                <span style={{width:22,height:22,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--card-bg-hover)',color:i<3?'#1a1a1e':'var(--text-secondary)',flexShrink:0}}>{i+1}</span>
                <div style={{flex:1}}><p style={{fontSize:13,fontWeight:600}}>{u.name}</p>
                <div style={{display:'flex',gap:6,marginTop:2}}>{u.calls>0&&<span style={{fontSize:10,color:'var(--text-tertiary)'}}>📞{u.calls}</span>}{u.emails>0&&<span style={{fontSize:10,color:'var(--text-tertiary)'}}>✉️{u.emails}</span>}{u.notes>0&&<span style={{fontSize:10,color:'var(--text-tertiary)'}}>📝{u.notes}</span>}</div></div>
                <p style={{fontSize:18,fontWeight:800,color:'var(--accent)'}}>{u.total}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News */}
      {news.length > 0 && (
        <div className="card" style={{marginTop:14,padding:0,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontSize:13,fontWeight:700}}>📰 Business News</h2>
            <span style={{fontSize:10,color:'var(--text-tertiary)'}}>BBC Business · Live</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:0}}>
            {news.map((n:any,i:number)=>(
              <a key={i} href={n.link} target="_blank" rel="noreferrer" style={{display:'block',padding:'10px 14px',borderBottom:'1px solid var(--border-light)',textDecoration:'none',transition:'background 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--card-bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',lineHeight:1.4}}>{n.title}</p>
                <p style={{fontSize:10,color:'var(--text-tertiary)',marginTop:4}}>{new Date(n.pubDate).toLocaleString()}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
