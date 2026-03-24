/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key needed).
 * Rate limit: 1 request/second — adequate for this app.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const HEADERS = { 'User-Agent': 'AstrocartographyApp/1.0', 'Accept-Language': 'en' };

export async function searchCities(query) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`);
  const data = await res.json();

  const seen = new Set();
  const results = [];
  for (const place of data) {
    const addr = place.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || place.display_name.split(',')[0];
    const country = addr.country || '';
    const displayName = country ? `${city}, ${country}` : city;
    if (seen.has(displayName)) continue;
    seen.add(displayName);
    results.push({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), displayName });
    if (results.length === 6) break;
  }
  return results;
}

export async function geocode(query) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;

  const res = await fetch(url, { headers: HEADERS });

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
