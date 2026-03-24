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
    get:        (id)   => request(`/readings/${id}`),
  },
  geocode: {
    search: (q) => request(`/geocode/search?q=${encodeURIComponent(q)}`),
  },
};
