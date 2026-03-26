import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import GlobeLoader from '../components/GlobeLoader.jsx';
import WorldMap from '../components/WorldMap.jsx';
import WeeklyReading from '../components/WeeklyReading.jsx';

const PLANET_GLYPHS = { sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇' };

const INTENTS = [
  { key: 'love',     glyph: '♀', label: 'Love',           desc: 'Romance, attraction, partnership' },
  { key: 'career',   glyph: '☉', label: 'Career',         desc: 'Power, reputation, success' },
  { key: 'escape',   glyph: '☽', label: 'Home',            desc: 'Rest, belonging, a place to return to' },
  { key: 'creative', glyph: '✦', label: 'Creative',       desc: 'Inspiration, expression, art' },
  { key: 'change',   glyph: '♇', label: 'Transformation', desc: 'Deep shift, rebirth, evolution' },
];

const INTENT_LABELS = {
  love: 'love & relationships', career: 'career & ambition',
  escape: 'home & belonging', creative: 'creativity & inspiration', change: 'transformation',
};

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3 h-3 border' : 'w-6 h-6 border-2';
  return <span className={`${s} border-current border-t-transparent rounded-full animate-spin inline-block`} />;
}

// ── New Chart Form ────────────────────────────────────────────────────────────
function NewChartForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ label: '', birthDate: '', birthTime: '', birthPlace: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleUnknownTime() {
    const next = !unknownTime;
    setUnknownTime(next);
    if (next) setForm(f => ({ ...f, birthTime: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const chart = await api.charts.create(form);
      onCreated(chart);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 animate-slide-up border-gold/30">
      <h3 className="font-serif text-xl text-text-p">New Birth Chart</h3>
      <div>
        <label className="label">Chart Label</label>
        <input className="input" placeholder="e.g. My Chart, Sarah's Chart…" value={form.label} onChange={set('label')} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Birth Date</label>
          <input className="input" type="date" value={form.birthDate} onChange={set('birthDate')} required />
        </div>
        <div>
          <label className="label">
            Birth Time
            <span className="text-text-m font-normal normal-case tracking-normal ml-1">(optional)</span>
          </label>
          <input
            className={`input transition-opacity ${unknownTime ? 'opacity-30 pointer-events-none' : ''}`}
            type="time"
            value={form.birthTime}
            onChange={set('birthTime')}
            disabled={unknownTime}
          />
          <button
            type="button"
            onClick={handleUnknownTime}
            className={`mt-1.5 text-xs font-sans transition-colors flex items-center gap-1.5 ${
              unknownTime ? 'text-gold' : 'text-text-m hover:text-text-s'
            }`}
          >
            {unknownTime ? (
              <>
                <span className="text-gold">✓</span>
                <span>Using noon as placeholder — <span className="underline underline-offset-2 cursor-pointer">undo</span></span>
              </>
            ) : (
              "I don't know my birth time"
            )}
          </button>
          {unknownTime && (
            <p className="mt-1.5 text-text-m text-xs font-sans leading-relaxed bg-gold/5 border border-gold/15 rounded-lg px-3 py-2">
              Planet positions will be accurate. Ascendant &amp; Midheaven lines need an exact time to personalise fully.
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="label">Birth Place</label>
        <input className="input" placeholder="City, Country (e.g. Paris, France)" value={form.birthPlace} onChange={set('birthPlace')} required />
      </div>
      {!unknownTime && (
        <p className="text-text-m text-xs font-sans -mt-1">
          Exact birth time unlocks your Midheaven &amp; Ascendant lines — the most personal part of your reading.
        </p>
      )}
      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-gold flex-1" disabled={loading}>
          {loading ? <span className="flex items-center gap-2 justify-center"><Spinner size="sm" />Saving…</span> : 'Save chart →'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

const REGIONS = [
  { key: 'worldwide',      label: '🌐 Worldwide'          },
  { key: 'europe',         label: '🇪🇺 Europe'             },
  { key: 'americas',       label: '🌎 Americas'            },
  { key: 'asia',           label: '🌏 Asia'                },
  { key: 'africa-mideast', label: '🌍 Africa & Middle East' },
  { key: 'oceania',        label: '🌊 Oceania'             },
];

// ── Discover: Top 3 Cities ────────────────────────────────────────────────────
function DiscoverForm({ chart, onCitySelect, generatingCity }) {
  const [intent, setIntent] = useState(null);
  const [region, setRegion] = useState('worldwide');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [nudge, setNudge] = useState(false);

  async function handleDiscover() {
    if (!intent) {
      setNudge(true);
      setTimeout(() => setNudge(false), 2000);
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const data = await api.topCities.find({ chartId: chart.id, intent, region });
      setResults(data.cities);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Intent */}
      <div>
        <p className="text-text-m text-xs font-sans uppercase tracking-wider mb-2">What are you looking for?</p>
        <div className="flex flex-wrap gap-1.5">
          {INTENTS.map(it => (
            <button
              key={it.key}
              type="button"
              onClick={() => { setIntent(i => i === it.key ? null : it.key); setResults(null); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                intent === it.key
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
              }`}
            >
              <span>{it.glyph}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div>
        <p className="text-text-m text-xs font-sans uppercase tracking-wider mb-2">Where in the world?</p>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setRegion(r.key); setResults(null); }}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                region === r.key
                  ? 'border-teal bg-teal/15 text-teal'
                  : 'border-border text-text-s hover:border-teal/40 hover:text-text-p'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleDiscover}
        disabled={loading}
        className="btn-gold w-full py-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2 justify-center">
            <Spinner size="sm" />
            Scanning cities{region !== 'worldwide' ? ` in ${REGIONS.find(r=>r.key===region)?.label.split(' ').slice(1).join(' ')}` : ''}…
          </span>
        ) : intent ? (
          `✦ Find my best ${region !== 'worldwide' ? REGIONS.find(r=>r.key===region)?.label.split(' ').slice(1).join(' ') + ' ' : ''}cities for ${INTENT_LABELS[intent]}`
        ) : (
          '✦ Find my best cities'
        )}
      </button>

      {nudge && <p className="text-gold text-xs font-sans text-center animate-fade-in">↑ Pick what you're looking for first</p>}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {results && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-text-m text-xs font-sans uppercase tracking-wider">
            Your top cities for {INTENT_LABELS[intent]}
          </p>
          {results.map((city, i) => (
            <div key={i} className="rounded-xl border border-border bg-nebula px-4 py-4 hover:border-gold/30 transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-serif text-base text-text-p">{city.cityName}</h4>
                <span className="text-gold text-xs font-sans shrink-0 mt-0.5">#{i + 1}</span>
              </div>
              <p className="font-serif text-sm text-text-p leading-relaxed mb-2">"{city.hook}"</p>
              <p className="font-sans text-xs text-text-s leading-relaxed mb-2">{city.why}</p>
              <div className="mb-3 relative pl-3 border-l-2 border-amber-400/60">
                <p className="font-sans text-[10px] text-text-m uppercase tracking-wider mb-0.5">What it costs you</p>
                <p className="font-sans text-xs text-text-s leading-relaxed">{city.cost}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif text-xs text-gold italic flex-1">{city.verdict}</p>
                <button
                  onClick={() => onCitySelect(city.cityName, intent)}
                  disabled={!!generatingCity}
                  className="text-xs font-sans text-text-m hover:text-gold transition-colors px-2 py-1 rounded border border-border hover:border-gold/40 shrink-0 disabled:opacity-50"
                >
                  {generatingCity === city.cityName
                    ? <span className="flex items-center gap-1.5"><Spinner size="sm" />Loading…</span>
                    : 'Full reading →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// placeholder for count display
const WORLD_CITIES_COUNT = 75;

// ── Location Query Form ────────────────────────────────────────────────────────
function LocationForm({ chart, onReading }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setResults([]);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.geocode.search(val);
        setResults(data);
      } catch {}
      setSearching(false);
    }, 350);
  }

  function handleSelect(city) {
    setSelected(city);
    setQuery(city.displayName);
    setResults([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      const reading = await api.readings.generate({
        chartId: chart.id,
        cityQuery: selected.displayName,
      });
      onReading(reading);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading && (
        <GlobeLoader
          cityName={selected?.displayName}
          lat={selected?.lat}
          lng={selected?.lng}
        />
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <p className="text-text-m text-xs font-sans leading-relaxed">
          We'll read your birth chart against this city — covering love, career, inner life, vitality, and growth.
        </p>
        {/* City search */}
        <div className="relative" ref={wrapperRef}>
          <input
            className="input w-full py-2 pr-8"
            placeholder="Search for a city…"
            value={query}
            onChange={handleInput}
            autoComplete="off"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </span>
          )}
          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
              {results.map((city, i) => (
                <button
                  type="button"
                  key={i}
                  className="w-full text-left px-4 py-2.5 text-sm font-sans text-text-p hover:bg-gold/10 hover:text-gold transition-colors border-b border-border/40 last:border-0"
                  onClick={() => handleSelect(city)}
                >
                  {city.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn-gold w-full py-2"
          disabled={loading}
        >
          {selected
            ? `✦ Read ${selected.displayName.split(',')[0]}`
            : '✦ Search for a city'}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>
    </>
  );
}

// ── Star Row ──────────────────────────────────────────────────────────────────
function StarRow({ ratings }) {
  const entries = Object.entries(ratings).filter(([,v]) => v != null);
  if (!entries.length) return null;
  const avg = entries.reduce((s,[,v]) => s + v, 0) / entries.length;
  return (
    <div className="flex items-center gap-1 mt-1">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`text-xs ${n <= Math.round(avg) ? 'text-gold' : 'text-border'}`}>★</span>
      ))}
      <span className="text-text-m text-xs font-sans ml-1">{avg.toFixed(1)}</span>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ chart, onDelete, isExpanded, onExpand }) {
  const [mode, setMode] = useState('city'); // 'city' | 'discover'
  const [readings, setReadings] = useState(null);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [generatingCity, setGeneratingCity] = useState(null);
  const navigate = useNavigate();

  async function loadReadings() {
    if (readings) return;
    setLoadingReadings(true);
    try {
      const data = await api.readings.forChart(chart.id);
      setReadings(data);
    } catch {}
    setLoadingReadings(false);
  }

  useEffect(() => {
    if (isExpanded) loadReadings();
  }, [isExpanded]);

  function handleExpand() {
    onExpand();
  }

  async function handleCitySelect(cityName, intent) {
    // If reading already exists locally, navigate straight there
    if (readings) {
      const existing = readings.find(r =>
        r.city_name.split(',')[0].trim().toLowerCase() === cityName.split(',')[0].trim().toLowerCase()
      );
      if (existing) {
        navigate(`/reading/${existing.id}`);
        return;
      }
    }
    // Otherwise generate (backend also deduplicates)
    setGeneratingCity(cityName);
    try {
      const reading = await api.readings.generate({
        chartId: chart.id,
        cityQuery: cityName,
        intent: intent || undefined,
      });
      navigate(`/reading/${reading.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCity(null);
    }
  }

  return (
    <div className={`card transition-all duration-300 relative overflow-hidden ${isExpanded ? 'border-gold/30' : 'hover:border-gold/20'}`}>
      {/* Clickable header */}
      <button
        onClick={handleExpand}
        className="w-full text-left group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-base transition-colors ${isExpanded ? 'text-gold' : 'text-gold/60 group-hover:text-gold'}`}>✦</span>
              <h3 className="font-serif text-lg text-text-p truncate">{chart.label}</h3>
            </div>
            <p className="text-text-m text-xs font-sans">
              {chart.birth_date} · {chart.birth_time} · {chart.birth_place}
            </p>
          </div>
          <span className={`text-text-m text-sm transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
            ⌄
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-border/60 animate-fade-in">
          {/* Mode tabs — pill style */}
          <div className="flex gap-1 mb-4 p-0.5 bg-nebula rounded-lg border border-border/60">
            <button
              onClick={() => setMode('city')}
              className={`flex-1 py-1.5 rounded-md text-xs font-sans transition-all duration-200 ${
                mode === 'city' ? 'bg-card shadow-sm text-text-p border border-border/60' : 'text-text-m hover:text-text-p'
              }`}
            >
              Enter a city
            </button>
            <button
              onClick={() => setMode('discover')}
              className={`flex-1 py-1.5 rounded-md text-xs font-sans transition-all duration-200 ${
                mode === 'discover' ? 'bg-card shadow-sm text-text-p border border-border/60' : 'text-text-m hover:text-text-p'
              }`}
            >
              Find cities for me ✦
            </button>
          </div>

          {mode === 'city' && (
            <LocationForm chart={chart} onReading={(r) => navigate(`/reading/${r.id}`)} />
          )}

          {mode === 'discover' && (
            <DiscoverForm chart={chart} onCitySelect={handleCitySelect} generatingCity={generatingCity} />
          )}

          {/* Past readings — deduplicated by city, most recent per city */}
          {readings && readings.length > 0 && (
            <div className="mt-6">
              <p className="text-text-m text-[10px] font-sans mb-2 uppercase tracking-widest">Explored</p>
              <div>
                {Object.values(
                  readings.reduce((acc, r) => {
                    const key = r.city_name.split(',')[0].trim().toLowerCase();
                    if (!acc[key] || r.created_at > acc[key].created_at) acc[key] = r;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map(r => {
                    const overall = r.themes?.overallRating;
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/reading/${r.id}`)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-nebula transition-all group"
                      >
                        <span className="text-gold/30 text-[9px] group-hover:text-gold/60 transition-colors shrink-0">✦</span>
                        <span className="font-sans text-xs text-text-s group-hover:text-text-p transition-colors flex-1 text-left truncate">
                          {r.city_name.split(',')[0]}
                        </span>
                        {overall != null && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center gap-px">
                              {[1,2,3,4,5].map(n => (
                                <span key={n} className="text-[8px]" style={{ color: '#D4AF37', opacity: n <= overall ? 0.75 : 0.15 }}>★</span>
                              ))}
                            </div>
                            <span className="text-[10px] text-text-m/60 tabular-nums">{overall}/5</span>
                          </div>
                        )}
                        <span className="text-text-m/50 text-[10px] shrink-0 tabular-nums">
                          {new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
          {loadingReadings && <div className="flex justify-center py-3 mt-4"><Spinner /></div>}

          <div className="mt-5 pt-4 border-t border-border/30 flex justify-end">
            <button
              onClick={() => onDelete(chart.id)}
              className="text-[10px] font-sans text-text-m/50 hover:text-red-400 transition-colors uppercase tracking-wider"
            >
              Delete chart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [allReadings, setAllReadings] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapChartId, setMapChartId] = useState('all');
  const [expandedChartId, setExpandedChartId] = useState(null);
  const [mapLines, setMapLines] = useState(null);
  const [mapLinesLoading, setMapLinesLoading] = useState(false);

  useEffect(() => {
    api.charts.list().then(setCharts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view === 'map' && allReadings.length === 0) {
      setMapLoading(true);
      api.readings.all().then(setAllReadings).catch(console.error).finally(() => setMapLoading(false));
    }
  }, [view]);

  // Fetch planet lines when map opens or chart selection changes
  useEffect(() => {
    if (view !== 'map') return;

    if (mapChartId !== 'all') {
      // Specific chart selected
      setMapLinesLoading(true);
      api.charts.lines(mapChartId)
        .then(setMapLines)
        .catch(() => setMapLines(null))
        .finally(() => setMapLinesLoading(false));
    } else if (charts.length === 0) {
      setMapLines(null);
    } else if (charts.length === 1) {
      // Auto-select the only chart
      setMapLinesLoading(true);
      api.charts.lines(charts[0].id)
        .then(setMapLines)
        .catch(() => setMapLines(null))
        .finally(() => setMapLinesLoading(false));
    } else {
      // All charts selected + multiple charts → fetch all and combine
      setMapLinesLoading(true);
      Promise.all(
        charts.map((c, idx) =>
          api.charts.lines(c.id)
            .then(lines => (lines || []).map(l => ({ ...l, chartIndex: idx })))
            .catch(() => [])
        )
      )
        .then(allLinesArrays => {
          const combined = allLinesArrays.flat();
          setMapLines(combined.length ? combined : null);
        })
        .finally(() => setMapLinesLoading(false));
    }
  }, [view, mapChartId, charts]);

  function handleCreated(chart) {
    setCharts(cs => [chart, ...cs]);
    setShowForm(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this birth chart and all its readings?')) return;
    await api.charts.delete(id);
    setCharts(cs => cs.filter(c => c.id !== id));
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-text-p">
              {user?.name?.split(' ')[0]}'s charts
            </h1>
            <p className="text-text-m text-sm font-sans mt-1">Your birth charts & city readings</p>
          </div>
          {!showForm && (view === 'list') && (
            <button onClick={() => setShowForm(true)} className="btn-gold py-2 px-4 text-sm">
              + New chart
            </button>
          )}
        </div>

        {/* View toggle */}
        {!loading && (charts.length > 0 || allReadings.length > 0) && (
          <div className="flex rounded-lg border border-border overflow-hidden mb-6 w-fit">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-1.5 text-xs font-sans transition-colors ${
                view === 'list' ? 'bg-gold/15 text-gold' : 'text-text-m hover:text-text-p'
              }`}
            >
              ☰ Charts
            </button>
            <button
              onClick={() => setView('map')}
              className={`px-4 py-1.5 text-xs font-sans border-l border-border transition-colors ${
                view === 'map' ? 'bg-gold/15 text-gold' : 'text-text-m hover:text-text-p'
              }`}
            >
              🗺 Map
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`px-4 py-1.5 text-xs font-sans border-l border-border transition-colors ${
                view === 'weekly' ? 'bg-gold/15 text-gold' : 'text-text-m hover:text-text-p'
              }`}
            >
              ✦ This Week
            </button>
          </div>
        )}

        {/* MAP VIEW */}
        {view === 'map' && (
          <div className="animate-fade-in">
            {/* Chart filter — only shown when user has multiple charts */}
            {charts.length > 1 && (
              <div className="mb-3">
                <p className="text-text-m text-xs font-sans uppercase tracking-wider mb-2">Showing cities for</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setMapChartId('all')}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                      mapChartId === 'all'
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                    }`}
                  >
                    All charts
                  </button>
                  {charts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setMapChartId(c.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                        mapChartId === c.id
                          ? 'border-gold bg-gold/15 text-gold'
                          : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                      }`}
                    >
                      <span>✦</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Count line */}
            {(() => {
              const filtered = mapChartId === 'all'
                ? allReadings
                : allReadings.filter(r => r.chart_id === mapChartId);
              const chartName = mapChartId !== 'all'
                ? charts.find(c => c.id === mapChartId)?.label
                : null;
              return (
                <>
                  <div className="mb-3">
                    <p className="text-text-m text-xs font-sans">
                      {filtered.length} {filtered.length === 1 ? 'city' : 'cities'} explored
                      {chartName ? ` for ${chartName}` : ''}
                      {' '}· click a pin to open
                    </p>
                  </div>
                  {mapLoading ? (
                    <div className="flex justify-center py-16"><Spinner /></div>
                  ) : (
                    <WorldMap
                      readings={filtered}
                      onReadingClick={(id) => navigate(`/reading/${id}`)}
                      planetLines={mapLines}
                      charts={mapChartId === 'all' ? charts : charts.filter(c => c.id === mapChartId)}
                    />
                  )}
                  {filtered.length === 0 && !mapLoading && (
                    <p className="text-center text-text-m text-sm font-serif italic mt-4">
                      {allReadings.length === 0
                        ? 'Explore some cities to see them on the map.'
                        : `No cities read for ${chartName || 'this chart'} yet.`}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* WEEKLY VIEW */}
        {view === 'weekly' && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h2 className="font-serif text-xl text-text-p">Your week, by the sky</h2>
              <p className="text-text-m text-sm font-sans mt-1">A fresh reading every week, tied to where you actually are.</p>
            </div>
            <WeeklyReading charts={charts} />
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {/* New chart form */}
            {showForm && (
              <div className="mb-6">
                <NewChartForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
              </div>
            )}

            {loading && <div className="flex justify-center py-12"><Spinner /></div>}

            {!loading && charts.length === 0 && !showForm && (
              <div className="card text-center py-14 border-dashed">
                <div className="text-gold text-3xl mb-5">✦</div>
                <h2 className="font-serif text-2xl text-text-p mb-3">
                  Your chart is a map.<br />You haven't unfolded it yet.
                </h2>
                <p className="text-text-m font-sans text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                  Add your birth data and start exploring which cities are written into your chart.
                </p>
                <button onClick={() => setShowForm(true)} className="btn-gold">
                  Add my birth chart →
                </button>
              </div>
            )}

            <div className="space-y-4">
              {(expandedChartId ? charts.filter(c => c.id === expandedChartId) : charts).map(chart => (
                <ChartCard
                  key={chart.id}
                  chart={chart}
                  onDelete={handleDelete}
                  isExpanded={expandedChartId === chart.id}
                  onExpand={() => setExpandedChartId(id => id === chart.id ? null : chart.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
