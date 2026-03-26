import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const ENERGY_COLORS = {
  high:   'text-gold border-gold/40 bg-gold/10',
  medium: 'text-amber-300 border-amber-300/40 bg-amber-300/10',
  low:    'text-blue-300 border-blue-300/40 bg-blue-300/10',
};

function Spinner() {
  return <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

function CitySearch({ onSelect, placeholder = 'Search for a city…' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.geocode.search(q);
        setResults(r);
        setOpen(r.length > 0);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  function pick(city) {
    setQ(city.displayName);
    setOpen(false);
    onSelect(city);
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          className="input pr-8"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/60">
            <Spinner />
          </span>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden">
          {results.map((city, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-text-p hover:bg-white/5 transition-colors"
                onMouseDown={() => pick(city)}
              >
                {city.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeeklyCard({ reading, city, weekStart, weekEnd }) {
  const energyClass = ENERGY_COLORS[reading.energy] || ENERGY_COLORS.medium;
  const fmt = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-m text-xs font-sans uppercase tracking-widest mb-1">
            Week of {fmt(weekStart)} – {fmt(weekEnd)}
          </p>
          <h2 className="font-serif text-2xl text-text-p leading-snug">
            {reading.headline}
          </h2>
          <p className="text-text-m text-sm mt-1 font-sans">📍 {city}</p>
        </div>
        <span className={`text-xs font-sans px-3 py-1 rounded-full border font-medium shrink-0 ${energyClass}`}>
          {reading.energy} energy
        </span>
      </div>

      {/* Overview */}
      <p className="text-text-p font-sans text-sm leading-relaxed border-l-2 border-gold/40 pl-4">
        {reading.overview}
      </p>

      {/* Themes */}
      <div className="space-y-3">
        {reading.themes?.map((theme, i) => (
          <div key={i} className="card border-white/5 space-y-1 py-3 px-4">
            <p className="text-gold text-xs font-sans uppercase tracking-widest">{theme.title}</p>
            <p className="text-text-p font-sans text-sm leading-relaxed">{theme.text}</p>
          </div>
        ))}
      </div>

      {/* Watch For + Best Days */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card border-amber-400/20 bg-amber-400/5 py-3 px-4">
          <p className="text-amber-300 text-xs font-sans uppercase tracking-widest mb-1">Watch for</p>
          <p className="text-text-p font-sans text-sm leading-relaxed">{reading.watchFor}</p>
        </div>
        <div className="card border-emerald-400/20 bg-emerald-400/5 py-3 px-4">
          <p className="text-emerald-300 text-xs font-sans uppercase tracking-widest mb-1">Best days</p>
          <p className="text-text-p font-sans text-sm leading-relaxed">{reading.bestDays}</p>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyReading({ charts }) {
  const [profile, setProfile] = useState(null);
  const [homeCity, setHomeCity] = useState(null); // { displayName, lat, lng }
  const [selectedChart, setSelectedChart] = useState(null);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingCity, setSavingCity] = useState(false);

  // What-if city
  const [whatIfCity, setWhatIfCity] = useState(null);
  const [whatIfReading, setWhatIfReading] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Load profile on mount
  useEffect(() => {
    api.profile.get().then(p => {
      setProfile(p);
      if (p.home_city) {
        setHomeCity({ displayName: p.home_city, lat: p.home_lat, lng: p.home_lng });
      }
    }).catch(() => {});
  }, []);

  // Auto-select first chart
  useEffect(() => {
    if (charts?.length && !selectedChart) setSelectedChart(charts[0]);
  }, [charts]);

  // Generate home reading when chart + city are ready
  useEffect(() => {
    if (selectedChart && homeCity) generateReading(selectedChart, homeCity, setReading, setLoading);
  }, [selectedChart, homeCity]);

  async function generateReading(chart, city, setR, setL) {
    setL(true);
    setError('');
    try {
      const data = await api.weekly.generate({
        chartId: chart.id,
        cityName: city.displayName,
        cityLat: city.lat,
        cityLng: city.lng,
      });
      setR(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setL(false);
    }
  }

  async function saveHomeCity(city) {
    setSavingCity(true);
    try {
      await api.profile.setHomeCity({ cityName: city.displayName, cityLat: city.lat, cityLng: city.lng });
      setHomeCity(city);
      setReading(null);
    } catch { /* ignore */ }
    finally { setSavingCity(false); }
  }

  async function handleWhatIf(city) {
    setWhatIfCity(city);
    setWhatIfReading(null);
    if (selectedChart) generateReading(selectedChart, city, setWhatIfReading, setWhatIfLoading);
  }

  if (!charts?.length) {
    return (
      <div className="card text-center py-10 text-text-m font-sans text-sm">
        Add a birth chart first to see your weekly reading.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card border-white/5 space-y-4">
        {/* Chart selector */}
        {charts.length > 1 && (
          <div>
            <label className="label">Chart</label>
            <select
              className="input"
              value={selectedChart?.id || ''}
              onChange={e => {
                const c = charts.find(ch => ch.id === Number(e.target.value));
                setSelectedChart(c);
                setReading(null);
                setWhatIfReading(null);
              }}
            >
              {charts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}

        {/* Home city */}
        <div>
          <label className="label">
            Your city this week
            {homeCity && <span className="text-text-m font-normal normal-case tracking-normal ml-2">— {homeCity.displayName}</span>}
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <CitySearch
                placeholder={homeCity ? 'Change city…' : 'Where are you this week?'}
                onSelect={saveHomeCity}
              />
            </div>
            {savingCity && <Spinner />}
          </div>
        </div>
      </div>

      {/* Home reading */}
      {!homeCity && (
        <div className="card text-center py-10 space-y-2">
          <p className="text-4xl">📍</p>
          <p className="text-text-p font-sans font-medium">Where are you this week?</p>
          <p className="text-text-m font-sans text-sm">Enter your city above to get your weekly reading.</p>
        </div>
      )}

      {homeCity && loading && (
        <div className="card text-center py-10 space-y-3">
          <Spinner />
          <p className="text-text-m font-sans text-sm">Reading the sky over {homeCity.displayName}…</p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>
      )}

      {reading && !loading && (
        <WeeklyCard
          reading={reading.reading}
          city={reading.city_name}
          weekStart={reading.weekStart}
          weekEnd={reading.weekEnd}
        />
      )}

      {/* What-if section */}
      {reading && !loading && (
        <div className="space-y-4 pt-2 border-t border-white/5">
          <div>
            <p className="text-text-p font-sans font-medium text-sm mb-1">What if you were somewhere else?</p>
            <p className="text-text-m font-sans text-xs mb-3">See how your week would look in a different city.</p>
            <CitySearch placeholder="Try another city…" onSelect={handleWhatIf} />
          </div>

          {whatIfLoading && (
            <div className="card text-center py-8 space-y-3">
              <Spinner />
              <p className="text-text-m font-sans text-sm">Checking {whatIfCity?.displayName}…</p>
            </div>
          )}

          {whatIfReading && !whatIfLoading && (
            <div className="space-y-2">
              <p className="text-text-m font-sans text-xs uppercase tracking-widest">If you were in {whatIfReading.city_name}</p>
              <WeeklyCard
                reading={whatIfReading.reading}
                city={whatIfReading.city_name}
                weekStart={whatIfReading.weekStart}
                weekEnd={whatIfReading.weekEnd}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
