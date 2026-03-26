import { useState, useContext } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  useMapContext,
} from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ── Planet config ──────────────────────────────────────────────────────────────
const PLANET_COLORS = {
  sun:     '#F5C518',
  moon:    '#9BB5CC',
  mercury: '#88E0A4',
  venus:   '#F4849A',
  mars:    '#F47A58',
  jupiter: '#E8A044',
  saturn:  '#8AB0D0',
  uranus:  '#48D8D8',
  neptune: '#8888F0',
  pluto:   '#C080C0',
};

const PLANET_GLYPHS = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

// Default: the personal + social planets most relevant for this audience
const DEFAULT_VISIBLE = new Set(['sun', 'moon', 'venus', 'mars', 'jupiter']);

// ── Reading pin helpers ────────────────────────────────────────────────────────
function ratingColor(r) {
  if (r >= 4.5) return '#B88FD8';
  if (r >= 3.5) return '#D4AF37';
  if (r >= 2.5) return '#3DBFB0';
  return '#7A8FA8';
}
function ratingLabel(r) {
  if (r >= 4.5) return 'Exceptional';
  if (r >= 3.5) return 'Strong';
  if (r >= 2.5) return 'Moderate';
  return 'Mild';
}

// ── Planetary line renderer ────────────────────────────────────────────────────
// Must be a child of ComposableMap so it can call useMapContext()
function PlanetLineLayer({ planetLines, visiblePlanets }) {
  const { path } = useMapContext();
  if (!planetLines || !path) return null;

  const elements = [];

  for (const pl of planetLines) {
    if (!visiblePlanets.has(pl.planet)) continue;
    const color = PLANET_COLORS[pl.planet];

    // MC — solid, full opacity (vertical meridian line)
    if (pl.mc !== null) {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[pl.mc, -85], [pl.mc, 85]] },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-MC`} d={d} stroke={color}
          strokeWidth={1.2} strokeOpacity={0.65} fill="none"
          vectorEffect="non-scaling-stroke" />
      );
    }

    // IC — dashed, lower opacity
    if (pl.ic !== null) {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[pl.ic, -85], [pl.ic, 85]] },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-IC`} d={d} stroke={color}
          strokeWidth={1} strokeOpacity={0.35} fill="none"
          strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      );
    }

    // AC — solid, curved rising line
    pl.ac.forEach((seg, i) => {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: seg },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-AC-${i}`} d={d} stroke={color}
          strokeWidth={1.2} strokeOpacity={0.65} fill="none"
          vectorEffect="non-scaling-stroke" />
      );
    });

    // DC — dashed, curved setting line
    pl.dc.forEach((seg, i) => {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: seg },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-DC-${i}`} d={d} stroke={color}
          strokeWidth={1} strokeOpacity={0.35} fill="none"
          strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      );
    });
  }

  return <g>{elements}</g>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WorldMap({ readings, onReadingClick, planetLines }) {
  const [tooltip, setTooltip]   = useState(null);
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });
  const [visible, setVisible]   = useState(DEFAULT_VISIBLE);

  // Deduplicate pins by city (keep highest-rated)
  const cityMap = {};
  for (const r of readings) {
    if (!r.city_lat || !r.city_lng) continue;
    const key = r.city_name;
    const existing = cityMap[key];
    const rating = r.themes?.overallRating ?? 0;
    if (!existing || rating > (existing.themes?.overallRating ?? 0)) cityMap[key] = r;
  }
  const pins = Object.values(cityMap);

  function togglePlanet(p) {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  const hasLines = planetLines && planetLines.length > 0;

  return (
    <div className="space-y-2">

      {/* ── Planet filter chips ── */}
      {hasLines && (
        <div className="flex flex-wrap gap-1.5">
          {planetLines.map(pl => {
            const on    = visible.has(pl.planet);
            const color = PLANET_COLORS[pl.planet];
            return (
              <button
                key={pl.planet}
                onClick={() => togglePlanet(pl.planet)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans border transition-all duration-150"
                style={{
                  borderColor:     on ? color : 'rgba(255,255,255,0.10)',
                  color:           on ? color : 'rgba(255,255,255,0.30)',
                  backgroundColor: on ? `${color}1A` : 'transparent',
                }}
              >
                <span>{PLANET_GLYPHS[pl.planet]}</span>
                <span>{pl.planetLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Map canvas ── */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-nebula" style={{ height: 380 }}>

        {/* Zoom controls */}
        <div className="absolute bottom-3 left-3 z-10 flex gap-1">
          {[
            { label: '+', fn: () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) })) },
            { label: '−', fn: () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) })) },
            { label: '⌂', fn: () => setPosition({ coordinates: [0, 20], zoom: 1 }) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="w-7 h-7 flex items-center justify-center bg-cosmos/90 backdrop-blur-sm border border-border rounded text-text-s text-sm hover:border-gold/40 hover:text-gold transition-colors font-sans"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pin score legend (only when no planet lines overlay) */}
        {!hasLines && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-cosmos/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5">
            <p className="text-text-m text-[10px] font-sans uppercase tracking-wider mb-0.5">Score</p>
            {[
              { color: '#B88FD8', label: 'Exceptional' },
              { color: '#D4AF37', label: 'Strong'      },
              { color: '#3DBFB0', label: 'Moderate'    },
              { color: '#7A8FA8', label: 'Mild'        },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-text-s text-[10px] font-sans">{label}</span>
              </div>
            ))}
          </div>
        )}

        <ComposableMap
          projection="geoNaturalEarth1"
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
          >
            {/* Countries */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1E2640"
                    stroke="#2D3655"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none', fill: '#252D4A' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Planetary lines (below pins) */}
            <PlanetLineLayer planetLines={planetLines} visiblePlanets={visible} />

            {/* City pins */}
            {pins.map(r => {
              const rating   = r.themes?.overallRating ?? 0;
              const color    = ratingColor(rating);
              const hovered  = tooltip?.reading?.id === r.id;
              return (
                <Marker
                  key={r.id}
                  coordinates={[r.city_lng, r.city_lat]}
                  onClick={() => onReadingClick(r.id)}
                  onMouseEnter={() => setTooltip({ reading: r })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={hovered ? 8 : 5}
                    fill={color}
                    fillOpacity={hovered ? 1 : 0.9}
                    stroke="#0D1225"
                    strokeWidth={1.5}
                    style={{ transition: 'r 0.15s' }}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover tooltip */}
        {tooltip && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-cosmos border border-border rounded-lg shadow-lg px-4 py-3 min-w-[180px] text-center">
              <p className="font-serif text-sm text-text-p font-medium">{tooltip.reading.city_name}</p>
              {tooltip.reading.themes?.overallRating != null && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ratingColor(tooltip.reading.themes.overallRating) }} />
                  <span className="text-text-s text-xs font-sans">
                    {ratingLabel(tooltip.reading.themes.overallRating)} · {tooltip.reading.themes.overallRating}/5
                  </span>
                </div>
              )}
              {tooltip.reading.themes?.verdict && (
                <p className="text-text-m text-xs font-serif italic mt-1">{tooltip.reading.themes.verdict}</p>
              )}
              <p className="text-gold text-xs font-sans mt-2">Click to open →</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {pins.length === 0 && !hasLines && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-text-m text-sm font-serif italic">
              Your cities will appear here as you explore them.
            </p>
          </div>
        )}
      </div>

      {/* ── Angle key ── */}
      {hasLines && visible.size > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-0.5 pt-0.5">
          {[
            { dash: false, label: 'MC · career & legacy'     },
            { dash: true,  label: 'IC · home & roots'        },
            { dash: false, label: 'AC · identity & vitality' },
            { dash: true,  label: 'DC · relationships'       },
          ].map(({ dash, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <svg width="18" height="6" className="shrink-0">
                <line x1="0" y1="3" x2="18" y2="3"
                  stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"
                  strokeDasharray={dash ? '3 3' : undefined} />
              </svg>
              <span className="text-[9px] font-sans text-text-m uppercase tracking-widest whitespace-nowrap">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
