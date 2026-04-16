'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/candidates', label: 'Candidates', icon: '◉' },
  { href: '/hotlists', label: 'Hotlists', icon: '🔥' },
  { href: '/companies', label: 'Companies', icon: '◫' },
  { href: '/jobs', label: 'Job Orders', icon: '◈' },
  { href: '/import', label: 'CSV Import', icon: '⬆' },
]

// RSS feed URLs — fetched via rss2json proxy (free)
const RSS_FEEDS = [
  { url: 'https://www.enr.com/rss', cat: 'AEC', icon: '🏗️' },
  { url: 'https://www.constructiondive.com/feeds/news/', cat: 'AEC', icon: '🏗️' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', cat: 'FINANCE', icon: '📈' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', cat: 'BUSINESS', icon: '💼' },
  { url: 'https://www.espn.com/espn/rss/news', cat: 'SPORTS', icon: '🏈' },
  { url: 'https://www.theverge.com/rss/index.xml', cat: 'TECH', icon: '⚡' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', cat: 'TECH', icon: '🔬' },
  { url: 'https://electrek.co/feed/', cat: 'TESLA', icon: '🚗' },
  { url: 'https://feeds.reuters.com/reuters/topNews', cat: 'TRENDING', icon: '🌐' },
]

// 60+ static fallback cards — ensures fresh content daily even if RSS fails
const STATIC_CARDS: { icon: string; cat: string; text: string }[] = [
  // AEC & Construction
  { icon: '🏗️', cat: 'AEC', text: 'US infrastructure spending reached $2.2T in 2025 — MEP trades seeing strongest growth in healthcare and data centers.' },
  { icon: '🏗️', cat: 'AEC', text: 'TSMC Arizona fab: $40B investment, 10,000+ construction jobs. Massive cleanroom MEP scope.' },
  { icon: '🏗️', cat: 'AEC', text: 'Skanska commits to net-zero construction by 2030 — reshaping MEP specifications industry-wide.' },
  { icon: '🏗️', cat: 'AEC', text: 'Prefabricated MEP racks are cutting on-site labor by 40% on large commercial projects across the US.' },
  { icon: '🏗️', cat: 'AEC', text: 'The global MEP market projected to reach $280B by 2028, driven by smart building and net-zero mandates.' },
  { icon: '🏗️', cat: 'AEC', text: 'Data center construction in the US hit a record $35B in 2025 — Virginia and Texas leading the boom.' },
  { icon: '🏗️', cat: 'AEC', text: 'Mass timber construction is growing 25% annually — changing how MEP engineers approach fire protection.' },
  { icon: '🏗️', cat: 'AEC', text: 'The average commercial construction project is now 30% over budget — better MEP coordination is the fix.' },
  // AI & Tech
  { icon: '🧠', cat: 'AI', text: 'GPT-5 can now review MEP clash detection reports and auto-flag coordination issues in Revit models.' },
  { icon: '🧠', cat: 'AI', text: 'Autodesk Forma uses generative AI to optimize building energy performance during early design phases.' },
  { icon: '🧠', cat: 'AI', text: 'AI is now auto-generating MEP shop drawings — reducing turnaround from weeks to days for contractors.' },
  { icon: '⚡', cat: 'TECH', text: 'Apple Vision Pro being used for virtual walkthroughs of data center MEP installations before construction.' },
  { icon: '⚡', cat: 'TECH', text: 'Boston Dynamics robots now autonomously scan rebar and MEP rough-ins for QA compliance on job sites.' },
  { icon: '🧠', cat: 'AI', text: 'Construction AI startup raises $50M to automate progress tracking with drone imagery and computer vision.' },
  { icon: '⚡', cat: 'TECH', text: 'Digital twins now standard on $100M+ projects — real-time MEP system monitoring from day one.' },
  { icon: '🧠', cat: 'AI', text: 'AI-powered estimating tools reducing preconstruction timelines by 60% for MEP contractors.' },
  // Finance & Markets
  { icon: '📈', cat: 'FINANCE', text: 'S&P 500 construction & engineering index up 18% YTD — AEC firms outperforming broader market.' },
  { icon: '📈', cat: 'FINANCE', text: 'Construction tech VC funding hit $4.2B in 2025 — Procore, OpenSpace, and Buildots leading.' },
  { icon: '📈', cat: 'MARKETS', text: 'Average MEP engineer salary in the US: $95K. Senior PMs in NYC/SF commanding $150K+.' },
  { icon: '📈', cat: 'FINANCE', text: 'Bitcoin holding above $90K — institutional adoption continues. Gold at all-time highs.' },
  // Sports
  { icon: '🏈', cat: 'SPORTS', text: 'NFL Draft approaching — perfect conversation starter with candidates who are football fans.' },
  { icon: '⚾', cat: 'SPORTS', text: 'MLB season in full swing — great icebreaker topic for those awkward first 30 seconds on a call.' },
  { icon: '🏀', cat: 'SPORTS', text: 'NBA playoffs heating up — know the matchups so you can connect with candidates over hoops talk.' },
  // Recruiter Tips & Motivation
  { icon: '🎯', cat: 'TIP', text: 'Best time to call candidates: Tuesday-Thursday, 10-11am local time. Avoid Monday mornings and Friday PMs.' },
  { icon: '🎯', cat: 'TIP', text: 'Send 3 personalized LinkedIn messages to passive candidates before noon. Consistency compounds.' },
  { icon: '🎯', cat: 'TIP', text: 'Block your calendar into 90-minute power sessions — deep sourcing, then breaks. Your brain will thank you.' },
  { icon: '🎯', cat: 'TIP', text: 'Always confirm the candidates timezone before calling. Nothing kills rapport like a 6am wake-up call.' },
  { icon: '🎯', cat: 'TIP', text: 'Leave voicemails under 30 seconds. Name, reason, callback number. Anything longer gets deleted.' },
  { icon: '🎯', cat: 'TIP', text: 'Follow up within 24 hours of every interview. Speed wins placements.' },
  { icon: '💪', cat: 'FUEL', text: '"Speed is the currency of business. Move fast, win big." — Grant Cardone' },
  { icon: '💪', cat: 'FUEL', text: '"Every dial, every email, every follow-up compounds. You are building a pipeline empire."' },
  { icon: '💪', cat: 'FUEL', text: '"Your income is directly proportional to the problems you solve for other people." — Grant Cardone' },
  { icon: '💪', cat: 'FUEL', text: '"Outwork everyone. Out-call everyone. Out-care everyone. The market rewards relentless value." — Gary Vee' },
  { icon: '💪', cat: 'FUEL', text: '"Your next placement is one phone call away. Pick up the phone." — Daily Recruiter Mantra' },
  { icon: '💪', cat: 'FUEL', text: '"Be so good they cant ignore you." — Steve Martin' },
  { icon: '💪', cat: 'FUEL', text: '"Execution over perfection. Ship it." — Reid Hoffman' },
  { icon: '💪', cat: 'FUEL', text: '"Comfort is the enemy of achievement." — Farrah Gray' },
  { icon: '💪', cat: 'FUEL', text: '"Revenue solves all known problems." — Jason Lemkin' },
  { icon: '💪', cat: 'FUEL', text: '"Activity breeds results. Results breed confidence. Confidence breeds success." — David Goggins' },
  // Did You Know / Architecture
  { icon: '🏛️', cat: 'FACT', text: 'The Empire State Building was built in just 410 days — modern BIM could have cut that timeline further.' },
  { icon: '🏛️', cat: 'FACT', text: 'The Hoover Dam contains enough concrete to build a two-lane highway from San Francisco to New York.' },
  { icon: '🏛️', cat: 'FACT', text: 'The Pantheon in Rome, built in 125 AD, still has the worlds largest unreinforced concrete dome.' },
  { icon: '🏛️', cat: 'FACT', text: 'The Burj Khalifa uses 22M gallons of water just for cooling — equivalent to 20 Olympic swimming pools.' },
  { icon: '🏛️', cat: 'FACT', text: 'Singapore is building an underground highway system to free surface land for parks and housing.' },
  { icon: '🏛️', cat: 'FACT', text: 'NEOM / The Line in Saudi Arabia: a 170km linear city with zero cars, streets, or carbon emissions.' },
  { icon: '🏛️', cat: 'FACT', text: 'The Channel Tunnel between England and France is 31 miles long — one of the greatest engineering feats ever.' },
  // Business & Elon
  { icon: '🚀', cat: 'BUSINESS', text: 'SpaceX Starship: 33 Raptor engines, the most powerful rocket system ever built. Engineering at its finest.' },
  { icon: '🚀', cat: 'TESLA', text: 'Tesla Megapack installations growing 100% YoY — massive electrical engineering opportunities nationwide.' },
  { icon: '💼', cat: 'BUSINESS', text: 'Average recruiter placement: 47 days from initial contact to offer. Top performers close in 28 days.' },
  { icon: '💼', cat: 'BUSINESS', text: 'A single senior PM placement at 20% fee on $140K salary = $28,000 in revenue. Keep dialing.' },
  { icon: '💼', cat: 'BUSINESS', text: 'Fire Protection Engineers are the hardest-to-fill MEP role in 2026 — 3.2 openings per candidate.' },
  { icon: '🚀', cat: 'SPACE', text: 'NASA Artemis program needs 10,000+ engineers. The space economy is a hidden MEP recruiting goldmine.' },
  { icon: '💼', cat: 'BUSINESS', text: 'The #1 reason candidates accept offers: career growth opportunity. Not salary. Lead with growth stories.' },
  // Trending
  { icon: '🌐', cat: 'TRENDING', text: '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt' },
  { icon: '🌐', cat: 'TRENDING', text: '"Hiring one great engineer is worth more than 10 average ones." — Elon Musk' },
  { icon: '🌐', cat: 'TRENDING', text: '"The best investment you can make is in yourself." — Warren Buffett' },
  { icon: '🌐', cat: 'TRENDING', text: '"Move fast and break things. Unless you are breaking stuff, you are not moving fast enough." — Mark Zuckerberg' },
]

// Shuffle array deterministically by day
function shuffleByDay(arr: any[]) {
  const day = Math.floor(Date.now() / 86400000)
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (day * 31 + i * 7) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [role, setRole] = useState('user')
  const themeCtx = useTheme()
  const theme = themeCtx.theme
  const toggle = (themeCtx as any).toggle || (themeCtx as any).toggleTheme
  const [mobileOpen, setMobileOpen] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [btc, setBtc] = useState<{price:number;change:number;high:number;low:number}|null>(null)
  const [ticker, setTicker] = useState<string[]>([])

  // Widget cards — static + live RSS merged
  const [allCards, setAllCards] = useState(() => shuffleByDay(STATIC_CARDS))
  const [cardIdx, setCardIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const [paused, setPaused] = useState(false)

  // Fetch RSS feeds on mount
  useEffect(() => {
    const fetchFeeds = async () => {
      const liveCards: typeof STATIC_CARDS = []
      for (const feed of RSS_FEEDS.slice(0, 6)) {
        try {
          const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=4`)
          const d = await r.json()
          if (d.items) {
            d.items.slice(0, 3).forEach((item: any) => {
              if (item.title && item.title.length > 10) {
                liveCards.push({ icon: feed.icon, cat: feed.cat, text: item.title.slice(0, 120) + (item.title.length > 120 ? '...' : '') })
              }
            })
          }
        } catch { /* skip failed feeds */ }
      }
      if (liveCards.length > 0) {
        setAllCards(shuffleByDay([...liveCards, ...STATIC_CARDS]))
      }
    }
    fetchFeeds()
    const interval = setInterval(fetchFeeds, 30 * 60 * 1000) // refresh every 30 min
    return () => clearInterval(interval)
  }, [])

  // Bitcoin price
  useEffect(() => {
    const fetchBtc = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true')
        const d = await r.json()
        if (d.bitcoin) setBtc({ price: d.bitcoin.usd, change: d.bitcoin.usd_24h_change, high: d.bitcoin.usd_24h_high || 0, low: d.bitcoin.usd_24h_low || 0 })
      } catch {}
    }
    fetchBtc()
    const t = setInterval(fetchBtc, 60000)
    return () => clearInterval(t)
  }, [])

  // Ticker — live RSS + crypto + curated mogul quotes (always has content)
  const TICKER_FALLBACK = [
    // Business Mogul Tweets
    '💬 @elonmusk: "The pace of AI progress is astounding. Pay attention." — 45K likes',
    '💬 @elonmusk: "When something is important enough, you do it even if the odds are not in your favor." — 91K likes',
    '💬 @elonmusk: "Hiring one great engineer is worth more than 10 average ones." — 41K likes',
    '💬 @elonmusk: "Brand is just a perception, and perception will match reality over time." — 28K likes',
    '💬 @BillGates: "AI will be the most important tech advance in decades." — 32K likes',
    '💬 @BillGates: "Success is a lousy teacher. It seduces smart people into thinking they can\'t lose." — 52K likes',
    '💬 @sama: "We are in the early days of a technology revolution." — 28K likes',
    '💬 @sama: "The best founders I know are the most stubborn and the most flexible." — 19K likes',
    '💬 @GaryVee: "Stop overthinking. Start doing. The market rewards speed." — 18K likes',
    '💬 @GaryVee: "Patience + daily execution = unstoppable." — 15K likes',
    '💬 @GaryVee: "Document, don\'t create. Show the journey." — 24K likes',
    '💬 @WarrenBuffett: "The best investment you can make is in yourself." — 52K likes',
    '💬 @WarrenBuffett: "Price is what you pay. Value is what you get." — 67K likes',
    '💬 @WarrenBuffett: "Someone is sitting in the shade today because someone planted a tree long ago." — 88K likes',
    '💬 @naval: "Specific knowledge is found by pursuing your genuine curiosity." — 22K likes',
    '💬 @naval: "Seek wealth, not money or status." — 34K likes',
    '💬 @naval: "Play long-term games with long-term people." — 41K likes',
    '💬 @pmarca: "Software is eating the world. Construction tech is next." — 12K likes',
    '💬 @pmarca: "Strong opinions, loosely held." — 8K likes',
    '💬 @RayDalio: "Pain + Reflection = Progress" — 19K likes',
    '💬 @RayDalio: "He who lives by the crystal ball will eat shattered glass." — 11K likes',
    '💬 @Schwarzenegger: "Strength does not come from winning. It comes from struggles." — 76K likes',
    '💬 @JeffBezos: "Your brand is what people say about you when you\'re not in the room." — 43K likes',
    '💬 @JeffBezos: "If you double the number of experiments, you\'re going to double your inventiveness." — 21K likes',
    '💬 @MarkCuban: "Every no gets you closer to a yes." — 18K likes',
    // AEC Industry Facts
    '🏗️ US infrastructure spending hit record $2.2T in 2025 — MEP trades seeing strongest growth',
    '🏗️ TSMC Arizona fab: $40B investment, 10,000+ construction jobs. Massive cleanroom MEP scope',
    '🏗️ Data center construction in the US hit $35B in 2025 — Virginia and Texas leading the boom',
    '🏗️ Skanska commits to net-zero construction by 2030 — reshaping MEP specifications industry-wide',
    '🏗️ Prefabricated MEP racks cutting on-site labor by 40% on large commercial projects',
    '🏗️ Global MEP market projected to reach $280B by 2028, driven by smart building mandates',
    '🏗️ Mass timber construction growing 25% annually — changing MEP fire protection approaches',
    '🏗️ Average commercial construction project is 30% over budget — better MEP coordination is the fix',
    '🏗️ Fire Protection Engineers: hardest-to-fill MEP role in 2026 (3.2 openings per candidate)',
    '🏗️ US has 1.2M construction job openings — largest labor shortage in 40 years',
    // AI & Tech
    '🧠 GPT-5 can now review MEP clash detection reports and auto-flag coordination issues',
    '🧠 Autodesk Forma uses generative AI to optimize building energy performance in early design',
    '🧠 AI is auto-generating MEP shop drawings — reducing turnaround from weeks to days',
    '🧠 AI-powered estimating tools cutting preconstruction timelines by 60% for MEP contractors',
    '🧠 Construction AI startup raises $50M to automate progress tracking via drone imagery',
    '⚡ Apple Vision Pro being used for virtual walkthroughs of data center MEP installations',
    '⚡ Boston Dynamics robots autonomously scan rebar and MEP rough-ins for QA compliance',
    '⚡ Digital twins now standard on $100M+ projects — real-time MEP system monitoring',
    // Markets & Finance
    '📈 S&P 500 construction & engineering index up 18% YTD — AEC firms outperforming broader market',
    '📈 Construction tech VC funding hit $4.2B in 2025 — Procore, OpenSpace, Buildots leading',
    '📈 Bitcoin holding above $90K — institutional adoption continues. Gold at all-time highs',
    '📈 Average MEP engineer salary in the US: $95K. Senior PMs in NYC/SF commanding $150K+',
    '📈 ENR 500 firms reporting 15% revenue growth YoY — strongest year since 2019',
    '📈 10-year Treasury at 4.2% — still attractive vs stocks for conservative portfolios',
    // Sports Banter (call icebreakers)
    '🏈 NFL Draft approaching — perfect conversation starter with football-fan candidates',
    '⚾ MLB season in full swing — great icebreaker for the awkward first 30 seconds on a call',
    '🏀 NBA playoffs heating up — know the matchups to connect with candidates over hoops',
    '🏒 NHL Stanley Cup chase intensifying — Original Six matchups driving ratings',
    '🎾 Tennis Grand Slams: watch for upsets — great conversation fodder with business types',
    '⚽ Premier League title race tight — international talking point for global firms',
    '🏁 F1 season starts strong — high-net-worth candidate favorite topic',
    // Recruiter Tips
    '🎯 Best time to call candidates: Tuesday-Thursday, 10-11am local time',
    '🎯 Send 3 personalized LinkedIn messages before noon. Consistency compounds',
    '🎯 Block your calendar into 90-minute power sessions — deep sourcing, then breaks',
    '🎯 Always confirm timezone before calling. Nothing kills rapport like a 6am wake-up',
    '🎯 Leave voicemails under 30 seconds. Name, reason, callback. Anything longer gets deleted',
    '🎯 Follow up within 24 hours of every interview. Speed wins placements',
    '🎯 Ask about kids, hobbies, weekend plans — build rapport before the pitch',
    '🎯 Record yourself on calls monthly. You\'ll hear your filler words and fix them',
    '🎯 Reach for the senior decision maker before HR. Your quota will thank you',
    '🎯 Text after 6pm lands differently than morning. Try splitting your outreach',
    // Motivational Fuel
    '💪 "Your next placement is one phone call away. Pick up the phone." — Daily Recruiter Mantra',
    '💪 "Speed is the currency of business. Move fast, win big." — Grant Cardone',
    '💪 "Every dial, every email, every follow-up compounds. You\'re building an empire."',
    '💪 "Your income is directly proportional to the problems you solve for other people." — Cardone',
    '💪 "Outwork everyone. Out-call everyone. Out-care everyone." — Gary Vaynerchuk',
    '💪 "Be so good they can\'t ignore you." — Steve Martin',
    '💪 "Execution over perfection. Ship it." — Reid Hoffman',
    '💪 "Comfort is the enemy of achievement." — Farrah Gray',
    '💪 "Revenue solves all known problems." — Jason Lemkin',
    '💪 "Activity breeds results. Results breed confidence." — David Goggins',
    '💪 "Don\'t tell me how talented you are. Tell me how hard you work." — Arthur Brisbane',
    '💪 "The harder you work for something, the greater you\'ll feel when you achieve it."',
    // Architecture & Engineering Facts
    '🏛️ The Empire State Building was built in just 410 days — BIM could have cut it further',
    '🏛️ Hoover Dam has enough concrete for a highway from San Francisco to New York',
    '🏛️ The Pantheon (125 AD) still has the world\'s largest unreinforced concrete dome',
    '🏛️ Burj Khalifa uses 22M gallons of water annually just for cooling',
    '🏛️ Singapore building underground highways to free surface land for parks',
    '🏛️ NEOM / The Line: 170km linear city, zero cars, zero streets, zero emissions',
    '🏛️ Channel Tunnel: 31 miles — one of the greatest engineering feats ever built',
    '🏛️ Three Gorges Dam slowed Earth\'s rotation by 0.06 microseconds',
    '🏛️ Shanghai Tower\'s twisting design reduces wind load by 24%',
    '🏛️ The Gherkin in London uses 50% less energy than comparable skyscrapers',
    // Business Insights
    '🚀 SpaceX Starship: 33 Raptor engines, most powerful rocket system ever built',
    '🚀 Tesla Megapack installations growing 100% YoY — huge electrical engineering opportunity',
    '🚀 NASA Artemis program needs 10,000+ engineers. Hidden MEP recruiting goldmine',
    '💼 Average recruiter placement: 47 days from initial contact to offer. Top performers: 28 days',
    '💼 Senior PM placement at 20% fee on $140K = $28,000. Keep dialing',
    '💼 #1 reason candidates accept offers: career growth opportunity. Not salary',
    '💼 MEP firms with strong EV charging practice growing 3x faster than peers',
    '💼 ENR Top 500 firms filled 62% of 2025 openings through referrals — network game',
    '🌐 Global recruitment tech market expected to hit $43B by 2027',
    '🌐 47% of Fortune 500 CEOs got their start in engineering or science',
    // Tesla/EV Ecosystem
    '🚗 Tesla Semi production ramping — massive electrical infrastructure buildout ahead',
    '🚗 Cybertruck demand outpacing supply 14:1 — EV factory expansion driving MEP hiring',
    '🚗 Tesla solar + Powerwall combo installations up 67% YoY',
    '🚗 Rivian Normal IL plant hiring 6,000 — massive electrical talent war in Midwest',
  ]
  useEffect(() => {
    const buildTicker = async () => {
      const items: string[] = [...TICKER_FALLBACK]
      // Fetch crypto prices
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true')
        const d = await r.json()
        if (d.bitcoin) items.unshift('₿ BTC $' + Math.round(d.bitcoin.usd).toLocaleString() + ' (' + (d.bitcoin.usd_24h_change >= 0 ? '+' : '') + d.bitcoin.usd_24h_change?.toFixed(1) + '%)')
        if (d.ethereum) items.unshift('⟠ ETH $' + Math.round(d.ethereum.usd).toLocaleString() + ' (' + (d.ethereum.usd_24h_change >= 0 ? '+' : '') + d.ethereum.usd_24h_change?.toFixed(1) + '%)')
        if (d.solana) items.unshift('◎ SOL $' + Math.round(d.solana.usd).toLocaleString() + ' (' + (d.solana.usd_24h_change >= 0 ? '+' : '') + d.solana.usd_24h_change?.toFixed(1) + '%)')
      } catch {}
      // Fetch one RSS feed at a time with delay to avoid rate limits
      const feeds = [
        'https://feeds.reuters.com/reuters/topNews',
        'https://www.theverge.com/rss/index.xml',
      ]
      for (const url of feeds) {
        try {
          const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url) + '&count=4')
          const d = await r.json()
          if (d.items) d.items.slice(0, 3).forEach((item: any) => { if (item.title && item.title.length > 15) items.unshift('🌐 ' + item.title.slice(0, 100)) })
          await new Promise(res => setTimeout(res, 2000))
        } catch {}
      }
      setTicker(items)
    }
    buildTicker()
    const t = setInterval(buildTicker, 15 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // 2-minute synced rotation
  const rotate = useCallback(() => {
    setFade(false)
    setTimeout(() => { setCardIdx(p => (p + 1) % allCards.length); setFade(true) }, 400)
  }, [allCards.length])

  useEffect(() => {
    if (paused || zenMode) return
    const t = setInterval(rotate, 120000) // 2 minutes
    return () => clearInterval(t)
  }, [paused, zenMode, rotate])

  useEffect(() => {
    ;(async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return; setUser(u)
      const { data: p } = await (supabase as any).from('profiles').select('role, full_name, avatar_url').eq('id', u.id).single()
      if (p) { setRole(p.role || 'user'); setProfile(p) }
    })()
  }, [])

  const logout = async () => { await supabase.auth.signOut(); router.push('/auth/login') }
  const closeMobile = () => setMobileOpen(false)
  const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  const displayName = profile?.full_name ? capitalize(profile.full_name) : user?.email ? capitalize(user.email.split('@')[0].replace(/[._]/g, ' ')) : 'User'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const card = allCards[cardIdx % allCards.length]
  const catColors: Record<string,string> = {
    'AEC':'var(--neon-green)','AI':'var(--neon-blue)','TECH':'var(--neon-blue)',
    'FINANCE':'var(--warning)','MARKETS':'var(--warning)','BUSINESS':'var(--neon-purple)',
    'SPORTS':'var(--neon-orange)','FUEL':'var(--neon-orange)','TIP':'var(--neon-green)',
    'FACT':'var(--neon-purple)','TRENDING':'var(--neon-blue)','TESLA':'var(--danger)',
    'SPACE':'var(--neon-blue)',
  }

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="sidebar-mobile-toggle" aria-label="Menu">
        <span style={{ fontSize: 18, lineHeight: 1 }}>{mobileOpen ? '✕' : '☰'}</span>
      </button>
      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div style={{ padding: '20px 18px 14px' }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.03em' }}>
            <span style={{ color: 'var(--text-primary)' }}>Recruit</span>
            <span style={{ color: 'var(--neon-green)' }}>OS</span>
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recruiting Command Center</p>
        </div>

        <nav style={{ padding: '4px 0' }}>
          {nav.map(n => (
            <Link key={n.href} href={n.href} onClick={closeMobile} className={`sidebar-link ${path?.startsWith(n.href) ? 'active' : ''}`}>
              <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>{n.icon}</span>{n.label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link href="/settings" onClick={closeMobile} className={`sidebar-link ${path?.startsWith('/settings') ? 'active' : ''}`}>
              <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>⚙</span>Settings
            </Link>
          )}
        </nav>

        {/* Widgets */}
        {!zenMode ? (
          <div style={{ padding: '8px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            {/* Bitcoin Ticker */}
            {btc && (
              <div className="sidebar-widget" style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14 }}>₿</span>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning)' }}>BITCOIN</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: btc.change >= 0 ? 'var(--neon-green)' : 'var(--neon-orange)' }}>
                    {btc.change >= 0 ? '▲' : '▼'} {Math.abs(btc.change).toFixed(1)}%
                  </span>
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  ${btc.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>H: ${btc.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>L: ${btc.low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            )}

            {/* Content Card — rotates every 2 min */}
            {card && (
              <div className="sidebar-widget"
                onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
                style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                <button className="widget-pause" onClick={(e) => { e.stopPropagation(); rotate() }} title="Skip">↻</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 14 }}>{card.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: catColors[card.cat] || 'var(--accent)' }}>{card.cat}</span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{card.text}</p>
              </div>
            )}
            {/* Scrolling Ticker */}
            {ticker.length > 0 && (
              <div className="sidebar-widget" style={{ padding: '6px 0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', marginBottom: 4 }}>
                  <span style={{ fontSize: 10 }}>📰</span>
                  <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--neon-orange)' }}>LIVE FEED</span>
                </div>
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-block', animation: `tickerScroll ${Math.max(ticker.length * 14, 400)}s linear infinite`, paddingLeft: '100%' }}>
                    {ticker.map((h, i) => (
                      <span key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 40, display: 'inline' }}>
                        <span style={{ color: 'var(--neon-blue)', marginRight: 6 }}>●</span>{h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span onClick={() => setZenMode(false)} style={{ fontSize: 16, opacity: 0.2, cursor: 'pointer' }} title="Show widgets">₿</span>
            <span onClick={() => setZenMode(false)} style={{ fontSize: 16, opacity: 0.2, cursor: 'pointer' }} title="Show widgets">📡</span>
          </div>
        )}

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button onClick={() => toggle()} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button onClick={() => setZenMode(!zenMode)} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12, color: zenMode ? 'var(--neon-green)' : undefined }}>
              {zenMode ? '📡 Live' : '🧘 Zen'}
            </button>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, overflow: 'hidden', background: profile?.avatar_url ? 'transparent' : 'var(--accent)', color: 'white' }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: role === 'admin' ? 'var(--neon-green)' : 'var(--text-tertiary)' }}>{role}</p>
                <button onClick={logout} style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
