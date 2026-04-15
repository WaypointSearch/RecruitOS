// Geo Intelligence + MEP Discipline Tagging — No duplicate keys

// City coordinates for radius search — disambiguated with state where needed
export const US_CITIES: Record<string, { lat: number; lng: number; metro: string }> = {
  'atlanta': { lat: 33.749, lng: -84.388, metro: 'Atlanta' },
  'marietta': { lat: 33.953, lng: -84.549, metro: 'Atlanta' },
  'alpharetta': { lat: 34.075, lng: -84.294, metro: 'Atlanta' },
  'roswell': { lat: 34.023, lng: -84.362, metro: 'Atlanta' },
  'decatur': { lat: 33.775, lng: -84.296, metro: 'Atlanta' },
  'sandy springs': { lat: 33.924, lng: -84.371, metro: 'Atlanta' },
  'kennesaw': { lat: 34.023, lng: -84.616, metro: 'Atlanta' },
  'duluth': { lat: 34.003, lng: -84.145, metro: 'Atlanta' },
  'lawrenceville': { lat: 33.956, lng: -83.988, metro: 'Atlanta' },
  'smyrna ga': { lat: 33.884, lng: -84.514, metro: 'Atlanta' },
  'johns creek': { lat: 34.029, lng: -84.198, metro: 'Atlanta' },
  'dunwoody': { lat: 33.946, lng: -84.334, metro: 'Atlanta' },
  'brookhaven': { lat: 33.865, lng: -84.340, metro: 'Atlanta' },
  'cumming': { lat: 34.207, lng: -84.140, metro: 'Atlanta' },
  'suwanee': { lat: 34.052, lng: -84.071, metro: 'Atlanta' },
  'woodstock': { lat: 34.101, lng: -84.519, metro: 'Atlanta' },
  'norcross': { lat: 33.941, lng: -84.213, metro: 'Atlanta' },
  'snellville': { lat: 33.857, lng: -84.020, metro: 'Atlanta' },
  'douglasville': { lat: 33.751, lng: -84.748, metro: 'Atlanta' },
  'newnan': { lat: 33.381, lng: -84.800, metro: 'Atlanta' },
  'mcdonough': { lat: 33.447, lng: -84.147, metro: 'Atlanta' },
  'gainesville ga': { lat: 34.297, lng: -83.824, metro: 'Atlanta' },
  'buford': { lat: 34.120, lng: -84.004, metro: 'Atlanta' },
  'conyers': { lat: 33.668, lng: -84.018, metro: 'Atlanta' },
  'dallas tx': { lat: 32.777, lng: -96.797, metro: 'Dallas' },
  'fort worth': { lat: 32.755, lng: -97.331, metro: 'Dallas' },
  'plano': { lat: 33.020, lng: -96.699, metro: 'Dallas' },
  'irving': { lat: 32.814, lng: -96.949, metro: 'Dallas' },
  'arlington tx': { lat: 32.736, lng: -97.108, metro: 'Dallas' },
  'frisco': { lat: 33.151, lng: -96.824, metro: 'Dallas' },
  'mckinney': { lat: 33.198, lng: -96.616, metro: 'Dallas' },
  'richardson': { lat: 32.948, lng: -96.730, metro: 'Dallas' },
  'denton': { lat: 33.215, lng: -97.133, metro: 'Dallas' },
  'lewisville': { lat: 33.046, lng: -96.994, metro: 'Dallas' },
  'carrollton': { lat: 32.976, lng: -96.890, metro: 'Dallas' },
  'garland': { lat: 32.912, lng: -96.639, metro: 'Dallas' },
  'grand prairie': { lat: 32.746, lng: -96.998, metro: 'Dallas' },
  'houston': { lat: 29.760, lng: -95.370, metro: 'Houston' },
  'sugar land': { lat: 29.620, lng: -95.635, metro: 'Houston' },
  'katy': { lat: 29.786, lng: -95.824, metro: 'Houston' },
  'the woodlands': { lat: 30.166, lng: -95.461, metro: 'Houston' },
  'pearland': { lat: 29.564, lng: -95.286, metro: 'Houston' },
  'cypress': { lat: 29.969, lng: -95.697, metro: 'Houston' },
  'spring tx': { lat: 30.080, lng: -95.383, metro: 'Houston' },
  'conroe': { lat: 30.312, lng: -95.456, metro: 'Houston' },
  'league city': { lat: 29.507, lng: -95.095, metro: 'Houston' },
  'tomball': { lat: 30.097, lng: -95.616, metro: 'Houston' },
  'miami': { lat: 25.762, lng: -80.192, metro: 'Miami' },
  'fort lauderdale': { lat: 26.122, lng: -80.137, metro: 'Miami' },
  'west palm beach': { lat: 26.715, lng: -80.054, metro: 'Miami' },
  'boca raton': { lat: 26.359, lng: -80.083, metro: 'Miami' },
  'pembroke pines': { lat: 26.013, lng: -80.224, metro: 'Miami' },
  'coral springs': { lat: 26.271, lng: -80.271, metro: 'Miami' },
  'plantation': { lat: 26.128, lng: -80.233, metro: 'Miami' },
  'delray beach': { lat: 26.462, lng: -80.073, metro: 'Miami' },
  'jupiter': { lat: 26.934, lng: -80.094, metro: 'Miami' },
  'doral': { lat: 25.820, lng: -80.355, metro: 'Miami' },
  'hialeah': { lat: 25.858, lng: -80.278, metro: 'Miami' },
  'coral gables': { lat: 25.722, lng: -80.270, metro: 'Miami' },
  'weston': { lat: 26.101, lng: -80.400, metro: 'Miami' },
  'stuart': { lat: 27.198, lng: -80.253, metro: 'Miami' },
  'port st. lucie': { lat: 27.273, lng: -80.358, metro: 'Miami' },
  'boynton beach': { lat: 26.526, lng: -80.066, metro: 'Miami' },
  'pompano beach': { lat: 26.238, lng: -80.125, metro: 'Miami' },
  'palm beach gardens': { lat: 26.823, lng: -80.139, metro: 'Miami' },
  'davie': { lat: 26.063, lng: -80.233, metro: 'Miami' },
  'new york': { lat: 40.713, lng: -74.006, metro: 'New York' },
  'manhattan': { lat: 40.776, lng: -73.972, metro: 'New York' },
  'brooklyn': { lat: 40.650, lng: -73.950, metro: 'New York' },
  'newark': { lat: 40.736, lng: -74.172, metro: 'New York' },
  'jersey city': { lat: 40.717, lng: -74.043, metro: 'New York' },
  'yonkers': { lat: 40.931, lng: -73.899, metro: 'New York' },
  'white plains': { lat: 41.034, lng: -73.763, metro: 'New York' },
  'stamford': { lat: 41.053, lng: -73.539, metro: 'New York' },
  'hoboken': { lat: 40.744, lng: -74.028, metro: 'New York' },
  'chicago': { lat: 41.878, lng: -87.630, metro: 'Chicago' },
  'naperville': { lat: 41.786, lng: -88.147, metro: 'Chicago' },
  'aurora il': { lat: 41.761, lng: -88.320, metro: 'Chicago' },
  'schaumburg': { lat: 42.031, lng: -88.084, metro: 'Chicago' },
  'evanston': { lat: 42.045, lng: -87.688, metro: 'Chicago' },
  'oak brook': { lat: 41.833, lng: -87.929, metro: 'Chicago' },
  'tampa': { lat: 27.951, lng: -82.457, metro: 'Tampa' },
  'st. petersburg': { lat: 27.771, lng: -82.679, metro: 'Tampa' },
  'clearwater': { lat: 27.966, lng: -82.800, metro: 'Tampa' },
  'orlando': { lat: 28.538, lng: -81.379, metro: 'Orlando' },
  'jacksonville': { lat: 30.332, lng: -81.656, metro: 'Jacksonville' },
  'phoenix': { lat: 33.449, lng: -112.074, metro: 'Phoenix' },
  'scottsdale': { lat: 33.494, lng: -111.926, metro: 'Phoenix' },
  'tempe': { lat: 33.426, lng: -111.940, metro: 'Phoenix' },
  'mesa': { lat: 33.415, lng: -111.831, metro: 'Phoenix' },
  'denver': { lat: 39.739, lng: -104.990, metro: 'Denver' },
  'aurora co': { lat: 39.729, lng: -104.832, metro: 'Denver' },
  'boulder': { lat: 40.015, lng: -105.271, metro: 'Denver' },
  'seattle': { lat: 47.606, lng: -122.332, metro: 'Seattle' },
  'bellevue wa': { lat: 47.610, lng: -122.201, metro: 'Seattle' },
  'boston': { lat: 42.361, lng: -71.058, metro: 'Boston' },
  'cambridge': { lat: 42.373, lng: -71.110, metro: 'Boston' },
  'washington': { lat: 38.907, lng: -77.037, metro: 'Washington DC' },
  'arlington va': { lat: 38.880, lng: -77.107, metro: 'Washington DC' },
  'bethesda': { lat: 38.985, lng: -77.095, metro: 'Washington DC' },
  'reston': { lat: 38.960, lng: -77.342, metro: 'Washington DC' },
  'los angeles': { lat: 34.052, lng: -118.244, metro: 'Los Angeles' },
  'san francisco': { lat: 37.775, lng: -122.419, metro: 'San Francisco' },
  'san diego': { lat: 32.716, lng: -117.161, metro: 'San Diego' },
  'austin': { lat: 30.267, lng: -97.743, metro: 'Austin' },
  'san antonio': { lat: 29.425, lng: -98.495, metro: 'San Antonio' },
  'nashville': { lat: 36.163, lng: -86.782, metro: 'Nashville' },
  'charlotte': { lat: 35.227, lng: -80.843, metro: 'Charlotte' },
  'raleigh': { lat: 35.780, lng: -78.639, metro: 'Raleigh' },
  'detroit': { lat: 42.331, lng: -83.046, metro: 'Detroit' },
  'minneapolis': { lat: 44.978, lng: -93.265, metro: 'Minneapolis' },
  'philadelphia': { lat: 39.953, lng: -75.164, metro: 'Philadelphia' },
  'baltimore': { lat: 39.290, lng: -76.612, metro: 'Baltimore' },
  'pittsburgh': { lat: 40.441, lng: -79.996, metro: 'Pittsburgh' },
  'st. louis': { lat: 38.627, lng: -90.199, metro: 'St. Louis' },
  'kansas city': { lat: 39.100, lng: -94.579, metro: 'Kansas City' },
  'portland': { lat: 45.523, lng: -122.677, metro: 'Portland' },
  'salt lake city': { lat: 40.761, lng: -111.891, metro: 'Salt Lake City' },
  'las vegas': { lat: 36.169, lng: -115.140, metro: 'Las Vegas' },
  'columbus': { lat: 39.961, lng: -82.999, metro: 'Columbus' },
  'indianapolis': { lat: 39.768, lng: -86.158, metro: 'Indianapolis' },
  'cincinnati': { lat: 39.103, lng: -84.512, metro: 'Cincinnati' },
  'cleveland': { lat: 41.500, lng: -81.694, metro: 'Cleveland' },
}

export function geocodeLocation(locationStr: string): { lat: number; lng: number; metro: string } | null {
  if (!locationStr) return null
  const lower = locationStr.toLowerCase()
  let best: { lat: number; lng: number; metro: string } | null = null
  let bestLen = 0
  for (const [city, coords] of Object.entries(US_CITIES)) {
    // Strip state suffix for matching (e.g. 'arlington tx' matches 'Arlington, Texas')
    const cityBase = city.replace(/ (tx|va|il|co|wa|ga)$/, '')
    if (lower.includes(cityBase) && cityBase.length > bestLen) {
      best = coords; bestLen = cityBase.length
    }
  }
  const greaterMatch = lower.match(/greater\s+(\w+)/)
  if (greaterMatch && !best) {
    const c = greaterMatch[1]; if (US_CITIES[c]) best = US_CITIES[c]
  }
  return best
}

export function detectMetroArea(location: string): string | null {
  return geocodeLocation(location)?.metro || null
}

export function getMetroNames(): string[] {
  return Array.from(new Set(Object.values(US_CITIES).map(c => c.metro))).sort()
}

// Lookup metro center coords for radius search
export function getMetroCenter(metro: string): { lat: number; lng: number } | null {
  const entry = Object.values(US_CITIES).find(c => c.metro === metro)
  return entry ? { lat: entry.lat, lng: entry.lng } : null
}

// ---- MEP Discipline Tagging ----
const RULES: { discipline: string; keywords: string[] }[] = [
  { discipline: 'Mechanical', keywords: ['mechanical', 'hvac', 'plumbing', 'piping', 'sheet metal', 'refrigeration', 'boiler', 'chiller', 'ductwork', 'ventilation', 'fire protection', 'sprinkler'] },
  { discipline: 'Electrical', keywords: ['electrical', 'power', 'lighting', 'low voltage', 'high voltage', 'switchgear', 'transformer', 'fire alarm', 'security systems', 'telecom'] },
  { discipline: 'Plumbing', keywords: ['plumbing', 'plumber', 'sanitary', 'drainage', 'water treatment', 'backflow', 'domestic water', 'sewer'] },
  { discipline: 'Management', keywords: ['project manager', ' pm ', 'superintendent', 'apm', 'assistant project manager', 'construction manager', 'operations manager', 'director', 'vp ', 'vice president', 'principal', 'partner', 'general manager', 'branch manager'] },
  { discipline: 'Engineering', keywords: ['engineer', 'designer', 'drafter', 'cad', 'bim', 'revit', 'modeler', 'autocad', 'detailer', 'coordinator'] },
  { discipline: 'Estimating', keywords: ['estimator', 'estimating', 'preconstruction', 'pre-construction', 'takeoff', 'proposal'] },
  { discipline: 'Sales', keywords: ['sales', 'business development', 'account manager', 'account executive', 'client relations'] },
  { discipline: 'Construction', keywords: ['foreman', 'journeyman', 'apprentice', 'installer', 'technician', 'service tech', 'field engineer', 'field supervisor', 'site manager'] },
]

export function detectDisciplines(title?: string, company?: string, prevTitle?: string, prevCompany?: string): string[] {
  const text = ' ' + [title, company, prevTitle, prevCompany].filter(Boolean).join(' ').toLowerCase() + ' '
  const found = new Set<string>()
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) { found.add(rule.discipline); break }
    }
  }
  return Array.from(found)
}

export function getDisciplineNames(): string[] {
  return RULES.map(r => r.discipline)
}
