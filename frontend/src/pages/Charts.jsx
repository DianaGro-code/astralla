import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import GlobeLoader from '../components/GlobeLoader.jsx';
import Logo from '../components/Logo.jsx';
import { useNative } from '../hooks/useNative.js';

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3 h-3 border' : 'w-6 h-6 border-2';
  return <span className={`${s} border-current border-t-transparent rounded-full animate-spin inline-block`} />;
}

// ── New Chart Form ─────────────────────────────────────────────────────────────
function NewChartForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ label: '', birthDate: '', birthTime: '', birthPlace: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const [cityResults, setCityResults]   = useState([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityOpen, setCityOpen]         = useState(false);
  const cityDebounce = useRef(null);
  const cityWrapperRef = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (cityWrapperRef.current && !cityWrapperRef.current.contains(e.target)) setCityOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleCityInput(e) {
    const val = e.target.value;
    setForm(f => ({ ...f, birthPlace: val }));
    clearTimeout(cityDebounce.current);
    if (val.length < 2) { setCityResults([]); setCityOpen(false); return; }
    cityDebounce.current = setTimeout(async () => {
      setCitySearching(true);
      try {
        const data = await api.geocode.search(val);
        setCityResults(data);
        setCityOpen(data.length > 0);
      } catch {}
      setCitySearching(false);
    }, 350);
  }

  function handleCitySelect(city) {
    setForm(f => ({ ...f, birthPlace: city.displayName }));
    setCityResults([]);
    setCityOpen(false);
  }

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
        <label className="label">Name</label>
        <input className="input" placeholder="e.g. Diana, Samy, Mom…" value={form.label} onChange={set('label')} required />
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
        <div className="relative" ref={cityWrapperRef}>
          <div className="relative">
            <input
              className="input pr-8"
              placeholder="Search for a city…"
              value={form.birthPlace}
              onChange={handleCityInput}
              onFocus={() => cityResults.length > 0 && setCityOpen(true)}
              autoComplete="off"
              required
            />
            {citySearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/60 pointer-events-none">
                <Spinner size="sm" />
              </span>
            )}
          </div>
          {cityOpen && cityResults.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              {cityResults.map((city, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm font-sans text-text-p hover:bg-gold/10 hover:text-gold transition-colors border-b border-border/40 last:border-0"
                    onMouseDown={() => handleCitySelect(city)}
                  >
                    {city.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ chart, onDelete, onSetPrimary, isExpanded, onExpand }) {
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

  useEffect(() => {
    if (isExpanded) loadReadings();
  }, [isExpanded]);

  return (
    <div className={`card transition-all duration-300 relative overflow-hidden ${isExpanded ? 'border-gold/30' : 'hover:border-gold/20'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={e => { e.stopPropagation(); onSetPrimary(chart.id); }}
          className="shrink-0 leading-none transition-colors"
          title={chart.is_primary ? 'Primary chart' : 'Set as primary'}
        >
          <span className={`text-lg ${chart.is_primary ? 'text-gold' : 'text-gold/20 hover:text-gold/50'}`}>
            {chart.is_primary ? '★' : '☆'}
          </span>
        </button>

        <button onClick={onExpand} className="flex-1 min-w-0 text-left group">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-2xl text-text-p truncate">{chart.label}</h3>
              <p className="text-text-m text-xs font-sans mt-0.5">
                {chart.birth_date} · {chart.birth_time} · {chart.birth_place}
              </p>
            </div>
            <span className={`text-text-m text-sm transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>⌄</span>
          </div>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-border/60 animate-fade-in">
          {readings && readings.length > 0 && (
            <div>
              <p className="text-text-m text-[10px] font-sans mb-2 uppercase tracking-widest">Cities explored</p>
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

          {readings && readings.length === 0 && (
            <p className="text-text-m text-sm font-sans italic">No cities explored yet.</p>
          )}

          {loadingReadings && <div className="flex justify-center py-3"><Spinner /></div>}

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

// ── Charts Page ────────────────────────────────────────────────────────────────
export default function Charts() {
  const native = useNative();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedChartId, setExpandedChartId] = useState(null);

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

  async function handleSetPrimary(id) {
    setCharts(cs => {
      const updated = cs.map(c => ({ ...c, is_primary: c.id === id ? 1 : 0 }));
      return [...updated].sort((a, b) => b.is_primary - a.is_primary);
    });
    try { await api.charts.setPrimary(id); } catch {}
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
        {native && (
          <div className="mb-10">
            <Logo size={32} showWordmark />
          </div>
        )}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-text-p">Your Charts</h1>
            <p className="text-text-m text-sm font-sans mt-1">Birth charts &amp; reading history</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-gold py-2 px-4 text-sm">
              + New chart
            </button>
          )}
        </div>

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

        {charts.length > 1 && (
          <p className="text-text-m text-xs font-sans mb-3 flex items-center gap-1.5">
            <span className="text-gold/60">★</span>
            Tap the star to set your default chart for all readings.
          </p>
        )}

        <div className="space-y-4">
          {charts.map(chart => (
            <ChartCard
              key={chart.id}
              chart={chart}
              onDelete={handleDelete}
              onSetPrimary={handleSetPrimary}
              isExpanded={expandedChartId === chart.id}
              onExpand={() => setExpandedChartId(id => id === chart.id ? null : chart.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
