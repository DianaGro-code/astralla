import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/admin/stats`, {
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) { setError('Wrong password'); setLoading(false); return; }
      setData(await res.json());
    } catch {
      setError('Could not connect to server');
    }
    setLoading(false);
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-gold text-center">Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:border-gold"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-navy font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gold">Astralla Admin</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: data.totalUsers },
          { label: 'Charts Created', value: data.totalCharts },
          { label: 'Readings Generated', value: data.totalReadings },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-gold">{s.value}</div>
            <div className="text-sm text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text">Users</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Signed up</th>
              <th className="text-right px-5 py-3">Charts</th>
              <th className="text-right px-5 py-3">Readings</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map(u => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-white/5">
                <td className="px-5 py-3 text-text">{u.name || '—'}</td>
                <td className="px-5 py-3 text-muted">{u.email}</td>
                <td className="px-5 py-3 text-muted">
                  {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-3 text-right text-gold">{u.chart_count}</td>
                <td className="px-5 py-3 text-right text-gold">{u.reading_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
