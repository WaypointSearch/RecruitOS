// US Metro Area groupings — maps suburb/city names to their parent metro
// This enables searching "Atlanta" and finding candidates in Marietta, Alpharetta, etc.

export const METRO_AREAS: Record<string, string[]> = {
  'Atlanta': ['Atlanta', 'Marietta', 'Alpharetta', 'Roswell', 'Decatur', 'Sandy Springs', 'Kennesaw', 'Duluth', 'Lawrenceville', 'Norcross', 'Smyrna', 'Brookhaven', 'Johns Creek', 'Peachtree', 'Tucker', 'Dunwoody', 'Cumming', 'Suwanee', 'Buford', 'Snellville', 'Conyers', 'Lithonia', 'Stone Mountain', 'Woodstock', 'Canton', 'Acworth', 'Douglasville', 'Newnan', 'Fayetteville', 'Stockbridge', 'McDonough', 'Covington', 'Gainesville', 'Georgia'],
  'Dallas': ['Dallas', 'Fort Worth', 'Plano', 'Irving', 'Arlington', 'Frisco', 'McKinney', 'Garland', 'Richardson', 'Carrollton', 'Lewisville', 'Allen', 'Denton', 'Mesquite', 'Flower Mound', 'Grapevine', 'Southlake', 'Keller', 'Coppell', 'Wylie', 'Rockwall', 'Prosper', 'Little Elm', 'Mansfield', 'Cedar Hill', 'DeSoto', 'Duncanville', 'Grand Prairie', 'Euless', 'Bedford', 'Hurst', 'Colleyville', 'Trophy Club', 'Roanoke', 'DFW', 'North Texas'],
  'Houston': ['Houston', 'Sugar Land', 'Katy', 'The Woodlands', 'Pearland', 'League City', 'Cypress', 'Spring', 'Pasadena', 'Baytown', 'Missouri City', 'Conroe', 'Friendswood', 'Humble', 'Kingwood', 'Tomball', 'Richmond', 'Rosenberg', 'Galveston', 'Webster', 'Clear Lake', 'Bellaire', 'Stafford', 'Alvin', 'Texas City'],
  'Chicago': ['Chicago', 'Naperville', 'Aurora', 'Joliet', 'Elgin', 'Schaumburg', 'Evanston', 'Skokie', 'Des Plaines', 'Oak Park', 'Tinley Park', 'Orland Park', 'Oak Brook', 'Downers Grove', 'Wheaton', 'Lombard', 'Bolingbrook', 'Hoffman Estates', 'Palatine', 'Arlington Heights', 'Buffalo Grove', 'Lake Forest', 'Highland Park', 'Waukegan', 'Libertyville', 'Vernon Hills', 'Glenview', 'Northbrook', 'Elk Grove Village', 'Plainfield', 'Chicagoland'],
  'Miami': ['Miami', 'Fort Lauderdale', 'West Palm Beach', 'Boca Raton', 'Hollywood', 'Pembroke Pines', 'Coral Springs', 'Davie', 'Plantation', 'Sunrise', 'Pompano Beach', 'Deerfield Beach', 'Delray Beach', 'Boynton Beach', 'Jupiter', 'Wellington', 'Palm Beach Gardens', 'Aventura', 'Doral', 'Hialeah', 'Kendall', 'Homestead', 'Coral Gables', 'Coconut Grove', 'Key Biscayne', 'Weston', 'Miramar', 'South Florida', 'Stuart', 'Port St. Lucie'],
  'New York': ['New York', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Newark', 'Jersey City', 'Hoboken', 'Yonkers', 'White Plains', 'New Rochelle', 'Stamford', 'Greenwich', 'Norwalk', 'Danbury', 'Bridgeport', 'Nassau', 'Suffolk', 'Long Island', 'Westchester', 'Rockland', 'Bergen', 'Passaic', 'Morris', 'Essex', 'Hudson', 'Middlesex', 'Monmouth', 'Garden City', 'Great Neck', 'Manhasset', 'Hempstead', 'Freeport', 'NYC', 'Tri-State'],
  'Los Angeles': ['Los Angeles', 'Pasadena', 'Glendale', 'Burbank', 'Santa Monica', 'Beverly Hills', 'West Hollywood', 'Culver City', 'Inglewood', 'Torrance', 'Long Beach', 'Anaheim', 'Irvine', 'Huntington Beach', 'Costa Mesa', 'Newport Beach', 'Fullerton', 'Ontario', 'Riverside', 'Rancho Cucamonga', 'Pomona', 'Downey', 'El Monte', 'West Covina', 'Arcadia', 'Monrovia', 'Whittier', 'Cerritos', 'Thousand Oaks', 'Simi Valley', 'Calabasas', 'Encino', 'Sherman Oaks', 'Woodland Hills', 'LA', 'SoCal', 'Orange County'],
  'San Francisco': ['San Francisco', 'San Jose', 'Oakland', 'Berkeley', 'Palo Alto', 'Mountain View', 'Sunnyvale', 'Santa Clara', 'Cupertino', 'Redwood City', 'San Mateo', 'Fremont', 'Hayward', 'Pleasanton', 'Walnut Creek', 'Concord', 'Richmond', 'San Rafael', 'Marin', 'Daly City', 'South San Francisco', 'Menlo Park', 'Los Altos', 'Campbell', 'Milpitas', 'SF', 'Bay Area', 'Silicon Valley'],
  'Phoenix': ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert', 'Glendale', 'Peoria', 'Surprise', 'Goodyear', 'Avondale', 'Buckeye', 'Cave Creek', 'Fountain Hills', 'Paradise Valley', 'Queen Creek', 'Maricopa'],
  'Denver': ['Denver', 'Aurora', 'Lakewood', 'Thornton', 'Arvada', 'Westminster', 'Centennial', 'Boulder', 'Littleton', 'Broomfield', 'Longmont', 'Loveland', 'Fort Collins', 'Greeley', 'Parker', 'Castle Rock', 'Highlands Ranch', 'Golden', 'Englewood', 'Commerce City', 'Brighton', 'Erie', 'Louisville', 'Superior', 'Colorado Springs', 'Front Range'],
  'Seattle': ['Seattle', 'Bellevue', 'Redmond', 'Kirkland', 'Renton', 'Kent', 'Federal Way', 'Tacoma', 'Olympia', 'Everett', 'Bothell', 'Issaquah', 'Sammamish', 'Mercer Island', 'Burien', 'Tukwila', 'Lynnwood', 'Edmonds', 'Shoreline', 'Woodinville', 'Snoqualmie', 'Puget Sound'],
  'Boston': ['Boston', 'Cambridge', 'Somerville', 'Brookline', 'Newton', 'Waltham', 'Quincy', 'Braintree', 'Weymouth', 'Needham', 'Wellesley', 'Lexington', 'Framingham', 'Natick', 'Burlington', 'Woburn', 'Salem', 'Lynn', 'Worcester', 'Lowell', 'Brockton', 'Plymouth', 'New England'],
  'Washington DC': ['Washington', 'Arlington', 'Alexandria', 'Fairfax', 'Reston', 'Tysons', 'McLean', 'Falls Church', 'Vienna', 'Herndon', 'Ashburn', 'Sterling', 'Leesburg', 'Manassas', 'Woodbridge', 'Bethesda', 'Rockville', 'Silver Spring', 'Gaithersburg', 'College Park', 'Laurel', 'Bowie', 'Annapolis', 'DC', 'DMV', 'NoVA', 'National Capital'],
  'Tampa': ['Tampa', 'St. Petersburg', 'Clearwater', 'Brandon', 'Riverview', 'Wesley Chapel', 'Lutz', 'Land O Lakes', 'New Port Richey', 'Palm Harbor', 'Dunedin', 'Largo', 'Pinellas Park', 'Plant City', 'Lakeland', 'Winter Haven', 'Tampa Bay'],
  'Orlando': ['Orlando', 'Kissimmee', 'Sanford', 'Altamonte Springs', 'Winter Park', 'Oviedo', 'Lake Mary', 'Longwood', 'Casselberry', 'Apopka', 'Clermont', 'Ocala', 'Daytona Beach', 'Melbourne', 'Central Florida'],
  'Jacksonville': ['Jacksonville', 'St. Augustine', 'Ponte Vedra', 'Orange Park', 'Fleming Island', 'Fernandina Beach', 'Middleburg', 'Green Cove Springs'],
  'Austin': ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown', 'Pflugerville', 'Kyle', 'Buda', 'Leander', 'Dripping Springs', 'San Marcos', 'New Braunfels', 'Lakeway'],
  'San Antonio': ['San Antonio', 'New Braunfels', 'Schertz', 'Cibolo', 'Boerne', 'Universal City', 'Converse', 'Live Oak', 'Helotes', 'Alamo Heights'],
  'Nashville': ['Nashville', 'Franklin', 'Murfreesboro', 'Hendersonville', 'Brentwood', 'Gallatin', 'Lebanon', 'Clarksville', 'Smyrna', 'Spring Hill', 'Mt. Juliet', 'Nolensville', 'Thompson Station', 'Middle Tennessee'],
  'Charlotte': ['Charlotte', 'Huntersville', 'Cornelius', 'Davidson', 'Mooresville', 'Concord', 'Kannapolis', 'Matthews', 'Mint Hill', 'Indian Trail', 'Monroe', 'Gastonia', 'Rock Hill', 'Fort Mill', 'Lake Norman'],
  'Raleigh': ['Raleigh', 'Durham', 'Chapel Hill', 'Cary', 'Apex', 'Morrisville', 'Holly Springs', 'Wake Forest', 'Garner', 'Fuquay-Varina', 'Knightdale', 'Research Triangle', 'Triangle'],
  'Detroit': ['Detroit', 'Dearborn', 'Livonia', 'Troy', 'Southfield', 'Farmington Hills', 'Novi', 'Ann Arbor', 'Royal Oak', 'Sterling Heights', 'Warren', 'Clinton Township', 'Rochester Hills', 'Auburn Hills', 'Pontiac', 'Plymouth', 'Canton', 'Ypsilanti', 'Metro Detroit'],
  'Minneapolis': ['Minneapolis', 'St. Paul', 'Bloomington', 'Plymouth', 'Eden Prairie', 'Minnetonka', 'Edina', 'Maple Grove', 'Brooklyn Park', 'Burnsville', 'Eagan', 'Woodbury', 'Lakeville', 'Apple Valley', 'St. Louis Park', 'Wayzata', 'Twin Cities'],
  'Philadelphia': ['Philadelphia', 'King of Prussia', 'Conshohocken', 'Wayne', 'Malvern', 'Exton', 'West Chester', 'Media', 'Bryn Mawr', 'Ardmore', 'Lansdale', 'Norristown', 'Doylestown', 'Newtown', 'Cherry Hill', 'Moorestown', 'Mount Laurel', 'Marlton', 'Philly', 'Delaware Valley'],
  'Baltimore': ['Baltimore', 'Towson', 'Columbia', 'Ellicott City', 'Owings Mills', 'Lutherville', 'Timonium', 'Cockeysville', 'Hunt Valley', 'Pikesville', 'Catonsville', 'Dundalk', 'Glen Burnie', 'Bel Air', 'Aberdeen'],
  'Pittsburgh': ['Pittsburgh', 'Cranberry Township', 'Robinson Township', 'Wexford', 'Murrysville', 'Monroeville', 'Bethel Park', 'Upper St. Clair', 'Mt. Lebanon', 'Moon Township', 'Sewickley', 'Butler', 'Greensburg', 'Washington'],
  'St. Louis': ['St. Louis', 'Clayton', 'Creve Coeur', 'Chesterfield', 'Ballwin', 'Town and Country', 'Kirkwood', 'Webster Groves', 'Florissant', 'OFallon', 'St. Charles', 'Wentzville', 'Maryland Heights', 'Edwardsville', 'Belleville'],
  'Cincinnati': ['Cincinnati', 'Mason', 'West Chester', 'Blue Ash', 'Sharonville', 'Loveland', 'Montgomery', 'Kenwood', 'Florence', 'Covington', 'Newport', 'Fort Thomas', 'Hamilton', 'Fairfield', 'Middletown'],
  'Cleveland': ['Cleveland', 'Akron', 'Lakewood', 'Parma', 'Strongsville', 'Westlake', 'Avon', 'Brunswick', 'Medina', 'Elyria', 'Lorain', 'Mentor', 'Solon', 'Independence', 'Beachwood', 'Hudson', 'Cuyahoga Falls'],
  'Columbus': ['Columbus', 'Dublin', 'Westerville', 'Upper Arlington', 'Worthington', 'Grove City', 'Hilliard', 'Gahanna', 'Reynoldsburg', 'Pickerington', 'New Albany', 'Powell', 'Lewis Center', 'Delaware', 'Marysville'],
  'Indianapolis': ['Indianapolis', 'Carmel', 'Fishers', 'Noblesville', 'Zionsville', 'Westfield', 'Greenwood', 'Avon', 'Brownsburg', 'Plainfield', 'Lawrence', 'Indy'],
  'Kansas City': ['Kansas City', 'Overland Park', 'Olathe', 'Lenexa', 'Shawnee', 'Leawood', 'Prairie Village', 'Mission', 'Lee Summit', 'Independence', 'Blue Springs', 'Liberty', 'Gladstone', 'North Kansas City', 'KC'],
  'Portland': ['Portland', 'Beaverton', 'Hillsboro', 'Tigard', 'Lake Oswego', 'Tualatin', 'Gresham', 'Milwaukie', 'Oregon City', 'West Linn', 'Clackamas', 'Wilsonville', 'Sherwood', 'Vancouver'],
  'Salt Lake City': ['Salt Lake City', 'Sandy', 'West Jordan', 'South Jordan', 'Draper', 'Murray', 'Provo', 'Orem', 'Lehi', 'American Fork', 'Pleasant Grove', 'Ogden', 'Layton', 'Bountiful', 'Park City', 'SLC'],
  'Las Vegas': ['Las Vegas', 'Henderson', 'North Las Vegas', 'Summerlin', 'Spring Valley', 'Enterprise', 'Paradise', 'Boulder City'],
  'San Diego': ['San Diego', 'Carlsbad', 'Oceanside', 'Escondido', 'Chula Vista', 'El Cajon', 'Encinitas', 'La Jolla', 'Del Mar', 'Poway', 'Rancho Bernardo', 'Scripps Ranch', 'Coronado'],
}

// Build reverse lookup: suburb → metro
const _reverseMap: Record<string, string> = {}
for (const [metro, suburbs] of Object.entries(METRO_AREAS)) {
  for (const suburb of suburbs) {
    _reverseMap[suburb.toLowerCase()] = metro
  }
}

/**
 * Given a full location string (e.g. "Marietta, Georgia, United States"),
 * returns the metro area name or null
 */
export function detectMetroArea(location: string): string | null {
  if (!location) return null
  const lower = location.toLowerCase()

  // Try exact city match first
  for (const [metro, suburbs] of Object.entries(METRO_AREAS)) {
    for (const suburb of suburbs) {
      if (lower.includes(suburb.toLowerCase())) return metro
    }
  }

  return null
}

/**
 * Given a search term like "Atlanta", returns all city names in that metro
 */
export function getMetroCities(metro: string): string[] {
  // Try direct match
  if (METRO_AREAS[metro]) return METRO_AREAS[metro]

  // Try case-insensitive
  const key = Object.keys(METRO_AREAS).find(k => k.toLowerCase() === metro.toLowerCase())
  if (key) return METRO_AREAS[key]

  return []
}

/**
 * Get all metro area names for dropdown
 */
export function getMetroNames(): string[] {
  return Object.keys(METRO_AREAS).sort()
}
