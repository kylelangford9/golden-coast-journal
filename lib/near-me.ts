/**
 * News near Me: which of the Journal's stories are set near a reader.
 *
 * A story carries no coordinates, so its places are read from what it says
 * and where it came from. A county newsroom's release is that county; "Walnut
 * Creek", "Orange County", "the Bay Area", "Texas" and "Spain" are places the
 * copy names. The reader's rounded position is matched to the nearest town in
 * the gazetteer (lib/places-data.json, built by scripts/build-places.mjs), and
 * the stories fall into three groups: set near the reader, about their state
 * or country, and, when those are thin, the Journal's closest coverage with
 * its distance. The last group is what makes this work for a reader in Denver
 * or Madrid as well as in Fresno.
 *
 * Separate from the route because it touches neither the database nor the
 * network, so scripts/near-me.test.mjs can exercise the rules themselves.
 */

type CityRow = [
  name: string,
  asciiName: string | 0,
  lat: number,
  lon: number,
  country: string,
  region: string,
  county: string,
  population: number,
];
type CountyRow = [
  state: string,
  fips: string,
  name: string,
  lat: number,
  lon: number,
  landSqMi: number,
];

type Ring = [lon: number, lat: number][];

export type Gazetteer = {
  credit: string;
  countries: Record<string, string>;
  regions: Record<string, string>;
  counties: CountyRow[];
  /** "CA.037": every ring of the county's outline. California only. */
  countyShapes?: Record<string, Ring[]>;
  cities: CityRow[];
  /** California's towns under 15,000 and its neighbourhoods: for reading stories only. */
  localPlaces?: CityRow[];
};

export type Reader = {
  town: string;
  /** "California"; null where the gazetteer has no name for the region. */
  region: string | null;
  /** "US.CA": country and GeoNames region code. */
  regionCode: string;
  country: string;
  countryCode: string;
  /** "CA.037" for Los Angeles County; U.S. readers only. */
  countyKey: string | null;
  lat: number;
  lon: number;
};

export type NearStory = {
  slug: string;
  section: string;
  title: string;
  dek: string;
  body: string[];
  keyPoints?: string[];
  sources: { url: string }[];
  publishedAt: string;
};

export type Place = {
  name: string;
  lat: number;
  lon: number;
  radiusMi: number;
  countyKey?: string;
};

export type StoryGeo = {
  places: Place[];
  /** U.S. states the story is about, as "US.CA". */
  regions: Set<string>;
  /** Countries the story names, as "ES". */
  countries: Set<string>;
};

export type NearHit<S> = {
  story: S;
  where: string;
  miles: number | null;
  /** Where the story is set, for the map; none for a story about a whole state. */
  place: Place | null;
};

export type NearResult<S> = {
  near: NearHit<S>[];
  region: NearHit<S>[];
  closest: NearHit<S>[];
  /** Every story with a place, nearest first: what the map can show as it is moved. */
  located: NearHit<S>[];
};

/** Within this many miles of a place a story names, the story is near. */
export const NEAR_MILES = 50;

/** A place this wide is a region ("Southern California"), not a locality. */
export const BROAD_MILES = 100;

/** Slots kept for the closest coverage when nothing is near. */
const CLOSEST_RESERVED = 3;

const EARTH_MILES = 3958.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function milesBetween(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
) {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The form a place name is compared in: no accents, no case, "St." for Saint. */
export function placeKey(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[‐-―]/g, '-')
    .replace(/\b(?:saint|st)\b\.?/g, 'st.')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Even-odd across every ring, so islands and holes both come out right. */
function insideRings(rings: Ring[], lat: number, lon: number) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Miles from a point to the nearest edge of an outline, on a flat projection
 * around the point: good to well under a mile at the distances that decide
 * whether a story is near.
 */
function milesToRings(rings: Ring[], lat: number, lon: number) {
  const perDegLat = (Math.PI / 180) * EARTH_MILES;
  const perDegLon = perDegLat * Math.cos(toRad(lat));
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i += 1) {
      const ax = (ring[i - 1][0] - lon) * perDegLon;
      const ay = (ring[i - 1][1] - lat) * perDegLat;
      const bx = (ring[i][0] - lon) * perDegLon;
      const by = (ring[i][1] - lat) * perDegLat;
      const dx = bx - ax;
      const dy = by - ay;
      const t =
        dx || dy
          ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)))
          : 0;
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

/** The outlined county a position falls in, as "CA.037", if any. */
function outlinedCountyAt(g: Gazetteer, lat: number, lon: number) {
  for (const [key, rings] of Object.entries(g.countyShapes || {})) {
    if (insideRings(rings, lat, lon)) return key;
  }
  return null;
}

/**
 * The town nearest a position, and the region, county and country it is in.
 * In California the county is read from the county outlines, which are exact
 * where a nearest town can sit across a county line.
 */
export function nearestTown(g: Gazetteer, lat: number, lon: number): Reader {
  const cosLat = Math.cos(toRad(lat));
  let best = g.cities[0];
  let bestScore = Infinity;
  for (const row of g.cities) {
    const dLat = row[2] - lat;
    let dLon = Math.abs(row[3] - lon);
    if (dLon > 180) dLon = 360 - dLon;
    const score = dLat * dLat + (dLon * cosLat) ** 2;
    if (score < bestScore) {
      bestScore = score;
      best = row;
    }
  }
  const [town, , , , townCountry, townRegion, townCounty] = best;
  const outlined = outlinedCountyAt(g, lat, lon);
  const countryCode = outlined ? 'US' : townCountry;
  const regionCode = outlined ? 'US.CA' : `${townCountry}.${townRegion}`;
  return {
    town,
    region: g.regions[regionCode] ?? null,
    regionCode,
    country: g.countries[countryCode] ?? countryCode,
    countryCode,
    countyKey:
      outlined ??
      (townCountry === 'US' && townCounty ? `${townRegion}.${townCounty}` : null),
    lat,
    lon,
  };
}

// Regions of California the copy names more often than any town in them.
const AREAS: [names: string[], label: string, lat: number, lon: number, radiusMi: number][] = [
  [['Bay Area', 'San Francisco Bay Area'], 'the Bay Area', 37.75, -122.25, 40],
  [['Silicon Valley'], 'Silicon Valley', 37.37, -122.03, 18],
  [['Southern California', 'SoCal'], 'Southern California', 34.05, -117.9, 110],
  [['Northern California', 'NorCal'], 'Northern California', 39.2, -121.8, 150],
  [['Central Valley'], 'the Central Valley', 36.9, -120.0, 150],
  [['San Joaquin Valley'], 'the San Joaquin Valley', 36.4, -119.6, 110],
  [['Sacramento Valley'], 'the Sacramento Valley', 39.4, -122.0, 75],
  [['Inland Empire'], 'the Inland Empire', 34.0, -117.3, 40],
  [['Central Coast'], 'the Central Coast', 35.6, -120.9, 85],
  [['Coachella Valley'], 'the Coachella Valley', 33.72, -116.25, 22],
  [['San Fernando Valley'], 'the San Fernando Valley', 34.22, -118.47, 12],
  [['San Gabriel Valley'], 'the San Gabriel Valley', 34.08, -117.98, 13],
  [['Imperial Valley'], 'the Imperial Valley', 32.85, -115.55, 28],
  [['Lake Tahoe', 'Tahoe'], 'Lake Tahoe', 39.09, -120.04, 20],
  [['Yosemite'], 'Yosemite', 37.75, -119.59, 25],
  [['Death Valley'], 'Death Valley', 36.5, -117.1, 45],
  [['Wine Country'], 'Wine Country', 38.4, -122.5, 30],
  // Neighbourhoods of Los Angeles, which the gazetteer files under the city;
  // left to the town list, "Hollywood" would be Hollywood, Florida.
  [['Hollywood'], 'Hollywood', 34.098, -118.327, 4],
  [['Venice Beach'], 'Venice Beach', 33.985, -118.472, 2],
];

// Named places that are not towns, where the Journal's stories are set more
// exactly than any town would say: laboratories, bases, campuses, ports,
// reservoirs, parks. Each is [names, label, lat, lon, radius in miles, and
// the state ("US.TX") or country ("CH") it is in, California if none].
const LANDMARKS: [string[], string, number, number, number, string?][] = [
  [['Jet Propulsion Laboratory', 'JPL'], 'JPL, Pasadena', 34.201, -118.171, 1],
  [['Caltech', 'California Institute of Technology'], 'Caltech, Pasadena', 34.138, -118.125, 1],
  [['Vandenberg Space Force Base', 'Vandenberg'], 'Vandenberg Space Force Base', 34.742, -120.573, 6],
  [['Edwards Air Force Base'], 'Edwards Air Force Base', 34.905, -117.884, 8],
  [['Armstrong Flight Research Center'], 'Armstrong Flight Research Center', 34.955, -117.883, 2],
  [['Ames Research Center', 'NASA Ames'], 'NASA Ames, Mountain View', 37.415, -122.063, 1.5],
  [['Lawrence Livermore National Laboratory', 'Lawrence Livermore'], 'Lawrence Livermore Lab', 37.689, -121.705, 1],
  [['Lawrence Berkeley National Laboratory', 'Berkeley Lab'], 'Berkeley Lab', 37.876, -122.247, 1],
  [['SLAC National Accelerator Laboratory', 'SLAC'], 'SLAC, Menlo Park', 37.419, -122.205, 1],
  [['Stanford University'], 'Stanford University', 37.428, -122.17, 1],
  [['UCLA'], 'UCLA', 34.069, -118.445, 1],
  [['University of Southern California'], 'USC', 34.022, -118.285, 1],
  [['UC Davis'], 'UC Davis', 38.538, -121.762, 1],
  [['UC San Diego', 'UCSD'], 'UC San Diego', 32.88, -117.234, 1],
  [['UC Irvine'], 'UC Irvine', 33.641, -117.844, 1],
  [['UC Santa Cruz'], 'UC Santa Cruz', 36.991, -122.061, 1],
  [['UC Riverside'], 'UC Riverside', 33.974, -117.328, 1],
  [['UC Santa Barbara'], 'UC Santa Barbara', 34.414, -119.849, 1],
  [['UC Merced'], 'UC Merced', 37.366, -120.425, 1],
  [['UCSF'], 'UCSF', 37.763, -122.459, 1],
  [['Port of Los Angeles'], 'Port of Los Angeles', 33.741, -118.278, 2],
  [['Port of Long Beach'], 'Port of Long Beach', 33.754, -118.217, 2],
  [['Port of Oakland'], 'Port of Oakland', 37.796, -122.279, 1.5],
  [['Port of San Diego'], 'Port of San Diego', 32.705, -117.16, 2],
  [['Los Angeles International Airport', 'LAX'], 'LAX', 33.942, -118.409, 1.5],
  [['San Francisco International Airport', 'SFO'], 'SFO', 37.621, -122.379, 1.5],
  [['Golden Gate Bridge'], 'Golden Gate Bridge', 37.82, -122.478, 1],
  [['State Capitol', 'California State Capitol'], 'State Capitol, Sacramento', 38.577, -121.493, 0.5],
  [['Exposition Park'], 'Exposition Park', 34.017, -118.289, 0.6],
  [['Los Angeles Memorial Coliseum'], 'L.A. Memorial Coliseum', 34.014, -118.288, 0.4],
  [['Rose Bowl'], 'Rose Bowl, Pasadena', 34.161, -118.168, 0.5],
  [['SoFi Stadium'], 'SoFi Stadium, Inglewood', 33.954, -118.339, 0.5],
  [['Dodger Stadium'], 'Dodger Stadium', 34.074, -118.24, 0.5],
  [['Diablo Canyon'], 'Diablo Canyon', 35.212, -120.854, 2],
  [['Mount Diablo'], 'Mount Diablo', 37.882, -121.914, 3],
  [['Lake Oroville', 'Oroville Dam'], 'Lake Oroville', 39.56, -121.45, 6],
  [['Sites Reservoir'], 'Sites Reservoir, Colusa County', 39.31, -122.34, 5],
  [['Shasta Dam', 'Shasta Lake', 'Lake Shasta'], 'Shasta Lake', 40.8, -122.3, 8],
  [['Folsom Lake'], 'Folsom Lake', 38.72, -121.13, 5],
  [['San Luis Reservoir'], 'San Luis Reservoir', 37.06, -121.12, 5],
  [['Salton Sea'], 'the Salton Sea', 33.33, -115.84, 15],
  [['Mono Lake'], 'Mono Lake', 38.017, -119.017, 6],
  [['Sacramento-San Joaquin Delta', 'Sacramento–San Joaquin Delta', 'Bay-Delta'], 'the Delta', 38.05, -121.6, 25],
  [['Big Sur'], 'Big Sur', 36.27, -121.81, 20],
  [['Point Reyes'], 'Point Reyes', 38.07, -122.81, 10],
  [['Catalina Island', 'Santa Catalina Island'], 'Catalina Island', 33.388, -118.416, 10],
  [['Channel Islands'], 'the Channel Islands', 34.0, -119.8, 30],
  [['Joshua Tree National Park'], 'Joshua Tree National Park', 33.873, -115.901, 25],
  [['Sequoia National Park'], 'Sequoia National Park', 36.486, -118.566, 20],
  [['Redwood National Park'], 'Redwood National Park', 41.213, -124.005, 20],
  [['Lassen Volcanic National Park'], 'Lassen Volcanic National Park', 40.498, -121.421, 12],
  [['Kennedy Space Center'], 'Kennedy Space Center', 28.573, -80.649, 4, 'US.FL'],
  [['Cape Canaveral'], 'Cape Canaveral', 28.392, -80.608, 5, 'US.FL'],
  [['Johnson Space Center'], 'Johnson Space Center, Houston', 29.559, -95.09, 2, 'US.TX'],
  [['Goddard Space Flight Center'], 'Goddard, Greenbelt', 38.992, -76.853, 2, 'US.MD'],
  [['Marshall Space Flight Center'], 'Marshall, Huntsville', 34.633, -86.665, 3, 'US.AL'],
  [['Langley Research Center'], 'NASA Langley, Hampton', 37.086, -76.38, 2, 'US.VA'],
  [['Glenn Research Center'], 'NASA Glenn, Cleveland', 41.43, -81.862, 2, 'US.OH'],
  [['Stennis Space Center'], 'Stennis Space Center', 30.363, -89.6, 4, 'US.MS'],
  [['White Sands'], 'White Sands', 32.38, -106.48, 20, 'US.NM'],
  [['White House'], 'the White House', 38.898, -77.037, 0.3, 'US.DC'],
  [['Capitol Hill'], 'Capitol Hill', 38.89, -77.009, 0.6, 'US.DC'],
  [['Pentagon'], 'the Pentagon', 38.872, -77.056, 0.5, 'US.VA'],
  [['United Nations Headquarters', 'UN Headquarters'], 'UN Headquarters, New York', 40.749, -73.968, 0.3, 'US.NY'],
  [['Palais des Nations'], 'Palais des Nations, Geneva', 46.227, 6.141, 0.5, 'CH'],
];

// California small towns whose names are, in copy, far more often a word, a
// name or a better-known place elsewhere (London, Delhi, Mecca), so they are
// left out of the reading. The larger places of the same names are not.
const LOCAL_NOT_A_PLACE = new Set(
  [
    'alamo', 'alpine', 'anderson', 'august', 'avalon', 'bishop', 'boron', 'buckhorn',
    'buena vista', 'byron', 'camino', 'campo', 'chester', 'chinatown', 'citrus', 'clay',
    'clayton', 'cobb', 'colfax', 'columbia', 'commerce', 'cool', 'corning', 'cottonwood',
    'country club', 'crest', 'cutler', 'deer park', 'delhi', 'diablo', 'durham', 'easton',
    'eldridge', 'elkhorn', 'empire', 'exeter', 'fairfax', 'fairview', 'fowler', 'freedom',
    'garnet', 'georgetown', 'gonzales', 'goshen', 'greenfield', 'greenville', 'guadalupe',
    'hartley', 'heber', 'herald', 'homeland', 'huron', 'interlaken', 'inverness', 'ivanhoe',
    'jackson', 'jamestown', 'janesville', 'julian', 'kennedy', 'kensington', 'keyes',
    'laguna', 'lakeview', 'lewiston', 'lincoln village', 'linden', 'lindsay', 'livingston',
    'london', 'loyola', 'lucerne', 'maricopa', 'matheny', 'maxwell', 'mcfarland',
    'meadowbrook', 'mecca', 'middletown', 'mojave', 'montague', 'morada', 'needles',
    'newcastle', 'newman', 'nice', 'northwood', 'nuevo', 'oasis', 'occidental', 'pacheco',
    'palermo', 'parkside', 'parkway', 'parkwood', 'phelan', 'pioneer', 'quincy', 'rainbow',
    'riverdale', 'rodeo', 'rosedale', 'roseland', 'ross', 'salida', 'seeley', 'shackelford',
    'shasta', 'sheridan', 'somerset', 'stratford', 'strawberry', 'summerland', 'sunnyside',
    'sutter', 'taft', 'thermal', 'thornton', 'venice', 'waterford', 'weed', 'williams',
    'willows', 'wilton', 'winchester', 'winters', 'woodbridge', 'woodville',
  ].map(placeKey),
);

// Names the gazetteer lists as places that stories use far more often as
// something else: a surname or first name (Davis, Carson, Tracy), a word
// (Mission, Industry, Surprise), a body in space (Ceres, for a NASA desk), or
// a province (Ontario). A reader there still finds the story through the
// county, state or country it names.
const NOT_A_PLACE = new Set(
  [
    'allen', 'arlington', 'atwater', 'augusta', 'aurora', 'austin', 'banning',
    'bell', 'bend', 'boulder', 'bryan', 'buckeye', 'campbell', 'carmel', 'carson',
    'cary', 'centennial', 'ceres', 'chandler', 'charlotte', 'chesapeake', 'clifton',
    'clinton', 'colton', 'columbia', 'commerce', 'compton', 'cypress', 'davenport', 'davie',
    'davis', 'denton', 'duarte', 'edison', 'edmond', 'elgin', 'elizabeth', 'enterprise',
    'erie', 'eugene', 'everett', 'florence', 'franklin', 'frisco', 'garland',
    'georgetown', 'gilbert', 'goodyear', 'hamilton', 'hampton', 'henderson',
    'highland', 'imperial', 'independence', 'industry', 'irving', 'jackson', 'jersey',
    'katy', 'kent', 'lafayette', 'lawrence', 'lawton', 'layton', 'lincoln',
    'livingston', 'lowell', 'lynn', 'madison', 'male', 'marina', 'marion', 'martinez',
    'mckinney', 'meridian', 'mesa', 'mesquite', 'midland', 'miramar', 'mission',
    'mobile', 'montgomery', 'nice', 'norman', 'oakley', 'ontario', 'paradise',
    'paramount', 'plantation', 'quincy', 'ramona', 'reading', 'reunion', 'richardson',
    'sandy', 'sanger', 'savannah', 'seaside', 'selma', 'sofia', 'sparks', 'split',
    'spring', 'stanton', 'sunrise', 'surprise', 'temple', 'thornton', 'tracy',
    'troy', 'tyler', 'venice', 'victoria', 'vista', 'walnut', 'warren', 'westminster',
  ].map(placeKey),
);

const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'US',
  'U.S.': 'US',
  'USA': 'US',
  'Britain': 'GB',
  'Great Britain': 'GB',
  'U.K.': 'GB',
  'UK': 'GB',
  'England': 'GB',
  'Scotland': 'GB',
  'Wales': 'GB',
  'Northern Ireland': 'GB',
  'Korea': 'KR',
  'Republic of Korea': 'KR',
  'Czech Republic': 'CZ',
  'Turkey': 'TR',
  'Türkiye': 'TR',
  "Côte d'Ivoire": 'CI',
  'Democratic Republic of the Congo': 'CD',
  'DRC': 'CD',
  'Republic of the Congo': 'CG',
  'Gaza': 'PS',
  'West Bank': 'PS',
  'Palestine': 'PS',
  'Vatican': 'VA',
  'Holy See': 'VA',
  'Burma': 'MM',
  'Cape Verde': 'CV',
  'Swaziland': 'SZ',
  'East Timor': 'TL',
  'Timor-Leste': 'TL',
  'Macedonia': 'MK',
};

// Short forms the copy uses for a town: "New York" is the city unless the
// copy says "New York State", which the state entry already covers.
const TOWN_ALIASES: [alias: string, name: string, country: string, region: string][] = [
  ['New York', 'New York City', 'US', 'NY'],
  ['NYC', 'New York City', 'US', 'NY'],
  ['L.A.', 'Los Angeles', 'US', 'CA'],
  ['D.C.', 'Washington', 'US', 'DC'],
];

// The words a multi-word place name may carry in lower case.
const CONNECTORS = new Set([
  'of', 'and', 'the', 'de', 'del', 'la', 'las', 'los', 'el', 'da', 'do', 'dos',
  'das', 'di', 'du', 'des', 'y', 'upon', 'on', 'au', 'aux', "d'",
]);

// A capitalised word before a one-word town that still leaves it a town:
// "Lake Oroville", "North Sacramento", "UC Berkeley", "In Fresno". Any other
// capitalised word there is a first name or a title ("Alexander Giza",
// "Councilmember Houston", "Supervisor Washington"), and the town's name is
// a surname throughout that story.
const STILL_A_TOWN_AFTER = new Set(
  [
    'lake', 'port', 'fort', 'ft.', 'mount', 'mt.', 'st.', 'north', 'south', 'east',
    'west', 'northern', 'southern', 'eastern', 'western', 'central', 'greater',
    'downtown', 'upper', 'lower', 'old', 'uc', 'csu', 'cal', 'poly', 'state', 'metro',
    'metropolitan', 'city', 'county', 'northeast', 'northwest', 'southeast',
    'southwest', 'coastal', 'inland', 'rural', 'suburban', 'urban', 'the', 'in', 'at',
    'from', 'to', 'for', 'near', 'across', 'outside', 'inside', 'around',
    'throughout', 'through', 'of', 'and', 'but', 'or', 'like', 'via', 'with',
    'without', 'by', 'on', 'over', 'under', 'between', 'beyond', 'after', 'before',
    'since', 'where', 'while', 'when', 'as', 'its', 'his', 'her', 'their', 'our',
    'this', 'that', 'these', 'those', 'both', 'all', 'each', 'every', 'many', 'most',
    'some', 'if', 'then', 'so', 'also', 'meanwhile', 'today', 'about', 'during',
    'against', 'toward', 'towards', 'into', 'within', 'until', 'including', 'a', 'an',
    'visit', 'residents', 'officials', 'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday',
  ].map(placeKey),
);

// A state named as part of an institution is not where the story is set:
// "South Dakota State University", "Virginia Tech".
const INSTITUTION_AFTER = new Set(['state', 'university', 'tech', 'college']);

// A place named as part of a treaty or a meeting's title is not where the
// story is set: "the Durban Declaration", "the Paris Agreement".
const TITLE_AFTER = new Set([
  'declaration', 'agreement', 'agreements', 'accord', 'accords', 'protocol',
  'convention', 'conventions', 'treaty', 'principles', 'framework', 'consensus',
  'process', 'syndrome',
]);

const NAME = "[A-Z][\\p{L}'’.-]*(?: [A-Z][\\p{L}'’.-]*)*";
const COUNTY_LIST = new RegExp(
  `(${NAME}(?:(?:, (?:and |or )?| (?:and|or) )${NAME})+) counties\\b`,
  'gu',
);

// A story that names more states than this is national, and news for none
// of them in particular: a list of where a federal program applies.
const MAX_STATES = 6;

type Entry =
  | { kind: 'town'; row: CityRow; local?: boolean }
  | { kind: 'county'; row: CountyRow }
  | { kind: 'area'; place: Place; region: string }
  | { kind: 'region'; code: string }
  | { kind: 'country'; code: string };

type Index = {
  byKey: Map<string, Entry[]>;
  maxWords: number;
  counties: Map<string, CountyRow>;
};

const indexes = new WeakMap<Gazetteer, Index>();

/**
 * Which towns a story can name. Every Californian town in the gazetteer, the
 * rest of the country's of 100,000 people or more, and the world's of
 * 250,000 or more: smaller places elsewhere are rarely what a California
 * paper means, and their names are the ones most often something else.
 */
function townIsNameable(row: CityRow) {
  const [, , , , country, region, , population] = row;
  if (country === 'US') return region === 'CA' || population >= 100_000;
  return population >= 250_000;
}

function buildIndex(g: Gazetteer): Index {
  const byKey = new Map<string, Entry[]>();
  const add = (name: string, entry: Entry) => {
    const key = placeKey(name);
    if (!key) return;
    const list = byKey.get(key);
    if (list) list.push(entry);
    else byKey.set(key, [entry]);
  };

  for (const row of g.cities) {
    if (!townIsNameable(row)) continue;
    for (const name of new Set([row[0], row[1] || row[0]])) {
      if (!NOT_A_PLACE.has(placeKey(name))) add(name, { kind: 'town', row });
    }
  }
  const counties = new Map<string, CountyRow>();
  for (const row of g.counties) {
    add(row[2], { kind: 'county', row });
    counties.set(`${row[0]}.${row[1]}`, row);
  }
  for (const [code, name] of Object.entries(g.regions)) {
    if (code.startsWith('US.')) add(name, { kind: 'region', code });
  }
  for (const [code, name] of Object.entries(g.countries)) {
    if (!NOT_A_PLACE.has(placeKey(name))) add(name, { kind: 'country', code });
  }
  for (const [name, code] of Object.entries(COUNTRY_ALIASES)) {
    add(name, { kind: 'country', code });
  }
  for (const row of g.localPlaces || []) {
    for (const name of new Set([row[0], row[1] || row[0]])) {
      const key = placeKey(name);
      if (!NOT_A_PLACE.has(key) && !LOCAL_NOT_A_PLACE.has(key)) add(name, { kind: 'town', row, local: true });
    }
  }
  const named: [string[], string, number, number, number, string?][] = [...AREAS, ...LANDMARKS];
  for (const [names, label, lat, lon, radiusMi, region = 'US.CA'] of named) {
    for (const name of names) {
      add(name, { kind: 'area', place: { name: label, lat, lon, radiusMi }, region });
    }
  }
  for (const [alias, name, country, region] of TOWN_ALIASES) {
    const row = g.cities.find(
      (city) => city[0] === name && city[4] === country && city[5] === region,
    );
    if (row) add(alias, { kind: 'town', row });
  }

  let maxWords = 1;
  for (const key of byKey.keys()) {
    maxWords = Math.max(maxWords, key.split(' ').length);
  }
  return { byKey, maxWords: Math.min(maxWords, 6), counties };
}

function indexFor(g: Gazetteer) {
  let index = indexes.get(g);
  if (!index) {
    index = buildIndex(g);
    indexes.set(g, index);
  }
  return index;
}

type Token = { key: string; upper: boolean; joined: boolean };

/**
 * The words of a text, each marked with whether it follows the one before
 * with nothing but a space between: "Walnut Creek" is one name, "Walnut,
 * Creek" is not, and a place never runs across the end of a sentence.
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let sentenceEnded = false;
  for (const match of text.matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’.-]*/gu)) {
    const gap = text.slice(last, match.index);
    last = match.index + match[0].length;
    let word = match[0].replace(/['’]s$/u, '').replace(/['’-]+$/u, '');
    const abbreviation =
      /^(?:\p{L}\.)+$/u.test(word) || /^(?:st|ft|mt)\.$/i.test(word);
    const endsSentence = word.endsWith('.') && !abbreviation;
    if (endsSentence) word = word.replace(/\.+$/, '');
    tokens.push({
      key: placeKey(word),
      upper: /^\p{Lu}/u.test(word),
      joined: tokens.length > 0 && !sentenceEnded && !/\S/u.test(gap),
    });
    sentenceEnded = endsSentence;
  }
  return tokens;
}

type Hit = {
  key: string;
  entries: Entry[];
  words: number;
  /** The word before, if nothing but a space separates them. */
  prev?: Token;
  /** The word after, if nothing but a space separates them. */
  next?: Token;
  /** The two words before, joined or not: "state of" for "state of Washington". */
  before: string;
};

function findNames(text: string, index: Index): Hit[] {
  const tokens = tokenize(text);
  const hits: Hit[] = [];
  const phrase = (from: number, length: number) => {
    for (let j = from + 1; j < from + length; j += 1) {
      const token = tokens[j];
      if (!token.joined || (!token.upper && !CONNECTORS.has(token.key))) {
        return null;
      }
    }
    if (!tokens[from + length - 1].upper) return null;
    return tokens
      .slice(from, from + length)
      .map((token) => token.key)
      .join(' ');
  };
  const hit = (key: string, entries: Entry[], from: number, words: number, start = from): Hit => {
    const after = tokens[from + words];
    return {
      key,
      entries,
      words,
      prev: tokens[start].joined ? tokens[start - 1] : undefined,
      next: after?.joined ? after : undefined,
      before: tokens
        .slice(Math.max(0, start - 2), start)
        .map((token) => token.key)
        .join(' '),
    };
  };

  for (let i = 0; i < tokens.length; i += 1) {
    if (!tokens[i].upper) continue;
    // "the County of Riverside", as the county newsrooms style themselves.
    if (
      tokens[i].key === 'county' &&
      tokens[i + 1]?.key === 'of' &&
      tokens[i + 1].joined &&
      tokens[i + 2]?.joined
    ) {
      let matched = false;
      for (let n = Math.min(index.maxWords, tokens.length - i - 2); n >= 1; n -= 1) {
        const name = phrase(i + 2, n);
        const key = name && `${name} county`;
        const entries = key && index.byKey.get(key);
        if (key && entries) {
          hits.push(hit(key, entries, i + 2, n, i));
          i += n + 1;
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }
    for (let n = Math.min(index.maxWords, tokens.length - i); n >= 1; n -= 1) {
      const name = phrase(i, n);
      const entries = name && index.byKey.get(name);
      if (name && entries) {
        hits.push(hit(name, entries, i, n));
        i += n - 1;
        break;
      }
    }
  }
  return hits;
}

/** "Alexander Giza", "Councilmember Houston": a name, not a town. */
function isSurname(hit: Hit) {
  return (
    hit.words === 1 &&
    !!hit.prev?.upper &&
    !STILL_A_TOWN_AFTER.has(hit.prev.key)
  );
}

function townPlace(row: CityRow): Place {
  const [name, , lat, lon, , , , population] = row;
  return {
    name,
    lat,
    lon,
    radiusMi: Math.min(15, Math.max(1, Math.sqrt(population) / 150)),
  };
}

function countyPlace(row: CountyRow): Place {
  const [state, fips, name, lat, lon, landSqMi] = row;
  return {
    name,
    lat,
    lon,
    radiusMi: 0.9 * Math.sqrt(landSqMi / Math.PI),
    countyKey: `${state}.${fips}`,
  };
}

// Newsrooms whose releases are about one place. A state agency's are about
// the state; the White House's, NASA's and the UN's belong to no one place.
const SOURCE_COUNTIES: [RegExp, string][] = [
  [/(^|\.)lacounty\.gov$/, 'CA.037'],
  [/(^|\.)(countynewscenter\.com|sandiegocounty\.gov)$/, 'CA.073'],
  [/(^|\.)ocgov\.com$/, 'CA.059'],
  [/(^|\.)rivco\.org$/, 'CA.065'],
  [/(^|\.)sbcounty\.gov$/, 'CA.071'],
  [/(^|\.)contracosta\.ca\.gov$/, 'CA.013'],
];
const SOURCE_TOWNS: [RegExp, string][] = [[/(^|\.)ladwp(news)?\.com$/, 'los angeles']];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const largest = <T>(rows: T[], population: (row: T) => number) =>
  rows.reduce((best, row) => (population(row) > population(best) ? row : best));

/** The places a story is set in, and the states and countries it is about. */
export function storyGeo(g: Gazetteer, story: NearStory): StoryGeo {
  const index = indexFor(g);
  const places: Place[] = [];
  const regions = new Set<string>();
  const countries = new Set<string>();

  let californian = story.section === 'California';
  for (const source of story.sources) {
    const host = hostOf(source.url);
    if (!host) continue;
    const county = SOURCE_COUNTIES.find(([pattern]) => pattern.test(host));
    const town = SOURCE_TOWNS.find(([pattern]) => pattern.test(host));
    if (county) {
      const row = index.counties.get(county[1]);
      if (row) places.push(countyPlace(row));
    } else if (town) {
      const row = index.byKey
        .get(town[1])
        ?.find(
          (entry): entry is { kind: 'town'; row: CityRow } =>
            entry.kind === 'town' && entry.row[5] === 'CA',
        )?.row;
      if (row) places.push(townPlace(row));
    }
    if (county || town || host.endsWith('.ca.gov')) {
      regions.add('US.CA');
      californian = true;
    }
  }

  // A headline is in title case, where every word is capitalised, so only the
  // copy beneath it can say that a name is a surname.
  const copy = findNames(
    [story.dek, ...story.body, ...(story.keyPoints || [])].join('\n'),
    index,
  );
  const hits = [...findNames(story.title, index), ...copy].filter(
    (hit) => !(hit.next && TITLE_AFTER.has(hit.next.key)),
  );
  const surnames = new Set(copy.filter(isSurname).map((hit) => hit.key));

  // States and countries first, because they settle which Pasadena or
  // Orange County the story means.
  const namedStates = new Set<string>();
  for (const hit of hits) {
    const kinds = new Set(hit.entries.map((entry) => entry.kind));
    for (const entry of hit.entries) {
      if (entry.kind === 'region') {
        if (entry.code === 'US.WA') {
          if (isWashingtonState(hit)) namedStates.add(entry.code);
          continue;
        }
        if (entry.code === 'US.GA' && kinds.has('country') && story.section === 'World') continue;
        if (hit.next && INSTITUTION_AFTER.has(hit.next.key)) continue;
        if (/\buniversity of$/.test(hit.before)) continue;
        namedStates.add(entry.code);
      } else if (entry.kind === 'country') {
        if (entry.code === 'GE' && kinds.has('region') && story.section !== 'World') continue;
        countries.add(entry.code);
      }
    }
  }
  if (namedStates.size <= MAX_STATES) {
    for (const code of namedStates) regions.add(code);
  }
  if (regions.has('US.CA') || namedStates.has('US.CA')) californian = true;

  for (const hit of hits) {
    if (hit.entries.some((entry) => entry.kind === 'region')) {
      // "Washington" is the capital and "New York" the city, unless the copy
      // says it is the state.
      if (isWashingtonState(hit) || hit.next?.key === 'state') continue;
    }
    const area = hit.entries.find((entry) => entry.kind === 'area');
    if (area) {
      places.push(area.place);
      if (area.region.startsWith('US.')) regions.add(area.region);
      else countries.add(area.region);
      continue;
    }
    const counties = hit.entries.flatMap((entry) =>
      entry.kind === 'county' ? [entry.row] : [],
    );
    if (counties.length) {
      const row =
        counties.find((row) => regions.has(`US.${row[0]}`)) ||
        counties.find((row) => row[0] === 'CA') ||
        (counties.length === 1 ? counties[0] : null);
      if (row) {
        places.push(countyPlace(row));
        regions.add(`US.${row[0]}`);
      }
      continue;
    }
    // California's small towns and neighbourhoods count only in a story about
    // California: NASA's photograph of the Sierra Madre Oriental is not news
    // from Sierra Madre, a town of 11,000 in the San Gabriel Valley.
    const towns = hit.entries.flatMap((entry) =>
      entry.kind === 'town' && (!entry.local || californian) ? [entry.row] : [],
    );
    if (!towns.length || surnames.has(hit.key)) continue;
    const inNamedRegion = towns.filter(
      (row) => row[4] === 'US' && regions.has(`US.${row[5]}`),
    );
    const inCalifornia = californian
      ? towns.filter((row) => row[4] === 'US' && row[5] === 'CA')
      : [];
    const inNamedCountry = towns.filter((row) => countries.has(row[4]));
    const pool = inNamedRegion.length
      ? inNamedRegion
      : inCalifornia.length
        ? inCalifornia
        : inNamedCountry.length
          ? inNamedCountry
          : towns;
    const row = largest(pool, (row) => row[7]);
    places.push(townPlace(row));
    countries.add(row[4]);
    if (row[4] === 'US') regions.add(`US.${row[5]}`);
  }
  // A list of counties named once for all of them: "deployments to Plumas,
  // Tehama, Sierra and Lake counties". Cal OES writes its releases this way,
  // and each county is a place the story is set.
  const copyText = [story.dek, ...story.body, ...(story.keyPoints || [])].join('\n');
  for (const match of copyText.matchAll(COUNTY_LIST)) {
    for (const name of match[1].split(/, (?:and |or )?| (?:and|or) /)) {
      const rows = (index.byKey.get(`${placeKey(name)} county`) || []).flatMap((entry) =>
        entry.kind === 'county' ? [entry.row] : [],
      );
      const row =
        rows.find((row) => regions.has(`US.${row[0]}`)) ||
        rows.find((row) => row[0] === 'CA') ||
        (rows.length === 1 ? rows[0] : null);
      if (row) {
        places.push(countyPlace(row));
        regions.add(`US.${row[0]}`);
      }
    }
  }

  if (regions.size) countries.add('US');
  const seen = new Set<string>();
  return {
    places: places.filter((place) => {
      const key = `${place.name}|${place.lat}|${place.lon}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    regions,
    countries,
  };
}

function isWashingtonState(hit: Hit) {
  return hit.next?.key === 'state' || /\bstate of$/.test(hit.before);
}

/**
 * How far a reader is from a place: nothing if they are inside it. An
 * outlined county is measured to its edge; anything else, or a county too far
 * off for its shape to matter, from its centre less its rough radius.
 */
function milesFrom(g: Gazetteer, reader: Reader, place: Place) {
  if (place.countyKey && place.countyKey === reader.countyKey) return 0;
  const fromCentre = Math.max(
    0,
    milesBetween(reader.lat, reader.lon, place.lat, place.lon) - place.radiusMi,
  );
  const rings = place.countyKey ? g.countyShapes?.[place.countyKey] : undefined;
  if (!rings || fromCentre > 4 * NEAR_MILES) return fromCentre;
  return insideRings(rings, reader.lat, reader.lon)
    ? 0
    : milesToRings(rings, reader.lat, reader.lon);
}

const MILE_COUNTRIES = new Set(['US', 'GB', 'LR', 'MM', 'PR', 'GU', 'VI', 'AS', 'MP']);

export function distanceLabel(miles: number, countryCode: string) {
  if (MILE_COUNTRIES.has(countryCode)) return `${Math.round(miles)} mi`;
  return `${Math.round(miles * 1.609344)} km`;
}

const geoCache = new Map<string, StoryGeo>();

function cachedGeo(g: Gazetteer, story: NearStory) {
  const key = `${story.slug}|${story.publishedAt}|${story.title}|${story.body.length}`;
  let geo = geoCache.get(key);
  if (!geo) {
    geo = storyGeo(g, story);
    if (geoCache.size > 2000) geoCache.clear();
    geoCache.set(key, geo);
  }
  return geo;
}

/**
 * The stories near a reader, newest first; then those about their state (or,
 * outside the U.S., their country); then, if that is still fewer than
 * `minimum`, the Journal's closest coverage, nearest first. No story appears
 * twice, and the three together hold at most `limit`.
 */
export function storiesNear<S extends NearStory>(
  g: Gazetteer,
  reader: Reader,
  stories: S[],
  { limit = 8, minimum = 6 }: { limit?: number; minimum?: number } = {},
): NearResult<S> {
  const newest = [...stories].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  // A story is placed at the most exact of its places near the reader: a
  // story that names Contra Costa County and Walnut Creek is pinned at Walnut
  // Creek, so stories spread across the map instead of piling on county
  // centres. With nothing near, it is placed at its nearest place.
  const scored = newest.map((story) => {
    const geo = cachedGeo(g, story);
    const measured = geo.places.map((candidate) => ({
      candidate,
      distance: milesFrom(g, reader, candidate),
    }));
    const nearby = measured.filter((item) => item.distance <= NEAR_MILES);
    const pool = nearby.length ? nearby : measured;
    pool.sort(
      (a, b) =>
        (nearby.length ? a.candidate.radiusMi - b.candidate.radiusMi : 0) ||
        a.distance - b.distance,
    );
    const best = pool[0];
    return {
      story,
      geo,
      place: best?.candidate ?? null,
      miles: best?.distance ?? Infinity,
    };
  });

  const used = new Set<string>();
  const take = (hit: NearHit<S>) => {
    used.add(hit.story.slug);
    return hit;
  };

  // A story set in the reader's county or town comes before one that only
  // names the broad region around it ("Southern California"); the sort is
  // stable, so each keeps newest first.
  const near = scored
    .filter((item) => item.place && item.miles <= NEAR_MILES)
    .sort(
      (a, b) =>
        Number(a.place!.radiusMi >= BROAD_MILES) - Number(b.place!.radiusMi >= BROAD_MILES),
    )
    .slice(0, limit)
    .map((item) =>
      take({
        story: item.story,
        where:
          item.miles >= 1
            ? `${item.place!.name} · ${distanceLabel(item.miles, reader.countryCode)}`
            : item.place!.name,
        miles: item.miles,
        place: item.place,
      }),
    );

  // With nothing near, the closest coverage keeps a few places even when the
  // state's stories could fill the list, so a reader in Fresno is shown where
  // the nearest reporting is and not only that it is somewhere in California.
  const placed = scored.filter((item) => item.place && !used.has(item.story.slug)).length;
  const reserve = near.length ? 0 : Math.min(CLOSEST_RESERVED, placed);

  const inUS = reader.countryCode === 'US';
  const regionName = inUS ? reader.region || reader.country : reader.country;
  const region = scored
    .filter(
      (item) =>
        !used.has(item.story.slug) &&
        (inUS
          ? item.geo.regions.has(reader.regionCode)
          : item.geo.countries.has(reader.countryCode)),
    )
    .slice(0, Math.max(0, limit - near.length - reserve))
    .map((item) => take({ story: item.story, where: regionName, miles: null, place: null }));

  const room = Math.max(reserve, Math.min(minimum, limit) - near.length - region.length);
  const closest =
    room > 0
      ? scored
          .filter((item) => item.place && !used.has(item.story.slug))
          .sort((a, b) => a.miles - b.miles)
          .slice(0, room)
          .map((item) =>
            take({
              story: item.story,
              where: `${item.place!.name} · ${distanceLabel(item.miles, reader.countryCode)}`,
              miles: item.miles,
              place: item.place,
            }),
          )
      : [];

  const located = scored
    .filter((item) => item.place)
    .sort((a, b) => a.miles - b.miles)
    .map((item) => ({
      story: item.story,
      where:
        item.miles >= 1
          ? `${item.place!.name} · ${distanceLabel(item.miles, reader.countryCode)}`
          : item.place!.name,
      miles: item.miles,
      place: item.place,
    }));

  return { near, region, closest, located };
}
