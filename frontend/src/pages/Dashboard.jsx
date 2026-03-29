import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import GlobeLoader from '../components/GlobeLoader.jsx';
import WorldMap from '../components/WorldMap.jsx';
import WeeklyReading from '../components/WeeklyReading.jsx';
import { useNative } from '../hooks/useNative.js';
import Logo from '../components/Logo.jsx';

const PLANET_GLYPHS = { sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇' };

// ── Feature config ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    key: 'city',
    glyph: '✦',
    title: 'City Reading',
    color: '#D4AF37',
    description: 'Your birth chart has specific things to say about every city on Earth. Enter any place — somewhere you\'re moving, a dream destination, or a city that\'s been calling you — and we\'ll read it across love, career, inner life, vitality, and growth.',
  },
  {
    key: 'discover',
    glyph: '◉',
    title: 'Best Places for You',
    color: '#4BC9C8',
    description: 'Tell us what you\'re looking for and we\'ll scan hundreds of cities to find which ones align best with your chart.',
  },
  {
    key: 'transits',
    glyph: '♃',
    title: 'Travel Reading',
    color: '#B08AE0',
    description: 'Planning a trip? We\'ll read the current planetary transits against your birth chart for any destination and travel dates.',
  },
  {
    key: 'solar',
    glyph: '☉',
    title: 'Birthday Reading',
    color: '#E8A044',
    description: 'Where you spend your birthday shapes your entire year ahead. Your Solar Return chart shifts based on location — choose wisely.',
  },
  {
    key: 'map',
    glyph: '◎',
    title: 'World Map',
    color: '#5A8FC8',
    description: 'See all your city readings mapped on a globe, with your personal planetary lines drawn across every continent.',
  },
  {
    key: 'weekly',
    glyph: '☽',
    title: 'This Week',
    color: '#9BB5CC',
    description: 'A fresh reading every week — the current sky interpreted personally for you, wherever you are.',
  },
  {
    key: 'partner',
    glyph: '⊕',
    title: 'Partner Reading',
    color: '#C0507A',
    description: 'Enter a city and see how it lands for two people together — covering love, shared purpose, and what the place asks of you both.',
  },
  {
    key: 'occasion',
    glyph: '✶',
    title: 'Chapter Planner',
    color: '#6B9E78',
    description: 'Tell us what you\'re navigating and we\'ll find the cities that hold the right energy for that chapter of your life.',
  },
];

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

const REGIONS = [
  { key: 'worldwide',      label: '🌐 Worldwide'          },
  { key: 'europe',         label: '🇪🇺 Europe'             },
  { key: 'americas',       label: '🌎 Americas'            },
  { key: 'asia',           label: '🌏 Asia'                },
  { key: 'africa-mideast', label: '🌍 Africa & Middle East' },
  { key: 'oceania',        label: '🌊 Oceania'             },
];

const OCCASIONS = [
  'Finishing a big project',
  'Getting over a heartbreak',
  'Building something that lasts',
  'Starting completely fresh',
  'Finding your people',
  'Creative breakthrough',
  'Healing and recovery',
];

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3 h-3 border' : 'w-6 h-6 border-2';
  return <span className={`${s} border-current border-t-transparent rounded-full animate-spin inline-block`} />;
}

// ── Usage Limit Modal ──────────────────────────────────────────────────────────
function LimitModal({ error, onClose }) {
  if (!error) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card border-gold/30 max-w-sm w-full text-center space-y-4 py-8 px-6 animate-slide-up">
        <div className="text-3xl">☽</div>
        <h3 className="font-serif text-lg text-text-p">Weekly limit reached</h3>
        <p className="text-text-m text-sm font-sans leading-relaxed">
          You've used <span className="text-gold font-semibold">{error.used} of {error.limit}</span> free readings this week.
          Your limit resets on <span className="text-text-p">{error.resetsOn}</span>.
        </p>
        <p className="text-text-s text-xs font-sans">
          Cached readings you've already generated are always free to re-open.
        </p>
        <button onClick={onClose} className="btn-primary w-full mt-2">Got it</button>
      </div>
    </div>
  );
}

// ── Feature Popup ──────────────────────────────────────────────────────────────
function FeaturePopup({ feature, onStart, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card border-white/10 max-w-sm w-full space-y-4 py-8 px-6 animate-slide-up overflow-y-auto max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-m hover:text-text-p transition-colors w-7 h-7 flex items-center justify-center text-lg"
        >
          ✕
        </button>
        <div className="text-4xl leading-none" style={{ color: feature.color }}>{feature.glyph}</div>
        <h2 className="font-serif text-2xl text-text-p">{feature.title}</h2>
        <p className="text-text-s font-sans text-sm leading-relaxed">{feature.description}</p>
        <button onClick={onStart} className="btn-gold w-full mt-2">
          Start reading →
        </button>
      </div>
    </div>
  );
}

// ── Discover: Top 3 Cities ────────────────────────────────────────────────────
function DiscoverForm({ chart, onCitySelect, generatingCity, onLimitReached }) {
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
      if (err.limitReached) { onLimitReached?.(err); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
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

// ── Location Query Form ────────────────────────────────────────────────────────
function LocationForm({ chart, onReading, label, extraParams = {}, apiCall, submitLabel, onLimitReached }) {
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
      const reading = apiCall
        ? await apiCall({ chartId: chart.id, cityQuery: selected.displayName })
        : await api.readings.generate({ chartId: chart.id, cityQuery: selected.displayName, ...extraParams });
      onReading(reading);
    } catch (err) {
      if (err.limitReached) { onLimitReached?.(err); return; }
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-text-m text-xs font-sans leading-relaxed">
          {label || 'We\'ll read your birth chart against this city — covering love, career, inner life, vitality, and growth.'}
        </p>
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
            ? (submitLabel ? submitLabel(selected.displayName.split(',')[0]) : `✦ Read ${selected.displayName.split(',')[0]}`)
            : '✦ Search for a city'}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>
    </>
  );
}

// ── Solar Return full-page view ────────────────────────────────────────────────
const SR_THEMES = [
  { key: 'love',     icon: '♀', title: 'Love',     ratingKey: 'loveRating',     color: '#C0507A' },
  { key: 'career',   icon: '☉', title: 'Career',   ratingKey: 'careerRating',   color: '#D4AF37' },
  { key: 'inner',    icon: '☽', title: 'Inner',    ratingKey: 'innerRating',    color: '#5A8FC8' },
  { key: 'vitality', icon: '♂', title: 'Vitality', ratingKey: 'vitalityRating', color: '#E06840' },
  { key: 'growth',   icon: '♃', title: 'Growth',   ratingKey: 'growthRating',   color: '#9B6FBA' },
];

function SRMonthCard({ month, index }) {
  const [open, setOpen] = useState(false);
  const colors = ['#D4AF37','#C0507A','#5A8FC8','#E06840','#9B6FBA','#4BC9C8','#D4AF37','#C0507A','#5A8FC8','#E06840','#9B6FBA','#4BC9C8'];
  const color = colors[index % colors.length];
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-white/20"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="font-sans text-[10px] font-medium w-24 shrink-0" style={{ color }}>{month.month}</span>
        <span className="font-sans text-xs text-text-p flex-1 truncate">{month.theme}</span>
        <span className="text-text-s text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="px-4 pb-3 pt-0 border-t border-border">
          <p className="font-serif text-sm text-text-p leading-relaxed">{month.text}</p>
        </div>
      )}
    </button>
  );
}

function SolarReturnView({ charts, navigate, onBack, onLimitReached }) {
  const featureCfg = FEATURES.find(f => f.key === 'solar');
  const currentYear = new Date().getFullYear();
  const [chartId, setChartId] = useState(charts.length === 1 ? charts[0].id : null);
  const [year, setYear] = useState(currentYear);
  const [result, setResult] = useState(null);
  const [srData, setSrData] = useState(null);
  const [cityName, setCityName] = useState('');
  const resultRef = useRef(null);
  const chart = charts.find(c => c.id === chartId);
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  function handleResult(data) {
    setResult(data.reading);
    setSrData(data.srData);
    setCityName(data.city_name || '');
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl leading-none" style={{ color: featureCfg.color }}>{featureCfg.glyph}</span>
        <h1 className="font-serif text-3xl text-text-p">Birthday Reading</h1>
      </div>
      <p className="text-text-m text-sm font-sans mb-7">Your coming year, read from any city.</p>

      <div className="card space-y-6">
        <div className="pl-3 border-l-2" style={{ borderColor: featureCfg.color }}>
          <p className="text-xs font-sans text-text-s leading-relaxed">
            Each year the Sun returns to its exact natal position — and the chart cast for that moment
            reveals your entire coming year. The city you choose changes everything: where you are
            on your birthday shapes the whole year ahead.
          </p>
        </div>

        {charts.length > 1 && (
          <div>
            <p className="label">Whose chart?</p>
            <div className="flex flex-wrap gap-1.5">
              {charts.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setChartId(c.id); setResult(null); setSrData(null); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                    chartId === c.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                  }`}
                >
                  <span className="text-[10px]">✦</span>{c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="label">Birthday Year</p>
          <div className="flex gap-2 flex-wrap">
            {years.map(y => (
              <button
                key={y}
                onClick={() => { setYear(y); setResult(null); setSrData(null); }}
                className="px-5 py-2 rounded-lg text-sm font-sans border transition-all duration-150"
                style={{
                  borderColor:     year === y ? featureCfg.color : 'rgba(255,255,255,0.12)',
                  color:           year === y ? featureCfg.color : 'rgba(255,255,255,0.45)',
                  backgroundColor: year === y ? `${featureCfg.color}18` : 'transparent',
                  boxShadow:       year === y ? `0 0 0 1px ${featureCfg.color}40` : 'none',
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {!chart && charts.length > 1 && (
          <p className="text-text-m text-sm font-sans italic">Select a chart above to continue.</p>
        )}
        {chart && (
          <LocationForm
            chart={chart}
            label={`Which city will you be in for your ${year} birthday?`}
            apiCall={({ chartId: cid, cityQuery }) => api.solarReturns.generate({ chartId: cid, cityQuery, targetYear: year })}
            submitLabel={city => `☉ Read ${city} Birthday Reading ${year}`}
            onReading={handleResult}
            onLimitReached={onLimitReached}
          />
        )}
      </div>

      {result && (
        <div ref={resultRef} className="mt-6 space-y-4 animate-fade-in">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl text-text-p">{cityName?.split(',')[0]}</h2>
            <span className="text-text-m text-sm font-sans">{year} Birthday Reading</span>
          </div>

          {srData?.srLocalDate && (
            <p className="text-text-m text-xs font-sans">
              Birthday date: <span className="text-gold">{srData.srLocalDate}</span>
            </p>
          )}

          <div className="relative rounded-xl border border-gold/20 bg-gradient-to-br from-gold/8 via-card to-card px-4 py-4 overflow-hidden">
            <span className="absolute top-2 right-3 text-gold text-5xl font-serif pointer-events-none select-none leading-none opacity-[0.06]">☀</span>
            {result.yearTheme && (
              <p className="font-sans text-[10px] uppercase tracking-widest text-gold/80 mb-1">{result.yearTheme}</p>
            )}
            {result.overallRating != null && (
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className="text-base" style={{ color: '#D4AF37', opacity: n <= result.overallRating ? 1 : 0.2 }}>★</span>
                ))}
              </div>
            )}
            <p className="font-serif text-base text-text-p leading-relaxed relative z-10">{result.overview}</p>
          </div>

          {result.cost && (
            <div className="rounded-xl border border-border bg-card overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/70" />
              <div className="px-4 py-3 pl-5">
                <p className="font-sans text-xs text-text-m mb-1">What it costs you</p>
                <p className="font-serif text-sm text-text-p leading-relaxed">{result.cost}</p>
              </div>
            </div>
          )}

          {result.months && result.months.length > 0 && (
            <div>
              <p className="font-sans text-[10px] uppercase tracking-widest text-text-s mb-3">Month by Month</p>
              <div className="space-y-2">
                {result.months.map((m, i) => (
                  <SRMonthCard key={i} month={m} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Travel Transits full-page view ─────────────────────────────────────────────
const TRANSIT_ENERGY_STYLES = {
  high:   { label: '⚡ High activation', cls: 'text-gold' },
  medium: { label: '◈ Medium activation', cls: 'text-violet' },
  low:    { label: '· Low activation', cls: 'text-text-m' },
};

function TransitsView({ charts, navigate, onBack, onLimitReached }) {
  const featureCfg = FEATURES.find(f => f.key === 'transits');
  const [chartId, setChartId] = useState(charts.length === 1 ? charts[0].id : null);
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState(null);
  const [cityName, setCityName] = useState('');
  const resultRef = useRef(null);
  const chart = charts.find(c => c.id === chartId);

  function handleResult(data) {
    setResult(data.reading);
    setCityName(data.city_name || '');
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl leading-none" style={{ color: featureCfg.color }}>{featureCfg.glyph}</span>
        <h1 className="font-serif text-3xl text-text-p">Travel Reading</h1>
      </div>
      <p className="text-text-m text-sm font-sans mb-7">How will your next trip hit your chart?</p>

      <div className="card space-y-6">
        <div className="pl-3 border-l-2" style={{ borderColor: featureCfg.color }}>
          <p className="text-xs font-sans text-text-s leading-relaxed">
            The planets move through your chart differently depending on where you are on Earth.
            Enter your destination and travel dates — we'll show how this trip activates your natal
            chart and what the journey is really for.
          </p>
        </div>

        {charts.length > 1 && (
          <div>
            <p className="label">Whose chart?</p>
            <div className="flex flex-wrap gap-1.5">
              {charts.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setChartId(c.id); setResult(null); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                    chartId === c.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                  }`}
                >
                  <span className="text-[10px]">✦</span>{c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="label">Travel Dates</p>
          <div className="space-y-3">
            <div>
              <p className="text-text-m text-[10px] font-sans uppercase tracking-wider mb-1.5">Arriving</p>
              <input
                type="date"
                className="input py-2 text-sm"
                min={today}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setResult(null); }}
              />
            </div>
            <div>
              <p className="text-text-m text-[10px] font-sans uppercase tracking-wider mb-1.5">Leaving</p>
              <input
                type="date"
                className="input py-2 text-sm"
                min={startDate || today}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setResult(null); }}
              />
            </div>
          </div>
        </div>

        {!chart && charts.length > 1 && (
          <p className="text-text-m text-sm font-sans italic">Select a chart above to continue.</p>
        )}
        {chart && (!startDate || !endDate) && (
          <p className="text-text-m text-sm font-sans italic">Enter your travel dates above to continue.</p>
        )}
        {chart && startDate && endDate && (
          <LocationForm
            chart={chart}
            label="Where are you travelling?"
            apiCall={({ chartId: cid, cityQuery }) => api.transits.generate({
              chartId: cid,
              cityQuery,
              startDate,
              endDate,
            })}
            submitLabel={city => `♃ Read my transits in ${city}`}
            onReading={handleResult}
            onLimitReached={onLimitReached}
          />
        )}
      </div>

      {result && (
        <div ref={resultRef} className="mt-6 space-y-4 animate-fade-in">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl text-text-p">{cityName?.split(',')[0]}</h2>
            {startDate && endDate && (
              <span className="text-text-m text-sm font-sans">
                {new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="relative rounded-xl border border-violet/20 bg-violet/5 px-4 py-4 overflow-hidden">
            <span className="absolute top-2 right-3 text-violet text-5xl font-serif pointer-events-none select-none leading-none opacity-[0.06]">◎</span>
            {result.tripEnergy && TRANSIT_ENERGY_STYLES[result.tripEnergy] && (
              <p className={`text-[10px] font-sans uppercase tracking-widest mb-2 ${TRANSIT_ENERGY_STYLES[result.tripEnergy].cls}`}>
                {TRANSIT_ENERGY_STYLES[result.tripEnergy].label}
              </p>
            )}
            <p className="font-serif text-base text-text-p leading-relaxed relative z-10">{result.overview}</p>
          </div>

          {result.timing && (
            <p className="text-text-s font-sans text-xs italic px-1">{result.timing}</p>
          )}

          {result.highlights?.length > 0 && (
            <div className="space-y-3">
              {result.highlights.map((h, i) => (
                <div key={i} className="rounded-lg border border-border bg-nebula px-4 py-3">
                  <p className="font-sans text-xs font-semibold text-text-p mb-1">{h.title}</p>
                  <p className="font-serif text-sm text-text-s leading-relaxed">{h.text}</p>
                </div>
              ))}
            </div>
          )}

          {result.watchFor && (
            <div className="rounded-lg border border-border/60 bg-nebula px-4 py-3">
              <p className="text-text-m text-[10px] font-sans uppercase tracking-widest mb-1">Watch for</p>
              <p className="font-serif text-sm text-text-s leading-relaxed italic">{result.watchFor}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── City Reading full-page view ────────────────────────────────────────────────
function CityReadingView({ charts, navigate, onBack, onLimitReached }) {
  const featureCfg = FEATURES.find(f => f.key === 'city');
  const [chartId, setChartId] = useState(charts.length === 1 ? charts[0].id : null);
  const chart = charts.find(c => c.id === chartId);

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl leading-none" style={{ color: featureCfg.color }}>{featureCfg.glyph}</span>
        <h1 className="font-serif text-3xl text-text-p">City Reading</h1>
      </div>
      <p className="text-text-m text-sm font-sans mb-7">Any city on Earth, read personally for you.</p>

      <div className="card space-y-6">
        <div className="pl-3 border-l-2" style={{ borderColor: featureCfg.color }}>
          <p className="text-xs font-sans text-text-s leading-relaxed">
            Your birth chart has specific things to say about every city on Earth. Enter any place —
            where you live, somewhere you're moving to, or a city that's been calling you — and we'll
            read it against your natal chart across love, career, inner life, vitality, and growth.
          </p>
        </div>

        {charts.length > 1 && (
          <div>
            <p className="label">Whose chart?</p>
            <div className="flex flex-wrap gap-1.5">
              {charts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setChartId(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                    chartId === c.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                  }`}
                >
                  <span className="text-[10px]">✦</span>{c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!chart && charts.length > 1 && (
          <p className="text-text-m text-sm font-sans italic">Select a chart above to continue.</p>
        )}

        {chart && (
          <LocationForm
            chart={chart}
            onReading={r => navigate(`/reading/${r.id}`)}
            onLimitReached={onLimitReached}
          />
        )}
      </div>
    </div>
  );
}

// ── Best Places (Discover) full-page view ──────────────────────────────────────
function DiscoverView({ charts, navigate, onBack, onLimitReached }) {
  const featureCfg = FEATURES.find(f => f.key === 'discover');
  const [chartId, setChartId] = useState(charts.length === 1 ? charts[0].id : null);
  const [generatingCity, setGeneratingCity] = useState(null);
  const chart = charts.find(c => c.id === chartId);

  async function handleDiscoverSelect(cityName, intent) {
    if (!chart) return;
    setGeneratingCity(cityName);
    try {
      const reading = await api.readings.generate({
        chartId: chart.id,
        cityQuery: cityName,
        intent: intent || undefined,
      });
      navigate(`/reading/${reading.id}`);
    } catch (err) {
      if (err.limitReached) { onLimitReached?.(err); }
      else console.error(err);
    } finally {
      setGeneratingCity(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl leading-none" style={{ color: featureCfg.color }}>{featureCfg.glyph}</span>
        <h1 className="font-serif text-3xl text-text-p">Best Places for You</h1>
      </div>
      <p className="text-text-m text-sm font-sans mb-7">Find where your stars align.</p>

      <div className="card space-y-6">
        <div className="pl-3 border-l-2" style={{ borderColor: featureCfg.color }}>
          <p className="text-xs font-sans text-text-s leading-relaxed">
            Tell us what you're looking for — love, career, a fresh start — and we'll scan cities
            worldwide to find where your chart lights up most. Real cities, ranked for your chart specifically.
          </p>
        </div>

        {charts.length > 1 && (
          <div>
            <p className="label">Whose chart?</p>
            <div className="flex flex-wrap gap-1.5">
              {charts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setChartId(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                    chartId === c.id ? 'border-teal bg-teal/15 text-teal' : 'border-border text-text-s hover:border-teal/40 hover:text-text-p'
                  }`}
                >
                  <span className="text-[10px]">◉</span>{c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!chart && charts.length > 1 && (
          <p className="text-text-m text-sm font-sans italic">Select a chart above to continue.</p>
        )}

        {chart && (
          <DiscoverForm
            chart={chart}
            onCitySelect={handleDiscoverSelect}
            generatingCity={generatingCity}
          />
        )}
      </div>
    </div>
  );
}

// ── Partner Reading full-page view ─────────────────────────────────────────────
function PartnerReadingView({ charts, navigate, onBack, onLimitReached }) {
  const featureCfg = FEATURES.find(f => f.key === 'partner');
  const [chartId1, setChartId1] = useState(charts.length >= 1 ? charts[0].id : null);
  const [chartId2, setChartId2] = useState(charts.length >= 2 ? charts[1].id : null);
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
    if (!selected || !chartId1 || !chartId2) return;
    setError('');
    setLoading(true);
    try {
      const reading = await api.partner.generate({ chartId1, chartId2, cityQuery: selected.displayName });
      navigate(`/reading/${reading.id}`);
    } catch (err) {
      if (err.limitReached) { onLimitReached?.(err); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const chart1 = charts.find(c => c.id === chartId1);
  const chart2 = charts.find(c => c.id === chartId2);

  return (
    <div className="animate-fade-in">
      {loading && selected && <GlobeLoader cityName={selected.displayName} lat={selected.lat} lng={selected.lng} />}
      <button onClick={onBack} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl leading-none" style={{ color: featureCfg.color }}>{featureCfg.glyph}</span>
        <h1 className="font-serif text-3xl text-text-p">Partner Reading</h1>
      </div>
      <p className="text-text-m text-sm font-sans mb-7">How does a city land for two people together?</p>

      <div className="card space-y-6">
        <div className="pl-3 border-l-2" style={{ borderColor: featureCfg.color }}>
          <p className="text-xs font-sans text-text-s leading-relaxed">
            Enter a city and we'll read it for both charts together — covering love, shared purpose,
            and what the place asks of you as a pair.
          </p>
        </div>

        {charts.length < 2 && (
          <p className="text-text-m text-sm font-sans italic">
            You need at least two charts for this feature. Add another in the <span className="text-gold">Charts</span> tab.
          </p>
        )}

        {charts.length >= 2 && (
          <>
            <div>
              <p className="label">First chart</p>
              <div className="flex flex-wrap gap-1.5">
                {charts.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setChartId1(c.id); if (chartId2 === c.id) setChartId2(null); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                      chartId1 === c.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                    }`}
                  >
                    <span className="text-[10px]">✦</span>{c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Second chart</p>
              <div className="flex flex-wrap gap-1.5">
                {charts.filter(c => c.id !== chartId1).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChartId2(c.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                      chartId2 === c.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                    }`}
                  >
                    <span className="text-[10px]">✦</span>{c.label}
                  </button>
                ))}
              </div>
            </div>

            {chart1 && chart2 && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-text-m text-xs font-sans leading-relaxed">
                  Which city are you reading for {chart1.label} & {chart2.label}?
                </p>
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
                  disabled={loading || !selected}
                >
                  {selected
                    ? `⊕ Read ${selected.displayName.split(',')[0]} for both`
                    : '⊕ Search for a city'}
                </button>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Chapter Planner full-page view ────────────────────────────────────────────
function OccasionView({ charts, navigate, onBack, onLimitReached }) {
  const featureCfg = FEATURES.find(f => f.key === 'occasion');
  const [chartId, setChartId] = useState(charts.length === 1 ? charts[0].id : null);
  const [occasion, setOccasion] = useState(null);
  const [region, setRegion] = useState('worldwide');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [generatingCity, setGeneratingCity] = useState(null);
  const [error, setError] = useState('');
  const [nudge, setNudge] = useState(false);
  const chart = charts.find(c => c.id === chartId);

  async function handleFind() {
    if (!occasion?.trim()) {
      setNudge(true);
      setTimeout(() => setNudge(false), 2000);
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const data = await api.topCities.find({ chartId: chart.id, intent: occasion, region });
      setResults(data.cities);
    } catch (err) {
      if (err.limitReached) { onLimitReached?.(err); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCitySelect(cityName) {
    if (!chart) return;
    setGeneratingCity(cityName);
    try {
      const reading = await api.readings.generate({
        chartId: chart.id,
        cityQuery: cityName,
        intent: occasion || undefined,
      });
      navigate(`/reading/${reading.id}`);
    } catch (err) {
      if (err.limitReached) { onLimitReached?.(err); }
      else console.error(err);
    } finally {
      setGeneratingCity(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl leading-none" style={{ color: featureCfg.color }}>{featureCfg.glyph}</span>
        <h1 className="font-serif text-3xl text-text-p">Chapter Planner</h1>
      </div>
      <p className="text-text-m text-sm font-sans mb-7">Find the cities that match this chapter of your life.</p>

      <div className="card space-y-6">
        <div className="pl-3 border-l-2" style={{ borderColor: featureCfg.color }}>
          <p className="text-xs font-sans text-text-s leading-relaxed">
            Tell us what you're navigating and we'll find the cities that hold the right energy for it.
          </p>
        </div>

        {charts.length > 1 && (
          <div>
            <p className="label">Whose chart?</p>
            <div className="flex flex-wrap gap-1.5">
              {charts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setChartId(c.id); setResults(null); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                    chartId === c.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                  }`}
                >
                  <span className="text-[10px]">✦</span>{c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-text-m text-xs font-sans uppercase tracking-wider mb-2">What are you navigating?</p>
          <div className="flex flex-wrap gap-1.5">
            {OCCASIONS.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => { setOccasion(o); setResults(null); }}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-sans border transition-all duration-150 ${
                  occasion === o
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-border text-text-s hover:border-gold/40 hover:text-text-p'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

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

        {!chart && charts.length > 1 && (
          <p className="text-text-m text-sm font-sans italic">Select a chart above to continue.</p>
        )}

        {chart && (
          <button
            onClick={handleFind}
            disabled={loading}
            className="btn-gold w-full py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Spinner size="sm" />
                Searching for cities…
              </span>
            ) : (
              '✶ Find my cities'
            )}
          </button>
        )}

        {nudge && <p className="text-gold text-xs font-sans text-center animate-fade-in">↑ Choose a chapter first</p>}
        {error && <p className="text-red-400 text-xs">{error}</p>}

        {results && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-text-m text-xs font-sans uppercase tracking-wider">
              Top cities for "{occasion}"
            </p>
            {results.map((city, i) => (
              <div key={i} className="rounded-xl border border-border bg-nebula px-4 py-4 hover:border-gold/30 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-serif text-base text-text-p">{city.cityName}</h4>
                  <span className="text-gold text-xs font-sans shrink-0 mt-0.5">#{i + 1}</span>
                </div>
                <p className="font-serif text-sm text-text-p leading-relaxed mb-2">"{city.hook}"</p>
                <p className="font-sans text-xs text-text-s leading-relaxed mb-2">{city.why}</p>
                {city.cost && (
                  <div className="mb-3 relative pl-3 border-l-2 border-amber-400/60">
                    <p className="font-sans text-[10px] text-text-m uppercase tracking-wider mb-0.5">What it costs you</p>
                    <p className="font-sans text-xs text-text-s leading-relaxed">{city.cost}</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-serif text-xs text-gold italic flex-1">{city.verdict}</p>
                  <button
                    onClick={() => handleCitySelect(city.cityName)}
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
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const native = useNative();
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home');
  const [allReadings, setAllReadings] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapChartId, setMapChartId] = useState('all');
  const [mapLines, setMapLines] = useState(null);
  const [mapLinesLoading, setMapLinesLoading] = useState(false);
  const [limitError, setLimitError] = useState(null);
  const [pendingFeature, setPendingFeature] = useState(null);

  useEffect(() => {
    api.charts.list().then(setCharts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view === 'map' && allReadings.length === 0) {
      setMapLoading(true);
      api.readings.all().then(setAllReadings).catch(console.error).finally(() => setMapLoading(false));
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'map') return;

    if (mapChartId !== 'all') {
      setMapLinesLoading(true);
      api.charts.lines(mapChartId)
        .then(setMapLines)
        .catch(() => setMapLines(null))
        .finally(() => setMapLinesLoading(false));
    } else if (charts.length === 0) {
      setMapLines(null);
    } else if (charts.length === 1) {
      setMapLinesLoading(true);
      api.charts.lines(charts[0].id)
        .then(setMapLines)
        .catch(() => setMapLines(null))
        .finally(() => setMapLinesLoading(false));
    } else {
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

  function handleFeatureClick(key) {
    setView(key);
  }

  function goHome() {
    setView('home');
  }

  return (
    <div className={`min-h-screen px-4 ${native ? 'pt-6 pb-28' : 'pt-20 pb-16'}`}>
      <LimitModal error={limitError} onClose={() => setLimitError(null)} />

      {pendingFeature && (
        <FeaturePopup
          feature={pendingFeature}
          onStart={() => { handleFeatureClick(pendingFeature.key); setPendingFeature(null); }}
          onClose={() => setPendingFeature(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">

        {/* ── MAP VIEW ── */}
        {view === 'map' && (
          <div className="animate-fade-in">
            <button onClick={goHome} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
              ← Back
            </button>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="font-serif text-3xl text-text-p">World Map</h1>
                <p className="text-text-m text-sm font-sans mt-1">All your cities on one canvas.</p>
              </div>
            </div>

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

        {/* ── CITY READING VIEW ── */}
        {view === 'city' && (
          <CityReadingView charts={charts} navigate={navigate} onBack={goHome} onLimitReached={setLimitError} />
        )}

        {/* ── DISCOVER VIEW ── */}
        {view === 'discover' && (
          <DiscoverView charts={charts} navigate={navigate} onBack={goHome} onLimitReached={setLimitError} />
        )}

        {/* ── SOLAR RETURN VIEW ── */}
        {view === 'solar' && (
          <SolarReturnView charts={charts} navigate={navigate} onBack={goHome} onLimitReached={setLimitError} />
        )}

        {/* ── TRAVEL TRANSITS VIEW ── */}
        {view === 'transits' && (
          <TransitsView charts={charts} navigate={navigate} onBack={goHome} onLimitReached={setLimitError} />
        )}

        {/* ── WEEKLY VIEW ── */}
        {view === 'weekly' && (
          <div className="animate-fade-in">
            <button onClick={goHome} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-6 flex items-center gap-1">
              ← Back
            </button>
            <div className="mb-6">
              <h1 className="font-serif text-3xl text-text-p">This Week</h1>
              <p className="text-text-m text-sm font-sans mt-1">A fresh reading every week, tied to where you actually are.</p>
            </div>
            <WeeklyReading charts={charts} onLimitReached={setLimitError} />
          </div>
        )}

        {/* ── PARTNER READING VIEW ── */}
        {view === 'partner' && (
          <PartnerReadingView charts={charts} navigate={navigate} onBack={goHome} onLimitReached={setLimitError} />
        )}

        {/* ── OCCASION PLANNER VIEW ── */}
        {view === 'occasion' && (
          <OccasionView charts={charts} navigate={navigate} onBack={goHome} onLimitReached={setLimitError} />
        )}

        {/* ── HOME VIEW ── */}
        {view === 'home' && (
          <div>
            {native && (
              <div className="mb-10">
                <Logo size={32} showWordmark />
              </div>
            )}

            <div className="mb-10">
              <h1 className="font-serif text-3xl text-text-p">
                {user?.name ? `${user.name.split(' ')[0]}'s readings` : 'Your readings'}
              </h1>
              <p className="text-text-m text-sm font-sans mt-1">Where do you want to explore?</p>
            </div>

            {loading && <div className="flex justify-center py-12"><Spinner /></div>}

            {!loading && charts.length === 0 && (
              <div className="card text-center py-14 border-gold/15">
                <div className="text-gold text-3xl mb-5">✦</div>
                <h2 className="font-serif text-2xl text-text-p mb-3">
                  Your chart is a map.<br />You haven't unfolded it yet.
                </h2>
                <p className="text-text-m font-sans text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                  Add your birth data and start exploring which cities are written into your chart.
                </p>
                <button onClick={() => navigate('/charts?new=true')} className="btn-gold">
                  Add my birth chart →
                </button>
              </div>
            )}

            {!loading && charts.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setPendingFeature(f)}
                    className="relative text-left p-4 rounded-xl border border-border bg-card hover:border-opacity-40 transition-all duration-200 group overflow-hidden flex flex-col"
                  >
                    <div
                      className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `radial-gradient(circle at 20% 20%, ${f.color}14 0%, transparent 70%)` }}
                    />
                    <div className="relative flex-1 flex flex-col gap-2">
                      <span className="text-base leading-none" style={{ color: f.color }}>{f.glyph}</span>
                      <p className="font-serif text-xl text-text-p leading-snug">{f.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
