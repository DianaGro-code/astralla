import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../lib/api.js';

export default function Profile() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [homeCity, setHomeCity] = useState(null);
  const [usage, setUsage] = useState(null);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  useEffect(() => {
    Promise.all([
      api.charts.list(),
      api.readings.all(),
      api.profile.get(),
      api.usage.get(),
    ]).then(([charts, readings, profile, usageData]) => {
      setStats({ charts: charts.length, readings: readings.length });
      if (profile.home_city) setHomeCity(profile.home_city.split(',')[0]);
      setUsage(usageData);
    }).catch(() => {});
  }, []);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const rows = [
    memberSince                          && { label: 'Member since',     value: memberSince },
    homeCity                             && { label: 'Home city',        value: homeCity },
    stats                                && { label: 'Charts saved',     value: stats.charts },
    stats                                && { label: 'Cities read',      value: stats.readings },
    usage && user?.tier !== 'pro'        && { label: 'Free readings',    value: `${usage.used} of ${usage.limit} used` },
    user?.tier === 'pro'                 && { label: 'Plan',             value: '✦ Pro' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen px-6 pt-16 pb-32 flex flex-col items-center">
      {/* Avatar */}
      <div className="mt-8 mb-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-sans font-medium"
          style={{
            background: 'rgba(201,169,110,0.12)',
            color: '#C9A96E',
            border: '1px solid rgba(201,169,110,0.25)',
          }}
        >
          {initials}
        </div>
      </div>

      <h1 className="font-serif text-2xl text-text-p mb-1">{user?.name}</h1>
      <p className="text-text-m text-sm mb-10">{user?.email}</p>

      <div className="w-full max-w-sm space-y-3">
        {rows.length > 0 && (
          <div className="card px-5 py-1 divide-y divide-white/5">
            {rows.map(row => (
              <div key={row.label} className="flex justify-between items-center py-3">
                <span className="text-text-s text-sm">{row.label}</span>
                <span className="text-text-p text-sm">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={logout}
          className="w-full card px-5 py-4 text-left text-red-400 hover:border-red-400/30 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
