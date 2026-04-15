// All 50 US states + DC with major cities and coordinates
// Filter flow: State → City → Radius

export const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois',
  'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
  'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon',
  'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota',
  'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia',
  'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
}

// Major cities per state with coordinates
export const STATE_CITIES: Record<string, { name: string; lat: number; lng: number }[]> = {
  'AL': [{ name: 'Birmingham', lat: 33.520, lng: -86.803 }, { name: 'Huntsville', lat: 34.730, lng: -86.586 }, { name: 'Montgomery', lat: 32.377, lng: -86.300 }, { name: 'Mobile', lat: 30.695, lng: -88.040 }],
  'AK': [{ name: 'Anchorage', lat: 61.218, lng: -149.900 }, { name: 'Fairbanks', lat: 64.837, lng: -147.716 }],
  'AZ': [{ name: 'Phoenix', lat: 33.449, lng: -112.074 }, { name: 'Tucson', lat: 32.222, lng: -110.975 }, { name: 'Scottsdale', lat: 33.494, lng: -111.926 }, { name: 'Mesa', lat: 33.415, lng: -111.831 }],
  'AR': [{ name: 'Little Rock', lat: 34.746, lng: -92.290 }, { name: 'Fayetteville', lat: 36.063, lng: -94.157 }],
  'CA': [{ name: 'Los Angeles', lat: 34.052, lng: -118.244 }, { name: 'San Francisco', lat: 37.775, lng: -122.419 }, { name: 'San Diego', lat: 32.716, lng: -117.161 }, { name: 'San Jose', lat: 37.338, lng: -121.886 }, { name: 'Sacramento', lat: 38.582, lng: -121.494 }, { name: 'Irvine', lat: 33.684, lng: -117.827 }],
  'CO': [{ name: 'Denver', lat: 39.739, lng: -104.990 }, { name: 'Colorado Springs', lat: 38.834, lng: -104.821 }, { name: 'Boulder', lat: 40.015, lng: -105.271 }, { name: 'Fort Collins', lat: 40.585, lng: -105.084 }],
  'CT': [{ name: 'Hartford', lat: 41.764, lng: -72.685 }, { name: 'Stamford', lat: 41.053, lng: -73.539 }, { name: 'New Haven', lat: 41.308, lng: -72.928 }, { name: 'Bridgeport', lat: 41.187, lng: -73.195 }],
  'DE': [{ name: 'Wilmington', lat: 39.739, lng: -75.540 }, { name: 'Dover', lat: 39.158, lng: -75.525 }],
  'DC': [{ name: 'Washington DC', lat: 38.907, lng: -77.037 }],
  'FL': [{ name: 'Miami', lat: 25.762, lng: -80.192 }, { name: 'Tampa', lat: 27.951, lng: -82.457 }, { name: 'Orlando', lat: 28.538, lng: -81.379 }, { name: 'Jacksonville', lat: 30.332, lng: -81.656 }, { name: 'Fort Lauderdale', lat: 26.122, lng: -80.137 }, { name: 'West Palm Beach', lat: 26.715, lng: -80.054 }],
  'GA': [{ name: 'Atlanta', lat: 33.749, lng: -84.388 }, { name: 'Savannah', lat: 32.081, lng: -81.091 }, { name: 'Augusta', lat: 33.471, lng: -81.975 }],
  'HI': [{ name: 'Honolulu', lat: 21.307, lng: -157.858 }],
  'ID': [{ name: 'Boise', lat: 43.615, lng: -116.202 }],
  'IL': [{ name: 'Chicago', lat: 41.878, lng: -87.630 }, { name: 'Springfield', lat: 39.781, lng: -89.650 }, { name: 'Naperville', lat: 41.786, lng: -88.147 }],
  'IN': [{ name: 'Indianapolis', lat: 39.768, lng: -86.158 }, { name: 'Fort Wayne', lat: 41.079, lng: -85.139 }],
  'IA': [{ name: 'Des Moines', lat: 41.586, lng: -93.625 }, { name: 'Cedar Rapids', lat: 41.977, lng: -91.666 }],
  'KS': [{ name: 'Kansas City', lat: 39.100, lng: -94.579 }, { name: 'Wichita', lat: 37.687, lng: -97.330 }],
  'KY': [{ name: 'Louisville', lat: 38.253, lng: -85.759 }, { name: 'Lexington', lat: 38.040, lng: -84.503 }],
  'LA': [{ name: 'New Orleans', lat: 29.951, lng: -90.072 }, { name: 'Baton Rouge', lat: 30.451, lng: -91.187 }],
  'ME': [{ name: 'Portland', lat: 43.661, lng: -70.256 }],
  'MD': [{ name: 'Baltimore', lat: 39.290, lng: -76.612 }, { name: 'Bethesda', lat: 38.985, lng: -77.095 }, { name: 'Columbia', lat: 39.204, lng: -76.861 }],
  'MA': [{ name: 'Boston', lat: 42.361, lng: -71.058 }, { name: 'Cambridge', lat: 42.373, lng: -71.110 }, { name: 'Worcester', lat: 42.263, lng: -71.802 }],
  'MI': [{ name: 'Detroit', lat: 42.331, lng: -83.046 }, { name: 'Grand Rapids', lat: 42.963, lng: -85.668 }, { name: 'Ann Arbor', lat: 42.281, lng: -83.749 }],
  'MN': [{ name: 'Minneapolis', lat: 44.978, lng: -93.265 }, { name: 'St. Paul', lat: 44.954, lng: -93.090 }],
  'MS': [{ name: 'Jackson', lat: 32.299, lng: -90.185 }],
  'MO': [{ name: 'St. Louis', lat: 38.627, lng: -90.199 }, { name: 'Kansas City', lat: 39.100, lng: -94.579 }],
  'MT': [{ name: 'Billings', lat: 45.783, lng: -108.500 }],
  'NE': [{ name: 'Omaha', lat: 41.257, lng: -95.995 }, { name: 'Lincoln', lat: 40.813, lng: -96.702 }],
  'NV': [{ name: 'Las Vegas', lat: 36.169, lng: -115.140 }, { name: 'Reno', lat: 39.530, lng: -119.814 }],
  'NH': [{ name: 'Manchester', lat: 42.991, lng: -71.464 }],
  'NJ': [{ name: 'Newark', lat: 40.736, lng: -74.172 }, { name: 'Jersey City', lat: 40.717, lng: -74.043 }, { name: 'Trenton', lat: 40.217, lng: -74.743 }],
  'NM': [{ name: 'Albuquerque', lat: 35.084, lng: -106.651 }, { name: 'Santa Fe', lat: 35.687, lng: -105.938 }],
  'NY': [{ name: 'New York City', lat: 40.713, lng: -74.006 }, { name: 'Albany', lat: 42.653, lng: -73.757 }, { name: 'Buffalo', lat: 42.887, lng: -78.879 }, { name: 'Rochester', lat: 43.157, lng: -77.616 }, { name: 'White Plains', lat: 41.034, lng: -73.763 }],
  'NC': [{ name: 'Charlotte', lat: 35.227, lng: -80.843 }, { name: 'Raleigh', lat: 35.780, lng: -78.639 }, { name: 'Durham', lat: 35.994, lng: -78.899 }],
  'ND': [{ name: 'Fargo', lat: 46.877, lng: -96.790 }],
  'OH': [{ name: 'Columbus', lat: 39.961, lng: -82.999 }, { name: 'Cleveland', lat: 41.500, lng: -81.694 }, { name: 'Cincinnati', lat: 39.103, lng: -84.512 }],
  'OK': [{ name: 'Oklahoma City', lat: 35.468, lng: -97.517 }, { name: 'Tulsa', lat: 36.154, lng: -95.993 }],
  'OR': [{ name: 'Portland', lat: 45.523, lng: -122.677 }, { name: 'Eugene', lat: 44.052, lng: -123.087 }],
  'PA': [{ name: 'Philadelphia', lat: 39.953, lng: -75.164 }, { name: 'Pittsburgh', lat: 40.441, lng: -79.996 }],
  'RI': [{ name: 'Providence', lat: 41.824, lng: -71.413 }],
  'SC': [{ name: 'Charleston', lat: 32.777, lng: -79.931 }, { name: 'Columbia', lat: 34.000, lng: -81.035 }, { name: 'Greenville', lat: 34.852, lng: -82.394 }],
  'SD': [{ name: 'Sioux Falls', lat: 43.547, lng: -96.729 }],
  'TN': [{ name: 'Nashville', lat: 36.163, lng: -86.782 }, { name: 'Memphis', lat: 35.150, lng: -90.049 }, { name: 'Knoxville', lat: 35.961, lng: -83.921 }],
  'TX': [{ name: 'Dallas', lat: 32.777, lng: -96.797 }, { name: 'Houston', lat: 29.760, lng: -95.370 }, { name: 'Austin', lat: 30.267, lng: -97.743 }, { name: 'San Antonio', lat: 29.425, lng: -98.495 }, { name: 'Fort Worth', lat: 32.755, lng: -97.331 }],
  'UT': [{ name: 'Salt Lake City', lat: 40.761, lng: -111.891 }, { name: 'Provo', lat: 40.234, lng: -111.658 }],
  'VT': [{ name: 'Burlington', lat: 44.476, lng: -73.213 }],
  'VA': [{ name: 'Richmond', lat: 37.541, lng: -77.436 }, { name: 'Arlington', lat: 38.880, lng: -77.107 }, { name: 'Virginia Beach', lat: 36.853, lng: -75.978 }, { name: 'Reston', lat: 38.960, lng: -77.342 }],
  'WA': [{ name: 'Seattle', lat: 47.606, lng: -122.332 }, { name: 'Tacoma', lat: 47.253, lng: -122.441 }, { name: 'Bellevue', lat: 47.610, lng: -122.201 }],
  'WV': [{ name: 'Charleston', lat: 38.350, lng: -81.633 }],
  'WI': [{ name: 'Milwaukee', lat: 43.039, lng: -87.907 }, { name: 'Madison', lat: 43.073, lng: -89.401 }],
  'WY': [{ name: 'Cheyenne', lat: 41.140, lng: -104.820 }],
}

// State name → abbreviation reverse lookup
export const STATE_NAME_TO_ABBR: Record<string, string> = {}
for (const [abbr, name] of Object.entries(US_STATES)) {
  STATE_NAME_TO_ABBR[name.toLowerCase()] = abbr
}

// Extract state abbreviation from location string
export function extractState(location: string): string {
  if (!location) return ''
  const loc = location.toLowerCase().trim()
  // Try full state name match
  for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (loc.includes(name)) return abbr
  }
  // Try comma + 2-letter abbreviation
  const m = location.match(/,\s*([A-Z]{2})\b/)
  if (m && US_STATES[m[1]]) return m[1]
  return ''
}

// Get all state abbreviations sorted
export function getAllStateAbbrs(): string[] {
  return Object.keys(US_STATES).sort()
}

// Get cities for a state
export function getCitiesForState(stateAbbr: string): { name: string; lat: number; lng: number }[] {
  return STATE_CITIES[stateAbbr] || []
}

// Discipline detection for MEP
const RULES: { discipline: string; keywords: string[] }[] = [
  { discipline: 'Mechanical', keywords: ['mechanical', 'hvac', 'piping', 'sheet metal', 'refrigeration', 'boiler', 'chiller', 'ductwork', 'ventilation'] },
  { discipline: 'Electrical', keywords: ['electrical', 'power', 'lighting', 'low voltage', 'high voltage', 'switchgear', 'transformer', 'fire alarm'] },
  { discipline: 'Plumbing', keywords: ['plumbing', 'plumber', 'sanitary', 'drainage', 'water treatment', 'backflow', 'domestic water'] },
  { discipline: 'Fire Protection', keywords: ['fire protection', 'fire life safety', 'sprinkler', 'suppression', 'fpe', 'nicet', 'nfpa'] },
  { discipline: 'Management', keywords: ['project manager', ' pm ', 'superintendent', 'apm', 'assistant project manager', 'construction manager', 'operations manager', 'director', 'vp ', 'vice president', 'principal', 'partner', 'general manager', 'branch manager', 'president'] },
  { discipline: 'Engineering', keywords: ['engineer', 'designer', 'drafter', 'cad', 'bim', 'revit', 'modeler', 'autocad', 'detailer', 'coordinator'] },
  { discipline: 'Estimating', keywords: ['estimator', 'estimating', 'preconstruction', 'pre-construction', 'takeoff'] },
  { discipline: 'Sales', keywords: ['sales', 'business development', 'account manager', 'account executive'] },
  { discipline: 'Construction', keywords: ['foreman', 'journeyman', 'apprentice', 'installer', 'technician', 'service tech', 'field engineer'] },
]

export function detectDisciplines(title?: string, company?: string, prevTitle?: string, prevCompany?: string): string[] {
  const text = ' ' + [title, company, prevTitle, prevCompany].filter(Boolean).join(' ').toLowerCase() + ' '
  const found = new Set<string>()
  for (const rule of RULES) { for (const kw of rule.keywords) { if (text.includes(kw)) { found.add(rule.discipline); break } } }
  return Array.from(found)
}

export function getDisciplineNames(): string[] {
  return RULES.map(r => r.discipline)
}

// Geocode for import page
export function geocodeLocation(loc: string): { lat: number; lng: number; metro: string } | null {
  if (!loc) return null
  const lower = loc.toLowerCase()
  for (const cities of Object.values(STATE_CITIES)) {
    for (const city of cities) {
      if (lower.includes(city.name.toLowerCase())) return { lat: city.lat, lng: city.lng, metro: city.name }
    }
  }
  return null
}

export function getMetroNames(): string[] {
  const all = new Set<string>()
  for (const cities of Object.values(STATE_CITIES)) { for (const c of cities) all.add(c.name) }
  return Array.from(all).sort()
}
