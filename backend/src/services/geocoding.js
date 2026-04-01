/**
 * City autocomplete via Photon (Komoot) — free, no API key, built for prefix search.
 * Geocoding (single result) via OpenStreetMap Nominatim.
 */

const PHOTON = 'https://photon.komoot.io/api';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const HEADERS = { 'User-Agent': 'AstrocartographyApp/1.0', 'Accept-Language': 'en' };

// Types to include in city suggestions
const CITY_TYPES = new Set(['city', 'town', 'village', 'district', 'county', 'state']);

function fetchWithTimeout(url, options, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  return fetch(url, { ...options, signal: ac.signal }).finally(() => clearTimeout(timer));
}

export async function searchCities(query) {
  const url = `${PHOTON}?q=${encodeURIComponent(query)}&limit=12&lang=en`;
  const res = await fetchWithTimeout(url, { headers: HEADERS }, 5000);
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`);
  const { features } = await res.json();

  const seen = new Set();
  const results = [];
  for (const f of features) {
    const props = f.properties || {};
    // Skip non-city types (houses, streets, POIs etc.)
    if (!CITY_TYPES.has(props.type)) continue;

    const name = props.name || props.city || props.locality;
    if (!name) continue;
    const country = props.country || '';
    const displayName = country ? `${name}, ${country}` : name;
    if (seen.has(displayName)) continue;
    seen.add(displayName);

    const [lng, lat] = f.geometry.coordinates;
    results.push({ lat, lng, displayName });
    if (results.length === 6) break;
  }
  return results;
}

export async function geocode(query) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;

  const res = await fetchWithTimeout(url, { headers: HEADERS }, 5000);

  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`);

  const data = await res.json();
  if (!data.length) return null;

  const place = data[0];
  return {
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    displayName: place.display_name.split(',').slice(0, 3).join(', '),
  };
}
