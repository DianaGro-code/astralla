// In the browser (Railway), /api is proxied to the backend.
// In the native Capacitor app, we need the full backend URL — set via VITE_API_URL at build time.
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('astro_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth')) {
    localStorage.removeItem('astro_token');
    localStorage.removeItem('astro_user');
    window.location.href = '/auth';
    throw new Error('Session expired. Please sign in again.');
  }
  if (res.status === 402) {
    const err = new Error(data.error || 'Weekly limit reached');
    err.limitReached = true;
    err.used      = data.used;
    err.limit     = data.limit;
    err.resetsOn  = data.resetsOn;
    throw err;
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  },
  charts: {
    list:       ()    => request('/charts'),
    create:     (body)=> request('/charts', { method: 'POST', body: JSON.stringify(body) }),
    get:        (id)  => request(`/charts/${id}`),
    update:     (id, body) => request(`/charts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete:     (id)  => request(`/charts/${id}`, { method: 'DELETE' }),
    lines:      (id)  => request(`/charts/${id}/lines`),
    setPrimary: (id)  => request(`/charts/${id}/primary`, { method: 'PATCH' }),
  },
  readings: {
    generate:   (body) => request('/readings', { method: 'POST', body: JSON.stringify(body) }),
    forChart:   (chartId) => request(`/readings/chart/${chartId}`),
    all:        () => request('/readings/all'),
    get:        (id)   => request(`/readings/${id}`),
  },
  geocode: {
    search: (q) => request(`/geocode/search?q=${encodeURIComponent(q)}`),
    fromIp: ()  => request('/geocode/ip'),
  },
  topCities: {
    find: (body) => request('/top-cities', { method: 'POST', body: JSON.stringify(body) }),
  },
  transits: {
    generate: (body) => request('/transits', { method: 'POST', body: JSON.stringify(body) }),
  },
  solarReturns: {
    generate: (body) => request('/solar-returns', { method: 'POST', body: JSON.stringify(body) }),
  },
  profile: {
    get:         ()     => request('/auth/me'),
    setHomeCity: (body) => request('/auth/home-city', { method: 'PUT', body: JSON.stringify(body) }),
    usage:       ()     => request('/auth/usage'),
  },
  weekly: {
    generate: (body) => request('/weekly', { method: 'POST', body: JSON.stringify(body) }),
  },
  partner: {
    generate: (body) => request('/readings/partner', { method: 'POST', body: JSON.stringify(body) }),
  },
};
