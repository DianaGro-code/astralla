import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const ENERGY_DOT = {
  high:   'bg-gold',
  medium: 'bg-amber-400',
  low:    'bg-blue-400',
};
const ENERGY_LABEL = { high: 'High energy', medium: 'Medium energy', low: 'Low energy' };

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5 border' : 'w-5 h-5 border-2';
  return <span className={`${s} border-current border-t-transparent rounded-full animate-spin inline-block`} />;
}

function CitySearch({ onSelect, placeholder = 'Search for a city…', autoFocus = false, dropUp = false }) {
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
    setQ('');
    setOpen(false);
    onSelect(city);
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          className="input pr-8"
          value={q}
          autoFocus={autoFocus}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/60">
            <Spinner size="sm" />
          </span>
        )}
      </div>
      {open && (
        <ul className={`absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden ${dropUp ? 'bottom-full mb-1' : 'mt-1'}`}>
          {results.map((city, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
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

/** Summary always visible; full details behind a toggle. */
function WeeklyCard({ reading, city, weekStart, weekEnd, isComparison = false }) {
  const [expanded, setExpanded] = useState(false);
  const dot   = ENERGY_DOT[reading.energy] || ENERGY_DOT.medium;
  const label = ENERGY_LABEL[reading.energy] || 'Medium energy';
  const fmt   = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-text-m text-xs font-sans">{label} · {fmt(weekStart)}–{fmt(weekEnd)}</span>
        {isComparison && (
          <span className="ml-auto text-xs font-sans text-text-m/60">📍 {city.split(',')[0]}</span>
        )}
      </div>

      <h2 className={`font-serif leading-tight ${isComparison ? 'text-lg' : 'text-2xl'} text-text-p`}>
        {reading.headline}
      </h2>

      <p className="text-text-p font-sans text-sm leading-relaxed">{reading.overview}</p>

      {/* Theme chips */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {reading.themes?.map((theme, i) => (
          <span key={i} className="text-[10px] font-sans uppercase tracking-widest text-gold/60 border border-gold/15 px-2.5 py-1 rounded-full">
            {theme.title}
          </span>
        ))}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between pt-3 border-t border-white/5 text-text-m text-xs font-sans hover:text-text-p transition-colors"
      >
        <span>{expanded ? 'Show less' : 'Full reading →'}</span>
        <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {expanded && (
        <div className="space-y-4 animate-fade-in">
          <div className="divide-y divide-white/5">
            {reading.themes?.map((theme, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-gold text-[11px] font-sans uppercase tracking-widest mb-1">{theme.title}</p>
                <p className="text-text-p font-sans text-sm leading-relaxed">{theme.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-amber-400/5 border border-amber-400/15 rounded-xl px-4 py-3">
              <p className="text-amber-300 text-[10px] font-sans uppercase tracking-widest mb-1">⚠ Watch for</p>
              <p className="text-text-p font-sans text-sm leading-relaxed">{reading.watchFor}</p>
            </div>
            <div className="flex-1 bg-emerald-400/5 border border-emerald-400/15 rounded-xl px-4 py-3">
              <p className="text-emerald-300 text-[10px] font-sans uppercase tracking-widest mb-1">✓ Best days</p>
              <p className="text-text-p font-sans text-sm leading-relaxed">{reading.bestDays}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyReading({ charts, onLimitReached }) {
  const [homeCity, setHomeCity]             = useState(null);
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [selectedChart, setSelectedChart]   = useState(null);
  const [reading, setReading]               = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [savingCity, setSavingCity]         = useState(false);
  const [detecting, setDetecting]           = useState(false);
  const [autoDetected, setAutoDetected]     = useState(false);

  const [whatIfCity, setWhatIfCity]         = useState(null);
  const [whatIfReading, setWhatIfReading]   = useState(null);
  const [whatIfLoading, setWhatIfLoading]   = useState(false);

  useEffect(() => {
    api.profile.get().then(p => {
      if (p.home_city) {
        setHomeCity({ displayName: p.home_city, lat: p.home_lat, lng: p.home_lng });
      } else {
        setDetecting(true);
        api.geocode.fromIp()
          .then(city => {
            if (city) {
              setAutoDetected(true);
              setSavingCity(true);
              api.profile.setHomeCity({ cityName: city.displayName, cityLat: city.lat, cityLng: city.lng })
                .then(() => setHomeCity(city))
                .catch(() => {})
                .finally(() => setSavingCity(false));
            }
          })
          .catch(() => {})
          .finally(() => setDetecting(false));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (charts?.length && !selectedChart) setSelectedChart(charts[0]);
  }, [charts]);

  useEffect(() => {
    if (selectedChart && homeCity) doGenerate(selectedChart, homeCity, setReading, setLoading);
  }, [selectedChart, homeCity]);

  async function doGenerate(chart, city, setR, setL) {
    setL(true); setError('');
    try {
      const data = await api.weekly.generate({ chartId: chart.id, cityName: city.displayName, cityLat: city.lat, cityLng: city.lng });
      if (data.weekStart) localStorage.setItem('lastWeeklyReadingWeek', data.weekStart);
      setR(data);
    } catch (err) {
      if (err.limitReached) { onLimitReached?.(err); }
      else { setError(err.message); }
    }
    finally { setL(false); }
  }

  async function saveHomeCity(city) {
    setSavingCity(true);
    setAutoDetected(false);
    setShowCitySearch(false);
    setReading(null);
    setWhatIfReading(null);
    try {
      await api.profile.setHomeCity({ cityName: city.displayName, cityLat: city.lat, cityLng: city.lng });
      setHomeCity(city);
    } catch { /* ignore */ }
    finally { setSavingCity(false); }
  }

  async function handleWhatIf(city) {
    setWhatIfCity(city);
    setWhatIfReading(null);
    if (selectedChart) doGenerate(selectedChart, city, setWhatIfReading, setWhatIfLoading);
  }

  if (!charts?.length) {
    return <div className="card text-center py-10 text-text-m font-sans text-sm">Add a birth chart first.</div>;
  }

  return (
    <div className="space-y-6">

      {/* ── Top bar: chart selector + city indicator ── */}
      <div className="space-y-2">
        {charts.length > 1 && (
          <select
            className="input py-1 text-sm w-auto"
            value={selectedChart?.id || ''}
            onChange={e => {
              const c = charts.find(ch => ch.id === Number(e.target.value));
              setSelectedChart(c); setReading(null); setWhatIfReading(null);
            }}
          >
            {charts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}

        {/* City: show as a small link, or expand to input */}
        {homeCity && !showCitySearch ? (
          <button
            onClick={() => setShowCitySearch(true)}
            className="flex items-center gap-1.5 text-xs font-sans text-text-m hover:text-text-p transition-colors"
          >
            {savingCity ? <Spinner size="sm" /> : <span className="opacity-60">📍</span>}
            <span>{homeCity.displayName.split(',')[0]}</span>
            {autoDetected && <span className="text-gold/40">· auto</span>}
            <span className="text-text-m/35">· change</span>
          </button>
        ) : !detecting && (
          <CitySearch
            placeholder="Where are you this week?"
            autoFocus={showCitySearch}
            onSelect={saveHomeCity}
          />
        )}

        {detecting && (
          <span className="flex items-center gap-2 text-xs font-sans text-text-m">
            <Spinner size="sm" /> Detecting location…
          </span>
        )}
      </div>

      {/* Empty state */}
      {!homeCity && !loading && !detecting && !showCitySearch && (
        <div className="card text-center py-12 space-y-1 border-dashed border-white/10">
          <p className="text-text-p font-sans font-medium">Enter your city to get started</p>
          <p className="text-text-m font-sans text-xs">Your reading refreshes every Monday.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-10 justify-center text-text-m font-sans text-sm">
          <Spinner /> Reading the sky over {homeCity?.displayName?.split(',')[0]}…
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* ── Main reading ── */}
      {reading && !loading && (
        <WeeklyCard
          reading={reading.reading}
          city={reading.city_name}
          weekStart={reading.weekStart}
          weekEnd={reading.weekEnd}
        />
      )}

      {/* ── What if — section divider style, no box ── */}
      {reading && !loading && (
        <div className="space-y-5 pt-2">

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] font-sans uppercase tracking-widest text-gold/40">explore</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div>
            <p className="font-serif text-xl text-text-p">What if you were somewhere else?</p>
            <p className="text-text-m text-xs font-sans mt-1">Same chart, different sky — see how your week changes.</p>
          </div>

          <CitySearch placeholder="Try Tokyo, Lisbon, New York…" onSelect={handleWhatIf} dropUp />

          {whatIfLoading && (
            <div className="flex items-center gap-3 py-3 text-text-m font-sans text-sm">
              <Spinner /> Checking {whatIfCity?.displayName?.split(',')[0]}…
            </div>
          )}

          {/* Side-by-side quick comparison */}
          {whatIfReading && !whatIfLoading && (
            <>
              <div className="grid grid-cols-2 gap-px bg-white/5 rounded-xl overflow-hidden">
                <div className="bg-card px-4 py-3 space-y-1.5">
                  <p className="text-[9px] font-sans uppercase tracking-widest text-text-m/60 truncate">
                    📍 {reading.city_name?.split(',')[0]}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ENERGY_DOT[reading.reading?.energy] || 'bg-amber-400'}`} />
                    <span className="text-[10px] font-sans text-text-m">{ENERGY_LABEL[reading.reading?.energy] || 'Medium energy'}</span>
                  </div>
                  <p className="font-serif text-sm text-text-p leading-snug">{reading.reading?.headline}</p>
                </div>
                <div className="bg-gold/5 px-4 py-3 space-y-1.5">
                  <p className="text-[9px] font-sans uppercase tracking-widest text-gold/50 truncate">
                    📍 {whatIfReading.city_name?.split(',')[0]}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ENERGY_DOT[whatIfReading.reading?.energy] || 'bg-amber-400'}`} />
                    <span className="text-[10px] font-sans text-text-m">{ENERGY_LABEL[whatIfReading.reading?.energy] || 'Medium energy'}</span>
                  </div>
                  <p className="font-serif text-sm text-text-p leading-snug">{whatIfReading.reading?.headline}</p>
                </div>
              </div>

              <WeeklyCard
                reading={whatIfReading.reading}
                city={whatIfReading.city_name}
                weekStart={whatIfReading.weekStart}
                weekEnd={whatIfReading.weekEnd}
                isComparison
              />
            </>
          )}
        </div>
      )}

    </div>
  );
}
