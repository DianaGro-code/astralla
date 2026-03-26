const BASE = '/api';

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
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login:    (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  },
  charts: {
    list:   ()       => request('/charts'),
    create: (body)   => request('/charts', { method: 'POST', body: JSON.stringify(body) }),
    get:    (id)     => request(`/charts/${id}`),
    delete: (id)     => request(`/charts/${id}`, { method: 'DELETE' }),
  },
  readings: {
    generate:   (body) => request('/readings', { method: 'POST', body: JSON.stringify(body) }),
    forChart:   (chartId) => request(`/readings/chart/${chartId}`),
    all:        () => request('/readings/all'),
    get:        (id)   => request(`/readings/${id}`),
  },
  geocode: {
    search: (q) => request(`/geocode/search?q=${encodeURIComponent(q)}`),
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
  },
  weekly: {
    generate: (body) => request('/weekly', { method: 'POST', body: JSON.stringify(body) }),
  },
};
