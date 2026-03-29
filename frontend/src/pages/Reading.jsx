import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

// ── Today's year for Solar Return picker ──────────────────────────────────────
const THIS_YEAR = new Date().getFullYear();

const PLANET_GLYPHS = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇'
};
const PLANET_COLORS = {
  sun:'#D4A030', moon:'#9090A8', mercury:'#7AAAC8', venus:'#C0507A',
  mars:'#E04848', jupiter:'#C8B040', saturn:'#C09060', uranus:'#40B8C8',
  neptune:'#6080D8', pluto:'#A87060'
};
const STRENGTH_STYLES = {
  exact:    'border-gold/60 bg-gold/10 text-gold',
  strong:   'border-violet/50 bg-violet/10 text-violet',
  moderate: 'border-teal/40 bg-teal/10 text-teal',
  mild:     'border-border bg-nebula text-text-s',
};
const ANGLE_DESC = {
  MC: 'Midheaven', IC: 'Imum Coeli', AC: 'Ascendant', DC: 'Descendant'
};

const VERDICT = {
  5: { text: 'Go. Now.', color: 'text-gold' },
  4: { text: 'This place wants you here.', color: 'text-gold' },
  3: { text: 'Worth a long visit.', color: 'text-text-s' },
  2: { text: 'More neutral than charged.', color: 'text-text-m' },
  1: { text: 'The stars are quiet here.', color: 'text-text-m' },
};

const THEMES = [
  { key: 'love',     icon: '♀', title: 'Love & Relationships',    ratingKey: 'loveRating',     color: '#C0507A' },
  { key: 'career',   icon: '☉', title: 'Career & Calling',        ratingKey: 'careerRating',   color: '#D4AF37' },
  { key: 'inner',    icon: '☽', title: 'Inner Life & Home',       ratingKey: 'innerRating',    color: '#5A8FC8' },
  { key: 'vitality', icon: '♂', title: 'Vitality & Identity',     ratingKey: 'vitalityRating', color: '#E06840' },
  { key: 'growth',   icon: '♃', title: 'Growth & Transformation', ratingKey: 'growthRating',   color: '#9B6FBA' },
];

const DREAM_COMFORT = {
  dream:   {
    label: '⚡ Dream Destination',
    desc:  'Activating and electric — this city pushes you to grow, take risks, and show up fully.',
    cls:   'border-gold/40 bg-gold/10 text-gold',
  },
  comfort: {
    label: '☽ Home Away From Home',
    desc:  'Deeply settling — this city feels nurturing, familiar, and emotionally supportive.',
    cls:   'border-teal/40 bg-teal/10 text-teal',
  },
  both:    {
    label: '✦ Dream & Comfort',
    desc:  'Rare combination — both electrically activating and deeply grounding at once.',
    cls:   'border-violet/40 bg-violet/10 text-violet',
  },
};

function DreamComfortBadge({ type }) {
  const cfg = DREAM_COMFORT[type];
  if (!cfg) return null;
  return (
    <div className="mt-4 flex items-start gap-3">
      <span className={`inline-flex items-center shrink-0 px-3 py-1 rounded-full border text-xs font-sans ${cfg.cls}`}>
        {cfg.label}
      </span>
      <p className="text-text-m text-xs font-sans leading-relaxed pt-0.5">{cfg.desc}</p>
    </div>
  );
}

function PlanetBadge({ planet }) {
  const color = PLANET_COLORS[planet] || '#E8E4FF';
  const glyph = PLANET_GLYPHS[planet] || '●';
  return (
    <span className="inline-flex items-center gap-1 text-sm font-sans font-medium" style={{ color }}>
      <span>{glyph}</span>
    </span>
  );
}

function InfluenceRow({ inf }) {
  const color = PLANET_COLORS[inf.planet] || '#888';
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card relative overflow-hidden hover:border-gold/40 transition-all group">
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: color }} />
      <div className="flex items-center gap-3 pl-2 min-w-0">
        <span className="text-base font-sans shrink-0" style={{ color }}>{PLANET_GLYPHS[inf.planet] || '●'}</span>
        <div className="min-w-0">
          <span className="font-sans text-sm font-medium text-text-p group-hover:text-gold transition-colors">{inf.planetLabel}</span>
          <span className="text-text-m mx-1.5 text-xs">on</span>
          <span className="font-sans text-sm font-semibold text-text-p">{inf.angle}</span>
          <span className="hidden sm:inline text-text-m ml-1 text-xs">({ANGLE_DESC[inf.angle]})</span>
        </div>
      </div>
      <span className="text-xs font-sans text-text-m shrink-0 ml-2 tabular-nums">{inf.distance.toFixed(1)}°</span>
    </div>
  );
}

function ParanRow({ paran }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card relative overflow-hidden hover:border-gold/40 transition-all">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold/40" />
      <div className="flex items-center gap-1.5 flex-1 flex-wrap pl-2">
        <span className="font-sans text-sm font-medium" style={{ color: PLANET_COLORS[paran.planetA] }}>{PLANET_GLYPHS[paran.planetA]} {paran.planetALabel}</span>
        <span className="text-text-m text-xs font-sans">{paran.angleA}</span>
        <span className="text-text-m mx-1 text-xs">×</span>
        <span className="font-sans text-sm font-medium" style={{ color: PLANET_COLORS[paran.planetB] }}>{PLANET_GLYPHS[paran.planetB]} {paran.planetBLabel}</span>
        <span className="text-text-m text-xs font-sans">{paran.angleB}</span>
      </div>
      <span className="shrink-0 text-xs font-sans text-text-m tabular-nums">{paran.paranLatitude.toFixed(1)}°</span>
    </div>
  );
}

function StarRating({ value, size = 'sm', color }) {
  const cls = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          className={`${cls} transition-colors`}
          style={{ color: n <= value ? (color || '#D4AF37') : undefined, opacity: n <= value ? 1 : 0.2 }}
        >★</span>
      ))}
    </div>
  );
}

// Parse **bold** markers in AI-generated text
function inlineBold(text) {
  if (!text.includes('**')) return text;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-text-p">{part}</strong> : part
  );
}

// Split off the first sentence as a punchy lead line
function splitLead(text) {
  const m = text.match(/^(.*?[.!?])\s+([A-Z][\s\S]*)$/);
  if (m && m[1].length < 220 && m[2].length > 20) return [m[1].trim(), m[2].trim()];
  return [text, ''];
}

function ThemeSection({ theme, text, rating }) {
  const [lead, body] = splitLead(text);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-0.5" style={{ background: theme.color }} />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base" style={{ color: theme.color }}>{theme.icon}</span>
            <h3 className="font-sans text-xs uppercase tracking-widest font-medium" style={{ color: theme.color }}>{theme.title}</h3>
          </div>
          {rating != null && (
            <StarRating value={rating} size="sm" color={theme.color} />
          )}
        </div>
        <div className="h-px mb-3" style={{ background: theme.color, opacity: 0.4 }} />
        <p className="font-serif text-base text-text-p leading-relaxed font-semibold">{inlineBold(lead)}</p>
        {body && <p className="font-serif text-base text-text-s leading-relaxed font-light mt-2">{inlineBold(body)}</p>}
      </div>
    </div>
  );
}

function ScoreBar({ themes }) {
  if (!themes) return null;
  const items = THEMES.map(t => ({ ...t, rating: themes[t.ratingKey] })).filter(t => t.rating != null);
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 mt-4">
      {items.map(t => (
        <div key={t.key} className="flex items-center gap-2.5">
          <span className="text-sm w-4 shrink-0" style={{ color: t.color }}>{t.icon}</span>
          <span className="font-sans text-xs text-text-m w-20 shrink-0">{t.title.split(' ')[0]}</span>
          <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-1 rounded-full animate-bar-fill"
              style={{ width: `${(t.rating / 5) * 100}%`, background: t.color }}
            />
          </div>
          <span className="font-sans text-[10px] text-text-m w-4 text-right shrink-0">{t.rating}</span>
        </div>
      ))}
    </div>
  );
}

// ── Share Card ────────────────────────────────────────────────────────────────
const CARD_PLANET_COLORS = {
  sun:'#F5C518', moon:'#9BB5CC', mercury:'#88E0A4', venus:'#F4849A',
  mars:'#F47A58', jupiter:'#E8A044', saturn:'#8AB0D0',
  uranus:'#48D8D8', neptune:'#8888F0', pluto:'#C080C0',
};
const DREAM_COMFORT_CARD = {
  dream:   { label: '⚡ Dream Destination', color: '#D4AF37' },
  comfort: { label: '☽ Home Away From Home', color: '#4BC9C8' },
  both:    { label: '✦ Dream & Comfort', color: '#9B6FBA' },
};

function ShareCardModal({ reading, onClose }) {
  const { city_name, themes, influences = [] } = reading;
  const city    = city_name?.split(',')[0] || '';
  const country = city_name?.includes(',') ? city_name.split(',').slice(1).join(',').trim() : '';
  const overall = themes?.overallRating;
  const dc      = themes?.dreamOrComfort;

  const overview = themes?.overview || '';
  // Extract first complete sentence; fall back to word-boundary cut at 160 chars
  const sentenceMatch = overview.match(/^(.*?[.!?])(?:\s+[A-Z]|$)/);
  const quote = sentenceMatch && sentenceMatch[1].length <= 200
    ? sentenceMatch[1].trim()
    : overview.length > 160
      ? overview.slice(0, 158).replace(/\s+\S*$/, '') + '…'
      : overview;

  const verdictMap = {
    5: { text: 'Go. Now.',                   color: '#D4AF37' },
    4: { text: 'This place wants you here.',  color: '#D4AF37' },
    3: { text: 'Worth a long visit.',         color: '#8A8A9A' },
    2: { text: 'More neutral than charged.',  color: '#6A6A78' },
    1: { text: 'The stars are quiet here.',   color: '#6A6A78' },
  };
  const verdictEntry = overall != null ? verdictMap[Math.round(overall)] : null;

  const topLines = influences.slice(0, 3);

  async function handleShareLink() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${city} — Astralla`,
          text: themes?.overview || `My astrocartography reading for ${city}`,
          url,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    navigator.clipboard.writeText(url);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.08)', border: 'none',
          color: 'rgba(255,255,255,0.5)', fontSize: 20,
          width: 36, height: 36, borderRadius: '50%',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>

      {/* Card — fixed size so it screenshots consistently */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 320,
          background: 'linear-gradient(155deg, #0d0f1e 0%, #070810 55%, #0a0d1c 100%)',
          border: '1px solid rgba(212,175,55,0.20)',
          borderRadius: 20,
          padding: '28px 26px 24px',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          boxShadow: '0 0 80px rgba(212,175,55,0.07), 0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Ambient glow top-right — larger for more drama */}
        <div style={{
          position: 'absolute', top: -60, right: -40,
          width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Ambient glow bottom-left */}
        <div style={{
          position: 'absolute', bottom: -50, left: -30,
          width: 180, height: 180,
          background: 'radial-gradient(circle, rgba(80,90,200,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Brand label */}
        <p style={{
          color: '#D4AF37', fontSize: 9, letterSpacing: '0.28em',
          fontFamily: 'sans-serif', textTransform: 'uppercase',
          marginBottom: 24, opacity: 0.55,
        }}>
          ✦ &nbsp;Astralla
        </p>

        {/* City */}
        <h2 style={{
          fontFamily: 'Georgia, serif', fontSize: 46, fontWeight: 300,
          color: '#F4EFE8', lineHeight: 1.0, margin: 0, letterSpacing: '-0.5px',
        }}>
          {city}
        </h2>
        {country && (
          <p style={{
            fontFamily: 'sans-serif', fontSize: 11, color: '#48505E',
            marginTop: 5, marginBottom: 0, letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {country}
          </p>
        )}

        {/* Verdict — the emotional hook, given room to breathe */}
        {verdictEntry && (
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 22, fontStyle: 'italic',
            color: verdictEntry.color, marginTop: 22, marginBottom: 0,
            lineHeight: 1.2, letterSpacing: '-0.2px',
          }}>
            {verdictEntry.text}
          </p>
        )}

        {/* Stars — score sits quietly below the verdict */}
        {overall != null && (
          <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ fontSize: 13, color: '#D4AF37', opacity: n <= overall ? 1 : 0.15 }}>★</span>
            ))}
          </div>
        )}

        {/* Overview quote — flavor, not headline */}
        {quote && (
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 14, fontStyle: 'italic',
            color: '#8A8898', lineHeight: 1.65,
            borderLeft: '2px solid rgba(212,175,55,0.30)',
            paddingLeft: 13, marginTop: 22, marginBottom: 0,
          }}>
            "{quote}"
          </p>
        )}

        {/* Footer */}
        <p style={{
          fontFamily: 'sans-serif', fontSize: 9,
          color: 'rgba(212,175,55,0.28)',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginTop: 26, marginBottom: 0,
        }}>
          astralla.app
        </p>
      </div>

      {/* Instructions + share link button */}
      <p style={{
        color: 'rgba(255,255,255,0.3)', fontSize: 11,
        fontFamily: 'sans-serif', marginTop: 14, textAlign: 'center', lineHeight: 1.5,
      }}>
        Screenshot &amp; share · tap outside to close
      </p>
      <button
        onClick={handleShareLink}
        style={{
          marginTop: 10, padding: '8px 22px',
          background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 100, color: 'rgba(212,175,55,0.8)', fontSize: 12,
          fontFamily: 'sans-serif', cursor: 'pointer', letterSpacing: '0.04em',
        }}
      >
        ↑ Share link
      </button>
    </div>
  );
}

function ShareButton({ cityName, themes, onOpenCard }) {
  const [copied, setCopied] = useState(false);

  async function handleShareLink() {
    const city = cityName?.split(',')[0] || 'this city';
    const url  = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${city} — Astralla`,
          text:  themes?.overview || `My astrocartography reading for ${city}`,
          url,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={onOpenCard} className="btn-gold text-sm py-2 px-4">
        ✦ Share card
      </button>
      <button onClick={handleShareLink} className="btn-ghost text-sm py-2 px-4">
        {copied ? '✓ Link copied' : '↑ Share link'}
      </button>
    </div>
  );
}

function ReadingText({ text }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-5">
      {paragraphs.map((para, i) => {
        const [lead, body] = splitLead(para);
        return (
          <div key={i}>
            <p className="font-serif text-lg text-text-p leading-relaxed font-semibold">{inlineBold(lead)}</p>
            {body && <p className="font-serif text-lg text-text-s leading-relaxed font-light mt-2">{inlineBold(body)}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Mini spinner ──────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 text-gold" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Travel Transits Panel ─────────────────────────────────────────────────────
const ENERGY_STYLES = {
  high:   { label: '⚡ High activation', cls: 'text-gold' },
  medium: { label: '◈ Medium activation', cls: 'text-violet' },
  low:    { label: '· Low activation', cls: 'text-text-m' },
};

function TravelTransitsPanel({ chartId, cityName, defaultOpen = false }) {
  const [open,      setOpen]      = useState(defaultOpen);
  const panelRef = useRef(null);
  useEffect(() => {
    if (defaultOpen && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, []);
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null);

  async function handleGenerate() {
    if (!startDate || !endDate) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await api.transits.generate({
        chartId, cityQuery: cityName, startDate, endDate,
      });
      setResult(data.reading);
    } catch (err) {
      setError(err.message || 'Failed to generate transit reading');
    } finally {
      setLoading(false);
    }
  }

  const energy = result?.tripEnergy ? ENERGY_STYLES[result.tripEnergy] : null;

  return (
    <div ref={panelRef} className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-teal text-base">◎</span>
          <div>
            <h3 className="font-sans text-sm font-medium text-text-p group-hover:text-gold transition-colors">
              Travel Reading
            </h3>
            <p className="text-text-m text-xs font-sans mt-0.5">
              Enter your travel dates for a sky forecast
            </p>
          </div>
        </div>
        <span className={`text-text-m text-sm transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-border/60 pt-4 animate-fade-in">
          {/* Date pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-text-m text-[10px] font-sans uppercase tracking-widest block mb-1">Arriving</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-nebula border border-border rounded-lg px-3 py-2 text-text-p text-sm font-sans focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-text-m text-[10px] font-sans uppercase tracking-widest block mb-1">Leaving</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="w-full bg-nebula border border-border rounded-lg px-3 py-2 text-text-p text-sm font-sans focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !startDate || !endDate}
            className="btn-gold w-full text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Spinner /> Reading the sky…</> : 'Read these dates ✦'}
          </button>

          {error && (
            <p className="mt-3 text-red-400 text-xs font-sans">{error}</p>
          )}

          {result && (
            <div className="mt-5 space-y-4 animate-fade-in">
              {/* Overview */}
              <div className="relative rounded-xl border border-teal/20 bg-teal/5 px-4 py-4 overflow-hidden">
                <span className="absolute top-2 right-3 text-teal text-5xl font-serif pointer-events-none select-none leading-none opacity-[0.06]">◎</span>
                {energy && (
                  <p className={`text-[10px] font-sans uppercase tracking-widest mb-2 ${energy.cls}`}>{energy.label}</p>
                )}
                <p className="font-serif text-base text-text-p leading-relaxed">{result.overview}</p>
              </div>

              {/* Timing + watch for */}
              {result.timing && (
                <p className="text-text-s font-sans text-xs italic px-1">{result.timing}</p>
              )}

              {/* Highlights */}
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

              {/* Watch for */}
              {result.watchFor && (
                <div className="rounded-lg border border-border/60 bg-nebula px-4 py-3">
                  <p className="text-text-m text-[10px] font-sans uppercase tracking-widest mb-1">Watch for</p>
                  <p className="font-serif text-sm text-text-s leading-relaxed italic">{result.watchFor}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Solar Return Panel ────────────────────────────────────────────────────────
function SolarReturnPanel({ chartId, cityName, birthDate, defaultOpen = false }) {
  const [open,    setOpen]    = useState(defaultOpen);
  const panelRef = useRef(null);
  useEffect(() => {
    if (defaultOpen && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, []);
  const [year,    setYear]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState(null);
  const [srData,  setSrData]  = useState(null);

  async function handleGenerate(targetYear) {
    setYear(targetYear);
    setLoading(true); setError(''); setResult(null); setSrData(null);
    try {
      const data = await api.solarReturns.generate({
        chartId, cityQuery: cityName, targetYear,
      });
      setResult(data.reading);
      setSrData(data.srData);
    } catch (err) {
      setError(err.message || 'Failed to generate solar return reading');
    } finally {
      setLoading(false);
    }
  }

  const srThemes = [
    { key: 'love',     icon: '♀', title: 'Love',     ratingKey: 'loveRating',     color: '#C0507A' },
    { key: 'career',   icon: '☉', title: 'Career',   ratingKey: 'careerRating',   color: '#D4AF37' },
    { key: 'inner',    icon: '☽', title: 'Inner',    ratingKey: 'innerRating',    color: '#5A8FC8' },
    { key: 'vitality', icon: '♂', title: 'Vitality', ratingKey: 'vitalityRating', color: '#E06840' },
    { key: 'growth',   icon: '♃', title: 'Growth',   ratingKey: 'growthRating',   color: '#9B6FBA' },
  ];

  return (
    <div ref={panelRef} className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-gold text-base">☀</span>
          <div>
            <h3 className="font-sans text-sm font-medium text-text-p group-hover:text-gold transition-colors">
              Birthday Reading
            </h3>
            <p className="text-text-m text-xs font-sans mt-0.5">
              Spend your birthday here — see your year
            </p>
          </div>
        </div>
        <span className={`text-text-m text-sm transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-border/60 pt-4 animate-fade-in">
          <p className="text-text-m text-xs font-sans mb-3">
            The sky at the exact moment of your birthday, cast from this city, becomes your chart for the year. Pick a year to see it:
          </p>

          {/* Year buttons */}
          <div className="flex gap-2 mb-4">
            {[THIS_YEAR, THIS_YEAR + 1].map(y => (
              <button
                key={y}
                onClick={() => handleGenerate(y)}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-sans transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  year === y && loading
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border hover:border-gold/50 text-text-p hover:text-gold'
                }`}
              >
                {year === y && loading ? <><Spinner /> {y}…</> : `${y} ✦`}
              </button>
            ))}
          </div>

          {error && <p className="mt-1 mb-3 text-red-400 text-xs font-sans">{error}</p>}

          {srData && result && (
            <div className="space-y-4 animate-fade-in">
              {/* SR date */}
              <p className="text-text-m text-xs font-sans">
                Birthday date: <span className="text-gold">{srData.srLocalDate}</span>
              </p>

              {/* Year theme + overview */}
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

              {/* Cost */}
              {result.cost && (
                <div className="rounded-xl border border-border bg-card overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/70" />
                  <div className="px-4 py-3 pl-5">
                    <p className="font-sans text-xs text-text-m mb-1">What it costs you</p>
                    <p className="font-serif text-sm text-text-p leading-relaxed">{result.cost}</p>
                  </div>
                </div>
              )}

              {/* Score bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {srThemes.map(t => {
                  const r = result[t.ratingKey];
                  if (r == null) return null;
                  return (
                    <div key={t.key} className="flex items-center gap-2.5">
                      <span className="text-sm w-4 shrink-0" style={{ color: t.color }}>{t.icon}</span>
                      <span className="font-sans text-xs text-text-m w-14 shrink-0">{t.title}</span>
                      <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                        <div className="h-1 rounded-full animate-bar-fill" style={{ width: `${(r / 5) * 100}%`, background: t.color }} />
                      </div>
                      <span className="font-sans text-[10px] text-text-m w-4 text-right shrink-0">{r}</span>
                    </div>
                  );
                })}
              </div>

              {/* Theme texts */}
              <div className="space-y-3">
                {srThemes.map(t => result[t.key] && (
                  <div key={t.key} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="h-0.5" style={{ background: t.color }} />
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: t.color }}>{t.icon}</span>
                        <span className="font-sans text-xs uppercase tracking-widest font-medium" style={{ color: t.color }}>{t.title}</span>
                      </div>
                      <p className="font-serif text-sm text-text-p leading-relaxed">{result[t.key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Active Lines Accordion ────────────────────────────────────────────────────
function ActiveLinesAccordion({ influences, parans }) {
  const [open, setOpen] = useState(false);
  if (!influences.length && !parans.length) return null;

  const veryStrong = influences.filter(i => i.distance < 2);
  const strong     = influences.filter(i => i.distance >= 2 && i.distance < 5);
  const moderate   = influences.filter(i => i.distance >= 5 && i.distance < 10);
  const mild       = influences.filter(i => i.distance >= 10);
  const topLine    = influences[0];
  const countLabel = `${influences.length} line${influences.length === 1 ? '' : 's'}`;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-gold text-sm">✦</span>
          <div>
            <h3 className="font-sans text-sm font-medium text-text-p group-hover:text-gold transition-colors">
              Active lines
            </h3>
            <p className="text-text-m text-xs font-sans mt-0.5">
              {!open && topLine
                ? `${countLabel} · strongest: ${topLine.planetLabel} ${topLine.angle}`
                : 'Planetary lines from your birth chart that cross this city'}
            </p>
          </div>
        </div>
        <span className={`text-text-m text-sm transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border/60 pt-4 animate-fade-in space-y-2">
          {veryStrong.length > 0 && (
            <div>
              <p className="text-gold text-xs font-sans uppercase tracking-widest mb-1.5 pl-1">Exact · within 2°</p>
              {veryStrong.map((inf, i) => <InfluenceRow key={i} inf={inf} />)}
            </div>
          )}
          {strong.length > 0 && (
            <div className="mt-3">
              <p className="text-violet text-xs font-sans uppercase tracking-widest mb-1.5 pl-1">Strong · 2–5°</p>
              {strong.map((inf, i) => <InfluenceRow key={i} inf={inf} />)}
            </div>
          )}
          {moderate.length > 0 && (
            <div className="mt-3">
              <p className="text-teal text-xs font-sans uppercase tracking-widest mb-1.5 pl-1">Moderate · 5–10°</p>
              {moderate.map((inf, i) => <InfluenceRow key={i} inf={inf} />)}
            </div>
          )}
          {mild.length > 0 && (
            <div className="mt-3">
              <p className="text-text-m text-xs font-sans uppercase tracking-widest mb-1.5 pl-1">Mild · 10–15°</p>
              {mild.map((inf, i) => <InfluenceRow key={i} inf={inf} />)}
            </div>
          )}
          {parans.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/40">
              <p className="text-text-m text-xs font-sans uppercase tracking-widest mb-2 pl-1">Parans at this latitude</p>
              <div className="space-y-2">
                {parans.map((p, i) => <ParanRow key={i} paran={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── The Reading Accordion ─────────────────────────────────────────────────────
function TheReadingAccordion({ themes, readingText }) {
  const [open, setOpen] = useState(true);
  if (!themes && !readingText) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-gold text-sm">☉</span>
          <div>
            <h3 className="font-sans text-sm font-medium text-text-p group-hover:text-gold transition-colors">
              The reading
            </h3>
            {themes?.overallRating != null && (
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className="text-[10px]" style={{ color: '#D4AF37', opacity: n <= themes.overallRating ? 1 : 0.2 }}>★</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className={`text-text-m text-sm transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border/60 pt-4 animate-fade-in">
          {themes ? (
            <div className="space-y-3">
              {THEMES.map(t => themes[t.key] && (
                <ThemeSection key={t.key} theme={t} text={themes[t.key]} rating={themes[t.ratingKey]} />
              ))}
            </div>
          ) : readingText ? (
            <ReadingText text={readingText} />
          ) : null}
        </div>
      )}
    </div>
  );
}


export default function Reading() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const panelTarget = searchParams.get('panel'); // 'transits' | 'solar' | null
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    api.readings.get(id)
      .then(setReading)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center animate-fade-in">
          <div className="text-gold text-4xl mb-4 animate-pulse-slow">✦</div>
          <p className="text-text-s font-sans font-light">Reading the stars…</p>
        </div>
      </div>
    );
  }

  if (error || !reading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14 px-4">
        <div className="card text-center max-w-sm">
          <p className="text-red-400 font-sans text-sm mb-4">{error || 'Reading not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">← Back</button>
        </div>
      </div>
    );
  }

  const { influences = [], parans = [], themes, reading_text, city_name, city_lat, city_lng, created_at } = reading;

  const verdict = themes?.overallRating != null ? VERDICT[Math.round(themes.overallRating)] : null;

  return (
    <div className="min-h-screen pt-20 pb-20 px-4">
      {showCard && <ShareCardModal reading={reading} onClose={() => setShowCard(false)} />}
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <button onClick={() => navigate('/dashboard')} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-8 flex items-center gap-1">
          ← Back
        </button>

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-2 text-gold text-xs font-sans mb-3 uppercase tracking-widest">
            <span>✦</span>
            <span>Astralla Reading</span>
            <span className="text-text-m">·</span>
            <span className="text-text-m normal-case tracking-normal">{new Date(created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl text-text-p font-light leading-none mb-2">
            {city_name.split(',')[0]}
          </h1>
          {city_name.includes(',') && (
            <p className="text-text-m font-sans text-sm">{city_name.split(',').slice(1).join(',').trim()}</p>
          )}

          {/* Verdict + score bar */}
          {verdict && (
            <div className="mt-4">
              <p className={`font-serif text-xl font-light mb-2 ${verdict.color}`}>{verdict.text}</p>
              <StarRating value={themes.overallRating} size="lg" />
            </div>
          )}
          {themes && <ScoreBar themes={themes} />}
          {themes?.dreamOrComfort && themes.dreamOrComfort !== 'neither' && (
            <DreamComfortBadge type={themes.dreamOrComfort} />
          )}
        </div>

        {/* Overview — editorial pull quote */}
        {themes?.overview && (
          <div className="mb-6 relative pl-5 animate-fade-in">
            <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gold/60" />
            <p className="font-serif text-lg sm:text-xl text-text-p leading-relaxed font-light">{themes.overview}</p>
          </div>
        )}

        {/* Cost callout */}
        {themes?.cost && (
          <div className="mb-8 rounded-xl border border-border bg-card animate-fade-in overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/70" />
            <div className="px-5 py-4 pl-6">
              <p className="font-sans text-xs text-text-m mb-2">What it costs you</p>
              <p className="font-serif text-base text-text-p leading-relaxed">{themes.cost}</p>
            </div>
          </div>
        )}

        {/* Share */}
        <div className="flex gap-3 mb-6 animate-fade-in">
          <ShareButton cityName={city_name} themes={themes} onOpenCard={() => setShowCard(true)} />
        </div>

        {/* Active lines + Parans — collapsed by default */}
        <ActiveLinesAccordion influences={influences} parans={parans} />

        {/* The reading — open by default */}
        <TheReadingAccordion themes={themes} readingText={reading_text} />

        {/* Bottom share */}
        <div className="mt-12 flex justify-center">
          <ShareButton cityName={city_name} themes={themes} onOpenCard={() => setShowCard(true)} />
        </div>

      </div>
    </div>
  );
}
