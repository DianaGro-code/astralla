import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import GlobeLoader from '../components/GlobeLoader.jsx';

const PLANET_GLYPHS = { sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇' };

// ── New Chart Form ────────────────────────────────────────────────────────────
function NewChartForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ label: '', birthDate: '', birthTime: '', birthPlace: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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
        <input className="input" placeholder="e.g. My Chart, Friend's Chart…" value={form.label} onChange={set('label')} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Birth Date</label>
          <input className="input" type="date" value={form.birthDate} onChange={set('birthDate')} required />
        </div>
        <div>
          <label className="label">Birth Time</label>
          <input className="input" type="time" value={form.birthTime} onChange={set('birthTime')} required />
        </div>
      </div>
      <div>
        <label className="label">Birth Place</label>
        <input className="input" placeholder="City, Country (e.g. Paris, France)" value={form.birthPlace} onChange={set('birthPlace')} required />
      </div>
      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-gold flex-1" disabled={loading}>
          {loading ? <span className="flex items-center gap-2 justify-center"><Spinner size="sm" />Geocoding…</span> : 'Save Chart'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

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

  // Close dropdown on outside click
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
      const reading = await api.readings.generate({ chartId: chart.id, cityQuery: selected.displayName });
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
      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
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
            <div className="absolute z-20 left-0 right-0 mt-1 bg-[#141430] border border-border rounded-lg shadow-xl overflow-hidden">
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
          disabled={loading || !selected}
        >
          ✦ Generate Reading
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>
    </>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ chart, onDelete, onReading }) {
  const [expanded, setExpanded] = useState(false);
  const [readings, setReadings] = useState(null);
  const [loadingReadings, setLoadingReadings] = useState(false);
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

  function handleExpand() {
    setExpanded(e => !e);
    if (!expanded) loadReadings();
  }

  return (
    <div className="card hover:border-gold/30 transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gold text-lg">✦</span>
            <h3 className="font-serif text-lg text-text-p truncate">{chart.label}</h3>
          </div>
          <p className="text-text-s text-sm font-sans">
            {chart.birth_date} · {chart.birth_time} · {chart.birth_place}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExpand}
            className="text-xs font-sans text-text-m hover:text-gold transition-colors px-2 py-1 rounded border border-border hover:border-gold/40"
          >
            {expanded ? 'Close' : 'Explore'}
          </button>
          <button
            onClick={() => onDelete(chart.id)}
            className="text-xs font-sans text-text-m hover:text-red-400 transition-colors px-2 py-1 rounded border border-border hover:border-red-400/40"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
          <p className="text-text-m text-xs font-sans mb-2 uppercase tracking-wider">Query a location</p>
          <LocationForm chart={chart} onReading={(r) => { onReading(r); navigate(`/reading/${r.id}`); }} />

          <div className="mt-5">
            <p className="text-text-m text-xs font-sans mb-3 uppercase tracking-wider">Past readings</p>
            {loadingReadings && <div className="flex justify-center py-3"><Spinner /></div>}
            {readings && readings.length === 0 && (
              <p className="text-text-m text-sm font-sans italic">No readings yet. Enter a city above.</p>
            )}
            {readings && readings.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/reading/${r.id}`)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-gold/30 hover:bg-card-h transition-all mb-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm text-text-p group-hover:text-gold transition-colors">{r.city_name}</span>
                  <span className="text-text-m text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <span className="text-text-m text-xs font-sans">{r.influences.length} lines · {r.parans.length} parans</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3 h-3 border' : 'w-6 h-6 border-2';
  return <span className={`${s} border-current border-t-transparent rounded-full animate-spin inline-block`} />;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.charts.list().then(setCharts).catch(console.error).finally(() => setLoading(false));
  }, []);

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
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-text-p">
              {user?.name?.split(' ')[0]}'s Star Map
            </h1>
            <p className="text-text-m text-sm font-sans mt-1">Your birth charts & readings</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-gold py-2 px-4 text-sm">
              + New Chart
            </button>
          )}
        </div>

        {/* New chart form */}
        {showForm && (
          <div className="mb-6">
            <NewChartForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Charts list */}
        {loading && <div className="flex justify-center py-12"><Spinner /></div>}

        {!loading && charts.length === 0 && !showForm && (
          <div className="card text-center py-12">
            <div className="text-gold text-4xl mb-4">✦</div>
            <h2 className="font-serif text-xl text-text-p mb-2">No charts yet</h2>
            <p className="text-text-m font-sans text-sm mb-6">
              Add your birth data to begin exploring the world through your astrocartography.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-gold">
              Create your first chart
            </button>
          </div>
        )}

        <div className="space-y-4">
          {charts.map(chart => (
            <ChartCard
              key={chart.id}
              chart={chart}
              onDelete={handleDelete}
              onReading={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
