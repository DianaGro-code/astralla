import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

const PLANET_GLYPHS = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇'
};
const PLANET_COLORS = {
  sun:'#FFD700', moon:'#C8C8D8', mercury:'#A8B8D0', venus:'#98D898',
  mars:'#FF7070', jupiter:'#D4C040', saturn:'#C8A070', uranus:'#60C8F0',
  neptune:'#6070C8', pluto:'#B88060'
};
const STRENGTH_STYLES = {
  exact:    'border-gold/60 bg-gold/10 text-gold',
  strong:   'border-violet/50 bg-violet/10 text-violet',
  moderate: 'border-teal/40 bg-teal/10 text-teal',
  mild:     'border-border bg-nebula text-text-s',
};
const STRENGTH_LABELS = {
  exact: 'Exact', strong: 'Strong', moderate: 'Moderate', mild: 'Mild'
};
const ANGLE_DESC = {
  MC: 'Midheaven', IC: 'Imum Coeli', AC: 'Ascendant', DC: 'Descendant'
};

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
  const style = STRENGTH_STYLES[inf.strength] || STRENGTH_STYLES.mild;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${style} transition-all`}>
      <div className="flex items-center gap-3">
        <PlanetBadge planet={inf.planet} />
        <div>
          <span className="font-sans text-sm font-medium">{inf.planetLabel}</span>
          <span className="text-text-m mx-1.5 text-xs">on</span>
          <span className="font-sans text-sm font-semibold">{inf.angle}</span>
          <span className="text-text-m ml-1 text-xs">({ANGLE_DESC[inf.angle]})</span>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="text-xs font-sans opacity-80">{inf.distance.toFixed(1)}° away</div>
        <div className={`text-xs font-sans font-semibold`}>{STRENGTH_LABELS[inf.strength]}</div>
      </div>
    </div>
  );
}

function ParanRow({ paran }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-violet/30 bg-violet/5">
      <div className="flex items-center gap-1.5 flex-1 flex-wrap">
        <PlanetBadge planet={paran.planetA} />
        <span className="font-sans text-sm font-medium" style={{ color: PLANET_COLORS[paran.planetA] }}>{paran.planetALabel}</span>
        <span className="text-text-m text-xs font-sans">{paran.angleA}</span>
        <span className="text-text-m mx-1 text-xs">/</span>
        <PlanetBadge planet={paran.planetB} />
        <span className="font-sans text-sm font-medium" style={{ color: PLANET_COLORS[paran.planetB] }}>{paran.planetBLabel}</span>
        <span className="text-text-m text-xs font-sans">{paran.angleB}</span>
      </div>
      <div className="text-right shrink-0 text-xs font-sans text-text-s">
        <div>{paran.paranLatitude.toFixed(1)}° lat</div>
        <div className="text-text-m">{paran.latDistance.toFixed(2)}° from city</div>
      </div>
    </div>
  );
}

const THEMES = [
  { key: 'love',     icon: '♀', title: 'Love & Relationships',    color: '#f9a8d4', border: 'border-pink-400/30',   bg: 'bg-pink-400/5'   },
  { key: 'career',   icon: '☉', title: 'Career & Calling',        color: '#D4AF37', border: 'border-gold/30',       bg: 'bg-gold/5'       },
  { key: 'inner',    icon: '☽', title: 'Inner Life & Home',       color: '#93c5fd', border: 'border-blue-300/30',   bg: 'bg-blue-400/5'   },
  { key: 'vitality', icon: '♂', title: 'Vitality & Identity',     color: '#fb923c', border: 'border-orange-400/30', bg: 'bg-orange-400/5' },
  { key: 'growth',   icon: '♃', title: 'Growth & Transformation', color: '#a78bfa', border: 'border-violet/30',     bg: 'bg-violet/5'     },
];

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`text-xs ${n <= value ? 'text-gold' : 'text-border'}`}>★</span>
      ))}
    </div>
  );
}

function ThemeSection({ theme, text, rating }) {
  return (
    <div className={`rounded-xl border ${theme.border} ${theme.bg} px-5 py-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" style={{ color: theme.color }}>{theme.icon}</span>
          <h3 className="font-serif text-base font-medium" style={{ color: theme.color }}>{theme.title}</h3>
        </div>
        {rating != null && <StarRating value={rating} />}
      </div>
      <p className="font-serif text-base text-text-p leading-relaxed font-light">{text}</p>
    </div>
  );
}

function ReadingText({ text }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-5">
      {paragraphs.map((para, i) => (
        <p key={i} className="font-serif text-lg text-text-p leading-relaxed font-light">
          {para}
        </p>
      ))}
    </div>
  );
}

export default function Reading() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  const RATING_KEYS = { love: 'loveRating', career: 'careerRating', inner: 'innerRating', vitality: 'vitalityRating', growth: 'growthRating' };

  const veryStrong = influences.filter(i => i.distance < 2);
  const strong     = influences.filter(i => i.distance >= 2 && i.distance < 5);
  const moderate   = influences.filter(i => i.distance >= 5 && i.distance < 10);
  const mild       = influences.filter(i => i.distance >= 10);

  return (
    <div className="min-h-screen pt-20 pb-20 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <button onClick={() => navigate('/dashboard')} className="text-text-m hover:text-gold transition-colors text-sm font-sans mb-8 flex items-center gap-1">
          ← Back to dashboard
        </button>

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-2 text-gold text-sm font-sans mb-2 uppercase tracking-widest">
            <span>✦</span>
            <span>Astrocartography Reading</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-text-p font-light leading-tight">
            {city_name.split(',')[0]}
          </h1>
          <p className="text-text-m font-sans text-sm mt-2">
            {city_name} · {city_lat?.toFixed(2)}°N, {city_lng?.toFixed(2)}°E
            <span className="mx-2">·</span>
            {new Date(created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>

        {/* Planetary Influences */}
        {influences.length > 0 && (
          <section className="mb-8 animate-fade-in">
            <h2 className="font-serif text-xl text-text-p mb-3 flex items-center gap-2">
              <span className="text-gold">✦</span> Active Lines
            </h2>
            <div className="space-y-2">
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
            </div>
          </section>
        )}

        {/* Parans */}
        {parans.length > 0 && (
          <section className="mb-8 animate-fade-in">
            <h2 className="font-serif text-xl text-text-p mb-3 flex items-center gap-2">
              <span className="text-violet">◈</span> Parans at this latitude
            </h2>
            <div className="space-y-2">
              {parans.map((p, i) => <ParanRow key={i} paran={p} />)}
            </div>
          </section>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-gold text-xl">✦</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* AI Reading */}
        <section className="animate-fade-in">
          <h2 className="font-serif text-xl text-text-p mb-5 flex items-center gap-2">
            <span className="text-gold">☉</span> The Reading
          </h2>
          {themes?.overview && (
            <div className="mb-6 rounded-xl border border-gold/20 bg-gold/5 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gold text-xs font-sans uppercase tracking-widest">Overall Vibe</span>
                {themes.overallRating != null && (
                  <div className="flex items-center gap-2">
                    <StarRating value={themes.overallRating} />
                    <span className="text-gold text-xs font-sans">{themes.overallRating}/5</span>
                  </div>
                )}
              </div>
              <p className="font-serif text-base text-text-p leading-relaxed font-light">{themes.overview}</p>
            </div>
          )}
          {themes ? (
            <div className="space-y-3">
              {THEMES.map(t => themes[t.key] && (
                <ThemeSection key={t.key} theme={t} text={themes[t.key]} rating={themes[RATING_KEYS[t.key]]} />
              ))}
            </div>
          ) : reading_text ? (
            <ReadingText text={reading_text} />
          ) : null}
        </section>

        {/* Footer note */}
        <p className="text-text-m text-xs font-sans text-center mt-12 pt-8 border-t border-border/30">
          Calculated using Jean Meeus astronomical algorithms · Interpreted by Claude AI
        </p>
      </div>
    </div>
  );
}
