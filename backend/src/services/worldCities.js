// ~80 curated world cities for discovery scoring
export const WORLD_CITIES = [
  // Europe
  { name: 'Paris, France',           lat: 48.8566,  lng: 2.3522,   region: 'europe'  },
  { name: 'London, UK',              lat: 51.5074,  lng: -0.1278,  region: 'europe'  },
  { name: 'Rome, Italy',             lat: 41.9028,  lng: 12.4964,  region: 'europe'  },
  { name: 'Barcelona, Spain',        lat: 41.3851,  lng: 2.1734,   region: 'europe'  },
  { name: 'Lisbon, Portugal',        lat: 38.7223,  lng: -9.1393,  region: 'europe'  },
  { name: 'Berlin, Germany',         lat: 52.5200,  lng: 13.4050,  region: 'europe'  },
  { name: 'Amsterdam, Netherlands',  lat: 52.3676,  lng: 4.9041,   region: 'europe'  },
  { name: 'Vienna, Austria',         lat: 48.2082,  lng: 16.3738,  region: 'europe'  },
  { name: 'Prague, Czech Republic',  lat: 50.0755,  lng: 14.4378,  region: 'europe'  },
  { name: 'Budapest, Hungary',       lat: 47.4979,  lng: 19.0402,  region: 'europe'  },
  { name: 'Athens, Greece',          lat: 37.9838,  lng: 23.7275,  region: 'europe'  },
  { name: 'Istanbul, Turkey',        lat: 41.0082,  lng: 28.9784,  region: 'europe'  },
  { name: 'Stockholm, Sweden',       lat: 59.3293,  lng: 18.0686,  region: 'europe'  },
  { name: 'Copenhagen, Denmark',     lat: 55.6761,  lng: 12.5683,  region: 'europe'  },
  { name: 'Dublin, Ireland',         lat: 53.3498,  lng: -6.2603,  region: 'europe'  },
  { name: 'Edinburgh, UK',           lat: 55.9533,  lng: -3.1883,  region: 'europe'  },
  { name: 'Zurich, Switzerland',     lat: 47.3769,  lng: 8.5417,   region: 'europe'  },
  { name: 'Florence, Italy',         lat: 43.7696,  lng: 11.2558,  region: 'europe'  },
  { name: 'Seville, Spain',          lat: 37.3891,  lng: -5.9845,  region: 'europe'  },
  { name: 'Porto, Portugal',         lat: 41.1579,  lng: -8.6291,  region: 'europe'  },
  { name: 'Tbilisi, Georgia',        lat: 41.7151,  lng: 44.8271,  region: 'europe'  },
  { name: 'Reykjavik, Iceland',      lat: 64.1265,  lng: -21.8174, region: 'europe'  },
  { name: 'Warsaw, Poland',          lat: 52.2297,  lng: 21.0122,  region: 'europe'  },
  { name: 'Dubrovnik, Croatia',      lat: 42.6507,  lng: 18.0944,  region: 'europe'  },
  { name: 'Valletta, Malta',         lat: 35.8997,  lng: 14.5147,  region: 'europe'  },

  // Americas
  { name: 'New York, USA',           lat: 40.7128,  lng: -74.0060,  region: 'americas' },
  { name: 'Los Angeles, USA',        lat: 34.0522,  lng: -118.2437, region: 'americas' },
  { name: 'San Francisco, USA',      lat: 37.7749,  lng: -122.4194, region: 'americas' },
  { name: 'Miami, USA',              lat: 25.7617,  lng: -80.1918,  region: 'americas' },
  { name: 'Chicago, USA',            lat: 41.8781,  lng: -87.6298,  region: 'americas' },
  { name: 'New Orleans, USA',        lat: 29.9511,  lng: -90.0715,  region: 'americas' },
  { name: 'Austin, USA',             lat: 30.2672,  lng: -97.7431,  region: 'americas' },
  { name: 'Portland, USA',           lat: 45.5051,  lng: -122.6750, region: 'americas' },
  { name: 'Seattle, USA',            lat: 47.6062,  lng: -122.3321, region: 'americas' },
  { name: 'Nashville, USA',          lat: 36.1627,  lng: -86.7816,  region: 'americas' },
  { name: 'Denver, USA',             lat: 39.7392,  lng: -104.9903, region: 'americas' },
  { name: 'Toronto, Canada',         lat: 43.6532,  lng: -79.3832,  region: 'americas' },
  { name: 'Vancouver, Canada',       lat: 49.2827,  lng: -123.1207, region: 'americas' },
  { name: 'Mexico City, Mexico',     lat: 19.4326,  lng: -99.1332,  region: 'americas' },
  { name: 'Buenos Aires, Argentina', lat: -34.6037, lng: -58.3816,  region: 'americas' },
  { name: 'Rio de Janeiro, Brazil',  lat: -22.9068, lng: -43.1729,  region: 'americas' },
  { name: 'São Paulo, Brazil',       lat: -23.5505, lng: -46.6333,  region: 'americas' },
  { name: 'Bogotá, Colombia',        lat: 4.7110,   lng: -74.0721,  region: 'americas' },
  { name: 'Medellín, Colombia',      lat: 6.2442,   lng: -75.5812,  region: 'americas' },
  { name: 'Lima, Peru',              lat: -12.0464, lng: -77.0428,  region: 'americas' },
  { name: 'Santiago, Chile',         lat: -33.4489, lng: -70.6693,  region: 'americas' },
  { name: 'Havana, Cuba',            lat: 23.1136,  lng: -82.3666,  region: 'americas' },
  { name: 'Oaxaca, Mexico',          lat: 17.0732,  lng: -96.7266,  region: 'americas' },
  { name: 'Cartagena, Colombia',     lat: 10.3910,  lng: -75.4794,  region: 'americas' },

  // Asia
  { name: 'Tokyo, Japan',                 lat: 35.6762,  lng: 139.6503,  region: 'asia' },
  { name: 'Kyoto, Japan',                 lat: 35.0116,  lng: 135.7681,  region: 'asia' },
  { name: 'Seoul, South Korea',           lat: 37.5665,  lng: 126.9780,  region: 'asia' },
  { name: 'Shanghai, China',              lat: 31.2304,  lng: 121.4737,  region: 'asia' },
  { name: 'Hong Kong',                    lat: 22.3193,  lng: 114.1694,  region: 'asia' },
  { name: 'Bangkok, Thailand',            lat: 13.7563,  lng: 100.5018,  region: 'asia' },
  { name: 'Bali, Indonesia',              lat: -8.3405,  lng: 115.0920,  region: 'asia' },
  { name: 'Singapore',                    lat: 1.3521,   lng: 103.8198,  region: 'asia' },
  { name: 'Mumbai, India',                lat: 19.0760,  lng: 72.8777,   region: 'asia' },
  { name: 'Delhi, India',                 lat: 28.6139,  lng: 77.2090,   region: 'asia' },
  { name: 'Chiang Mai, Thailand',         lat: 18.7883,  lng: 98.9853,   region: 'asia' },
  { name: 'Taipei, Taiwan',               lat: 25.0330,  lng: 121.5654,  region: 'asia' },
  { name: 'Ho Chi Minh City, Vietnam',    lat: 10.8231,  lng: 106.6297,  region: 'asia' },
  { name: 'Ubud, Bali, Indonesia',        lat: -8.5069,  lng: 115.2625,  region: 'asia' },
  { name: 'Kathmandu, Nepal',             lat: 27.7172,  lng: 85.3240,   region: 'asia' },
  { name: 'Colombo, Sri Lanka',           lat: 6.9271,   lng: 79.8612,   region: 'asia' },
  { name: 'Hội An, Vietnam',              lat: 15.8801,  lng: 108.3380,  region: 'asia' },
  { name: 'Osaka, Japan',                 lat: 34.6937,  lng: 135.5023,  region: 'asia' },

  // Middle East & Africa
  { name: 'Dubai, UAE',              lat: 25.2048,  lng: 55.2708,  region: 'africa-mideast' },
  { name: 'Tel Aviv, Israel',        lat: 32.0853,  lng: 34.7818,  region: 'africa-mideast' },
  { name: 'Cairo, Egypt',            lat: 30.0444,  lng: 31.2357,  region: 'africa-mideast' },
  { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241,  region: 'africa-mideast' },
  { name: 'Marrakech, Morocco',      lat: 31.6295,  lng: -7.9811,  region: 'africa-mideast' },
  { name: 'Nairobi, Kenya',          lat: -1.2921,  lng: 36.8219,  region: 'africa-mideast' },
  { name: 'Accra, Ghana',            lat: 5.6037,   lng: -0.1870,  region: 'africa-mideast' },
  { name: 'Amman, Jordan',           lat: 31.9539,  lng: 35.9106,  region: 'africa-mideast' },
  { name: 'Zanzibar, Tanzania',      lat: -6.1659,  lng: 39.2026,  region: 'africa-mideast' },

  // Oceania
  { name: 'Sydney, Australia',      lat: -33.8688, lng: 151.2093, region: 'oceania' },
  { name: 'Melbourne, Australia',   lat: -37.8136, lng: 144.9631, region: 'oceania' },
  { name: 'Auckland, New Zealand',  lat: -36.8509, lng: 174.7645, region: 'oceania' },
  { name: 'Byron Bay, Australia',   lat: -28.6474, lng: 153.6020, region: 'oceania' },

  // Pacific
  { name: 'Honolulu, USA',          lat: 21.3069,  lng: -157.8583, region: 'oceania' },
];

// Per-intent planet/angle weights (higher = more relevant for that intent)
const INTENT_WEIGHTS = {
  love: {
    venus:   { DC: 10, AC: 8, IC: 6, MC: 4 },
    moon:    { DC: 8,  IC: 8, AC: 5, MC: 4 },
    jupiter: { DC: 5,  AC: 5, IC: 5, MC: 4 },
    mars:    { DC: 7,  AC: 5, IC: 3, MC: 4 },
    neptune: { DC: 5,  IC: 5, AC: 4, MC: 3 },
  },
  career: {
    sun:     { MC: 10, AC: 8, DC: 4, IC: 3 },
    saturn:  { MC: 9,  AC: 7, DC: 4, IC: 5 },
    jupiter: { MC: 8,  AC: 7, DC: 5, IC: 4 },
    mars:    { MC: 7,  AC: 7, DC: 4, IC: 3 },
  },
  escape: {
    moon:    { IC: 10, AC: 7, DC: 6, MC: 4 },
    neptune: { IC: 9,  AC: 7, DC: 7, MC: 4 },
    venus:   { IC: 7,  AC: 6, DC: 6, MC: 4 },
    jupiter: { IC: 7,  AC: 6, DC: 6, MC: 5 },
  },
  creative: {
    venus:   { IC: 9,  AC: 9, DC: 7, MC: 6 },
    neptune: { AC: 9,  IC: 8, DC: 7, MC: 6 },
    mercury: { AC: 8,  MC: 8, IC: 6, DC: 5 },
    moon:    { AC: 6,  IC: 7, DC: 5, MC: 5 },
  },
  change: {
    pluto:   { AC: 10, MC: 9,  DC: 9, IC: 9 },
    uranus:  { AC: 9,  MC: 8,  DC: 8, IC: 8 },
    saturn:  { AC: 8,  MC: 8,  DC: 6, IC: 7 },
    mars:    { AC: 7,  MC: 7,  DC: 5, IC: 5 },
  },
};

// Map life-chapter strings to existing intent weight keys
const CHAPTER_INTENT_MAP = {
  // Quick / trip-planning uses
  'Planning a trip somewhere new':  'escape',
  'A romantic getaway':             'love',
  'Finishing a big project':        'career',
  'Meeting new people and networking':'love',
  'Getting inspired creatively':    'creative',
  // Life chapters
  'Ready to fall in love':          'love',
  'Starting over after a heartbreak': 'escape',
  'Launching something of my own':  'career',
  'Settling down and putting down roots': 'love',
  'Finding my people and community':'love',
  'Stepping into my power':         'career',
  'A chapter of deep healing':      'escape',
  'Navigating grief or major loss': 'escape',
  'Ready for a complete reinvention':'change',
  // Legacy strings (kept for backwards compat)
  'Getting over a heartbreak':      'escape',
  'Building something that lasts':  'career',
  'Starting completely fresh':      'change',
  'Finding your people':            'love',
  'Creative breakthrough':          'creative',
  'Healing and recovery':           'escape',
  'Craving adventure and real freedom': 'escape',
  'A creative renaissance':         'creative',
};

// Balanced fallback for fully custom text
const GENERIC_WEIGHTS = {
  sun:     { AC: 6, MC: 6, DC: 5, IC: 5 },
  moon:    { IC: 7, AC: 6, DC: 5, MC: 5 },
  venus:   { AC: 6, DC: 6, IC: 5, MC: 5 },
  mars:    { AC: 6, MC: 6, DC: 5, IC: 4 },
  jupiter: { AC: 7, MC: 7, DC: 6, IC: 6 },
  saturn:  { MC: 6, AC: 5, DC: 5, IC: 6 },
  neptune: { AC: 5, IC: 5, DC: 5, MC: 4 },
  pluto:   { AC: 5, MC: 5, DC: 5, IC: 5 },
  uranus:  { AC: 5, MC: 5, DC: 5, IC: 5 },
  mercury: { AC: 5, MC: 5, DC: 4, IC: 4 },
};

const STRENGTH_MULTIPLIER = { exact: 2.0, strong: 1.5, moderate: 1.0, mild: 0.5 };

export function scoreCity(influences, intent) {
  const mappedIntent = CHAPTER_INTENT_MAP[intent] || intent;
  const weights = INTENT_WEIGHTS[mappedIntent] || GENERIC_WEIGHTS;
  let score = 0;
  for (const inf of influences) {
    const planetWeights = weights[inf.planet];
    if (!planetWeights) continue;
    const angleWeight = planetWeights[inf.angle] || 0;
    const strengthMult = STRENGTH_MULTIPLIER[inf.strength] || 0.5;
    score += angleWeight * strengthMult;
  }
  return score;
}
