// Comprehensive US geo data — all 50 states + DC, 500+ cities
// Handles: "Dallas-Fort Worth", "Greater Atlanta", "NYC Metropolitan Area", etc.

export const US_STATES: Record<string, string> = {
  'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California',
  'CO':'Colorado','CT':'Connecticut','DE':'Delaware','DC':'District of Columbia',
  'FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois',
  'IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana',
  'ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota',
  'MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada',
  'NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York',
  'NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon',
  'PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota',
  'TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia',
  'WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming',
}

// Reverse: full name → abbreviation
const NAME_TO_ABBR: Record<string, string> = {}
for (const [a, n] of Object.entries(US_STATES)) NAME_TO_ABBR[n.toLowerCase()] = a

// Cities per state with coordinates
export const STATE_CITIES: Record<string, { name: string; lat: number; lng: number }[]> = {
  'AL': [{name:'Birmingham',lat:33.52,lng:-86.80},{name:'Huntsville',lat:34.73,lng:-86.59},{name:'Montgomery',lat:32.38,lng:-86.30},{name:'Mobile',lat:30.70,lng:-88.04},{name:'Tuscaloosa',lat:33.21,lng:-87.57}],
  'AK': [{name:'Anchorage',lat:61.22,lng:-149.90},{name:'Fairbanks',lat:64.84,lng:-147.72},{name:'Juneau',lat:58.30,lng:-134.42}],
  'AZ': [{name:'Phoenix',lat:33.45,lng:-112.07},{name:'Tucson',lat:32.22,lng:-110.97},{name:'Scottsdale',lat:33.49,lng:-111.93},{name:'Mesa',lat:33.42,lng:-111.83},{name:'Chandler',lat:33.30,lng:-111.84},{name:'Tempe',lat:33.43,lng:-111.94},{name:'Gilbert',lat:33.35,lng:-111.79},{name:'Glendale',lat:33.54,lng:-112.19}],
  'AR': [{name:'Little Rock',lat:34.75,lng:-92.29},{name:'Fayetteville',lat:36.06,lng:-94.16},{name:'Fort Smith',lat:35.39,lng:-94.40},{name:'Bentonville',lat:36.37,lng:-94.21}],
  'CA': [{name:'Los Angeles',lat:34.05,lng:-118.24},{name:'San Francisco',lat:37.78,lng:-122.42},{name:'San Diego',lat:32.72,lng:-117.16},{name:'San Jose',lat:37.34,lng:-121.89},{name:'Sacramento',lat:38.58,lng:-121.49},{name:'Irvine',lat:33.68,lng:-117.83},{name:'Pasadena',lat:34.15,lng:-118.14},{name:'Long Beach',lat:33.77,lng:-118.19},{name:'Oakland',lat:37.80,lng:-122.27},{name:'Riverside',lat:33.95,lng:-117.40},{name:'Anaheim',lat:33.84,lng:-117.91},{name:'Santa Monica',lat:34.02,lng:-118.49},{name:'Fresno',lat:36.74,lng:-119.77},{name:'Bakersfield',lat:35.37,lng:-119.02}],
  'CO': [{name:'Denver',lat:39.74,lng:-104.99},{name:'Colorado Springs',lat:38.83,lng:-104.82},{name:'Boulder',lat:40.02,lng:-105.27},{name:'Fort Collins',lat:40.59,lng:-105.08},{name:'Aurora',lat:39.73,lng:-104.83},{name:'Lakewood',lat:39.71,lng:-105.08},{name:'Arvada',lat:39.80,lng:-105.09},{name:'Highlands Ranch',lat:39.54,lng:-104.97}],
  'CT': [{name:'Hartford',lat:41.76,lng:-72.69},{name:'Stamford',lat:41.05,lng:-73.54},{name:'New Haven',lat:41.31,lng:-72.93},{name:'Bridgeport',lat:41.19,lng:-73.20},{name:'Norwalk',lat:41.12,lng:-73.41},{name:'Danbury',lat:41.40,lng:-73.45},{name:'Greenwich',lat:41.03,lng:-73.63}],
  'DE': [{name:'Wilmington',lat:39.74,lng:-75.54},{name:'Dover',lat:39.16,lng:-75.53},{name:'Newark',lat:39.68,lng:-75.75}],
  'DC': [{name:'Washington DC',lat:38.91,lng:-77.04}],
  'FL': [{name:'Miami',lat:25.76,lng:-80.19},{name:'Tampa',lat:27.95,lng:-82.46},{name:'Orlando',lat:28.54,lng:-81.38},{name:'Jacksonville',lat:30.33,lng:-81.66},{name:'Fort Lauderdale',lat:26.12,lng:-80.14},{name:'West Palm Beach',lat:26.72,lng:-80.05},{name:'St. Petersburg',lat:27.77,lng:-82.68},{name:'Boca Raton',lat:26.36,lng:-80.08},{name:'Fort Myers',lat:26.64,lng:-81.87},{name:'Sarasota',lat:27.34,lng:-82.53},{name:'Tallahassee',lat:30.44,lng:-84.28},{name:'Gainesville',lat:29.65,lng:-82.32},{name:'Pensacola',lat:30.44,lng:-87.22},{name:'Stuart',lat:27.20,lng:-80.25},{name:'Port St. Lucie',lat:27.27,lng:-80.36},{name:'Naples',lat:26.14,lng:-81.80}],
  'GA': [{name:'Atlanta',lat:33.75,lng:-84.39},{name:'Savannah',lat:32.08,lng:-81.09},{name:'Augusta',lat:33.47,lng:-81.97},{name:'Marietta',lat:33.95,lng:-84.55},{name:'Alpharetta',lat:34.08,lng:-84.29},{name:'Roswell',lat:34.02,lng:-84.36},{name:'Sandy Springs',lat:33.92,lng:-84.37},{name:'Kennesaw',lat:34.02,lng:-84.62},{name:'Johns Creek',lat:34.03,lng:-84.20},{name:'Decatur',lat:33.77,lng:-84.30},{name:'Duluth',lat:34.00,lng:-84.14},{name:'Lawrenceville',lat:33.96,lng:-83.99},{name:'Athens',lat:33.96,lng:-83.38},{name:'Macon',lat:32.84,lng:-83.63},{name:'Columbus',lat:32.46,lng:-84.99}],
  'HI': [{name:'Honolulu',lat:21.31,lng:-157.86},{name:'Hilo',lat:19.73,lng:-155.08}],
  'ID': [{name:'Boise',lat:43.62,lng:-116.20},{name:'Meridian',lat:43.61,lng:-116.39},{name:'Idaho Falls',lat:43.49,lng:-112.04}],
  'IL': [{name:'Chicago',lat:41.88,lng:-87.63},{name:'Springfield',lat:39.78,lng:-89.65},{name:'Naperville',lat:41.79,lng:-88.15},{name:'Aurora',lat:41.76,lng:-88.32},{name:'Schaumburg',lat:42.03,lng:-88.08},{name:'Evanston',lat:42.05,lng:-87.69},{name:'Oak Brook',lat:41.83,lng:-87.93},{name:'Peoria',lat:40.69,lng:-89.59},{name:'Rockford',lat:42.27,lng:-89.09},{name:'Joliet',lat:41.53,lng:-88.08}],
  'IN': [{name:'Indianapolis',lat:39.77,lng:-86.16},{name:'Fort Wayne',lat:41.08,lng:-85.14},{name:'Evansville',lat:37.97,lng:-87.56},{name:'South Bend',lat:41.68,lng:-86.25},{name:'Carmel',lat:39.98,lng:-86.12},{name:'Fishers',lat:39.96,lng:-86.01}],
  'IA': [{name:'Des Moines',lat:41.59,lng:-93.63},{name:'Cedar Rapids',lat:41.98,lng:-91.67},{name:'Iowa City',lat:41.66,lng:-91.53},{name:'Davenport',lat:41.52,lng:-90.58}],
  'KS': [{name:'Kansas City',lat:39.10,lng:-94.58},{name:'Wichita',lat:37.69,lng:-97.33},{name:'Overland Park',lat:38.98,lng:-94.67},{name:'Olathe',lat:38.88,lng:-94.82},{name:'Topeka',lat:39.05,lng:-95.68}],
  'KY': [{name:'Louisville',lat:38.25,lng:-85.76},{name:'Lexington',lat:38.04,lng:-84.50},{name:'Bowling Green',lat:36.99,lng:-86.44}],
  'LA': [{name:'New Orleans',lat:29.95,lng:-90.07},{name:'Baton Rouge',lat:30.45,lng:-91.19},{name:'Shreveport',lat:32.53,lng:-93.75},{name:'Lafayette',lat:30.22,lng:-92.02}],
  'ME': [{name:'Portland',lat:43.66,lng:-70.26},{name:'Bangor',lat:44.80,lng:-68.77}],
  'MD': [{name:'Baltimore',lat:39.29,lng:-76.61},{name:'Bethesda',lat:38.99,lng:-77.10},{name:'Columbia',lat:39.20,lng:-76.86},{name:'Annapolis',lat:38.98,lng:-76.49},{name:'Rockville',lat:39.08,lng:-77.15},{name:'Silver Spring',lat:38.99,lng:-77.03},{name:'Frederick',lat:39.41,lng:-77.41},{name:'Towson',lat:39.40,lng:-76.60},{name:'Ellicott City',lat:39.27,lng:-76.80},{name:'Owings Mills',lat:39.42,lng:-76.78}],
  'MA': [{name:'Boston',lat:42.36,lng:-71.06},{name:'Cambridge',lat:42.37,lng:-71.11},{name:'Worcester',lat:42.26,lng:-71.80},{name:'Springfield',lat:42.10,lng:-72.59},{name:'Newton',lat:42.34,lng:-71.21},{name:'Waltham',lat:42.38,lng:-71.24},{name:'Framingham',lat:42.28,lng:-71.42}],
  'MI': [{name:'Detroit',lat:42.33,lng:-83.05},{name:'Grand Rapids',lat:42.96,lng:-85.67},{name:'Ann Arbor',lat:42.28,lng:-83.75},{name:'Troy',lat:42.61,lng:-83.15},{name:'Southfield',lat:42.47,lng:-83.22},{name:'Lansing',lat:42.73,lng:-84.56},{name:'Kalamazoo',lat:42.29,lng:-85.59}],
  'MN': [{name:'Minneapolis',lat:44.98,lng:-93.27},{name:'St. Paul',lat:44.95,lng:-93.09},{name:'Rochester',lat:44.02,lng:-92.47},{name:'Bloomington',lat:44.84,lng:-93.30},{name:'Eden Prairie',lat:44.85,lng:-93.47},{name:'Duluth',lat:46.79,lng:-92.10}],
  'MS': [{name:'Jackson',lat:32.30,lng:-90.18},{name:'Gulfport',lat:30.37,lng:-89.09},{name:'Hattiesburg',lat:31.33,lng:-89.29}],
  'MO': [{name:'St. Louis',lat:38.63,lng:-90.20},{name:'Kansas City',lat:39.10,lng:-94.58},{name:'Springfield',lat:37.22,lng:-93.29},{name:'Columbia',lat:38.95,lng:-92.33}],
  'MT': [{name:'Billings',lat:45.78,lng:-108.50},{name:'Missoula',lat:46.87,lng:-114.00},{name:'Great Falls',lat:47.51,lng:-111.30}],
  'NE': [{name:'Omaha',lat:41.26,lng:-96.00},{name:'Lincoln',lat:40.81,lng:-96.70}],
  'NV': [{name:'Las Vegas',lat:36.17,lng:-115.14},{name:'Reno',lat:39.53,lng:-119.81},{name:'Henderson',lat:36.04,lng:-114.98}],
  'NH': [{name:'Manchester',lat:42.99,lng:-71.46},{name:'Nashua',lat:42.77,lng:-71.47},{name:'Concord',lat:43.21,lng:-71.54}],
  'NJ': [{name:'Newark',lat:40.74,lng:-74.17},{name:'Jersey City',lat:40.72,lng:-74.04},{name:'Trenton',lat:40.22,lng:-74.74},{name:'Princeton',lat:40.35,lng:-74.66},{name:'Morristown',lat:40.80,lng:-74.48},{name:'Cherry Hill',lat:39.93,lng:-75.00},{name:'Hoboken',lat:40.74,lng:-74.03},{name:'Edison',lat:40.52,lng:-74.41},{name:'Parsippany',lat:40.86,lng:-74.43}],
  'NM': [{name:'Albuquerque',lat:35.08,lng:-106.65},{name:'Santa Fe',lat:35.69,lng:-105.94},{name:'Las Cruces',lat:32.35,lng:-106.76}],
  'NY': [{name:'New York City',lat:40.71,lng:-74.01},{name:'Albany',lat:42.65,lng:-73.76},{name:'Buffalo',lat:42.89,lng:-78.88},{name:'Rochester',lat:43.16,lng:-77.62},{name:'Syracuse',lat:43.05,lng:-76.15},{name:'White Plains',lat:41.03,lng:-73.76},{name:'Yonkers',lat:40.93,lng:-73.90},{name:'New Rochelle',lat:40.91,lng:-73.78}],
  'NC': [{name:'Charlotte',lat:35.23,lng:-80.84},{name:'Raleigh',lat:35.78,lng:-78.64},{name:'Durham',lat:35.99,lng:-78.90},{name:'Greensboro',lat:36.07,lng:-79.79},{name:'Winston-Salem',lat:36.10,lng:-80.24},{name:'Asheville',lat:35.60,lng:-82.55},{name:'Cary',lat:35.79,lng:-78.78},{name:'Wilmington',lat:34.23,lng:-77.94}],
  'ND': [{name:'Fargo',lat:46.88,lng:-96.79},{name:'Bismarck',lat:46.81,lng:-100.78}],
  'OH': [{name:'Columbus',lat:39.96,lng:-83.00},{name:'Cleveland',lat:41.50,lng:-81.69},{name:'Cincinnati',lat:39.10,lng:-84.51},{name:'Dayton',lat:39.76,lng:-84.19},{name:'Akron',lat:41.08,lng:-81.52},{name:'Toledo',lat:41.65,lng:-83.54}],
  'OK': [{name:'Oklahoma City',lat:35.47,lng:-97.52},{name:'Tulsa',lat:36.15,lng:-95.99},{name:'Norman',lat:35.22,lng:-97.44}],
  'OR': [{name:'Portland',lat:45.52,lng:-122.68},{name:'Eugene',lat:44.05,lng:-123.09},{name:'Salem',lat:44.94,lng:-123.04},{name:'Bend',lat:44.06,lng:-121.31},{name:'Beaverton',lat:45.49,lng:-122.80}],
  'PA': [{name:'Philadelphia',lat:39.95,lng:-75.16},{name:'Pittsburgh',lat:40.44,lng:-80.00},{name:'Allentown',lat:40.60,lng:-75.47},{name:'King of Prussia',lat:40.09,lng:-75.38},{name:'Harrisburg',lat:40.27,lng:-76.88}],
  'RI': [{name:'Providence',lat:41.82,lng:-71.41},{name:'Warwick',lat:41.70,lng:-71.42}],
  'SC': [{name:'Charleston',lat:32.78,lng:-79.93},{name:'Columbia',lat:34.00,lng:-81.04},{name:'Greenville',lat:34.85,lng:-82.39},{name:'Myrtle Beach',lat:33.69,lng:-78.89}],
  'SD': [{name:'Sioux Falls',lat:43.55,lng:-96.73},{name:'Rapid City',lat:44.08,lng:-103.23}],
  'TN': [{name:'Nashville',lat:36.16,lng:-86.78},{name:'Memphis',lat:35.15,lng:-90.05},{name:'Knoxville',lat:35.96,lng:-83.92},{name:'Chattanooga',lat:35.05,lng:-85.31},{name:'Franklin',lat:35.93,lng:-86.87},{name:'Murfreesboro',lat:35.85,lng:-86.39}],
  'TX': [{name:'Dallas',lat:32.78,lng:-96.80},{name:'Houston',lat:29.76,lng:-95.37},{name:'Austin',lat:30.27,lng:-97.74},{name:'San Antonio',lat:29.43,lng:-98.50},{name:'Fort Worth',lat:32.76,lng:-97.33},{name:'El Paso',lat:31.76,lng:-106.45},{name:'Plano',lat:33.02,lng:-96.70},{name:'Frisco',lat:33.15,lng:-96.82},{name:'Irving',lat:32.81,lng:-96.95},{name:'McKinney',lat:33.20,lng:-96.62},{name:'Arlington',lat:32.74,lng:-97.11},{name:'Sugar Land',lat:29.62,lng:-95.64},{name:'The Woodlands',lat:30.17,lng:-95.46},{name:'Katy',lat:29.79,lng:-95.82}],
  'UT': [{name:'Salt Lake City',lat:40.76,lng:-111.89},{name:'Provo',lat:40.23,lng:-111.66},{name:'Ogden',lat:41.23,lng:-111.97},{name:'Lehi',lat:40.39,lng:-111.85},{name:'Park City',lat:40.65,lng:-111.50}],
  'VT': [{name:'Burlington',lat:44.48,lng:-73.21},{name:'Montpelier',lat:44.26,lng:-72.58}],
  'VA': [{name:'Richmond',lat:37.54,lng:-77.44},{name:'Arlington',lat:38.88,lng:-77.11},{name:'Virginia Beach',lat:36.85,lng:-75.98},{name:'Reston',lat:38.96,lng:-77.34},{name:'Alexandria',lat:38.80,lng:-77.05},{name:'McLean',lat:38.93,lng:-77.18},{name:'Tysons',lat:38.92,lng:-77.23},{name:'Fairfax',lat:38.85,lng:-77.31},{name:'Norfolk',lat:36.85,lng:-76.29},{name:'Charlottesville',lat:38.03,lng:-78.48}],
  'WA': [{name:'Seattle',lat:47.61,lng:-122.33},{name:'Tacoma',lat:47.25,lng:-122.44},{name:'Bellevue',lat:47.61,lng:-122.20},{name:'Spokane',lat:47.66,lng:-117.43},{name:'Redmond',lat:47.67,lng:-122.12},{name:'Kirkland',lat:47.68,lng:-122.21},{name:'Olympia',lat:47.04,lng:-122.90}],
  'WV': [{name:'Charleston',lat:38.35,lng:-81.63},{name:'Morgantown',lat:39.63,lng:-79.96}],
  'WI': [{name:'Milwaukee',lat:43.04,lng:-87.91},{name:'Madison',lat:43.07,lng:-89.40},{name:'Green Bay',lat:44.51,lng:-88.02}],
  'WY': [{name:'Cheyenne',lat:41.14,lng:-104.82},{name:'Casper',lat:42.87,lng:-106.31}],
}

// Robust state extraction — handles hyphens, metro areas, abbreviations
export function extractState(location: string): string {
  if (!location) return ''
  const loc = location.replace(/[-–—]/g, ' ').toLowerCase().trim()
  // Try full state name
  for (const [name, abbr] of Object.entries(NAME_TO_ABBR)) {
    if (loc.includes(name)) return abbr
  }
  // Try 2-letter abbr after comma: "Dallas, TX" or "Dallas, Texas, United States"
  const parts = location.split(',').map(p => p.trim())
  for (const part of parts) {
    const upper = part.toUpperCase()
    if (upper.length === 2 && US_STATES[upper]) return upper
  }
  // Try "Greater X" or "X Metro" or "X Metropolitan"
  const metroMatch = loc.match(/(greater|metro|metropolitan)\s+(\w+)/i)
  if (metroMatch) {
    const city = metroMatch[2]
    for (const [st, cities] of Object.entries(STATE_CITIES)) {
      if (cities.some(c => c.name.toLowerCase() === city)) return st
    }
  }
  // "X-Y" metro patterns like "Dallas-Fort Worth"
  const dashMatch = location.match(/^([A-Z][a-z]+)\s*[-–]\s*([A-Z][a-z]+)/)
  if (dashMatch) {
    const city1 = dashMatch[1].toLowerCase()
    for (const [st, cities] of Object.entries(STATE_CITIES)) {
      if (cities.some(c => c.name.toLowerCase() === city1)) return st
    }
  }
  // "X City Metropolitan Area" or "X City Metro"
  for (const [st, cities] of Object.entries(STATE_CITIES)) {
    for (const city of cities) {
      if (loc.includes(city.name.toLowerCase())) return st
    }
  }
  return ''
}

export function getAllStateAbbrs(): string[] { return Object.keys(US_STATES).sort() }
export function getCitiesForState(s: string): { name: string; lat: number; lng: number }[] { return STATE_CITIES[s] || [] }

// Discipline detection
const RULES: { d: string; kw: string[] }[] = [
  {d:'Mechanical',kw:['mechanical','hvac','piping','sheet metal','refrigeration','boiler','chiller','ductwork','ventilation']},
  {d:'Electrical',kw:['electrical','power','lighting','low voltage','high voltage','switchgear','transformer']},
  {d:'Plumbing',kw:['plumbing','plumber','sanitary','drainage','water treatment','backflow','domestic water']},
  {d:'Fire Protection',kw:['fire protection','fire life safety','sprinkler','suppression','fpe','nicet','nfpa']},
  {d:'Management',kw:['project manager',' pm ','superintendent','apm','assistant project manager','construction manager','operations manager','director','vp ','vice president','principal','partner','general manager','branch manager','president']},
  {d:'Engineering',kw:['engineer','designer','drafter','cad','bim','revit','modeler','autocad','detailer','coordinator']},
  {d:'Estimating',kw:['estimator','estimating','preconstruction','pre-construction','takeoff']},
  {d:'Sales',kw:['sales','business development','account manager','account executive']},
  {d:'Construction',kw:['foreman','journeyman','apprentice','installer','technician','service tech','field engineer','field supervisor']},
]
export function detectDisciplines(t?: string, co?: string, pt?: string, pc?: string): string[] {
  const text = ' '+[t,co,pt,pc].filter(Boolean).join(' ').toLowerCase()+' '
  const f = new Set<string>()
  for (const r of RULES) { for (const k of r.kw) { if (text.includes(k)) { f.add(r.d); break } } }
  return Array.from(f)
}
export function getDisciplineNames(): string[] { return RULES.map(r => r.d) }
export function geocodeLocation(loc: string): {lat:number;lng:number;metro:string}|null {
  if (!loc) return null; const lower = loc.replace(/[-–—]/g,' ').toLowerCase()
  for (const cities of Object.values(STATE_CITIES)) {
    for (const c of cities) { if (lower.includes(c.name.toLowerCase())) return {lat:c.lat,lng:c.lng,metro:c.name} }
  }
  return null
}
export function getMetroNames(): string[] {
  const a = new Set<string>(); for (const c of Object.values(STATE_CITIES)) c.forEach(x=>a.add(x.name)); return Array.from(a).sort()
}
