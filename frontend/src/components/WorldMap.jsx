import { useState } from 'react';
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

// Per-chart accent colors for pin rings and line tinting
const CHART_COLORS = ['#C9A96E', '#4BC9C8', '#B08AE0', '#E06840', '#5A8FC8', '#E890A0'];

// ── Reading pin helpers ────────────────────────────────────────────────────────
function ratingColor(r) {
  if (r >= 4.5) return '#B88FD8';
  if (r >= 3.5) return '#C9A96E';
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
function PlanetLineLayer({ planetLines, focusedPlanet }) {
  const { path } = useMapContext();
  if (!planetLines || !path) return null;

  const elements = [];

  for (const pl of planetLines) {
    const color = PLANET_COLORS[pl.planet];

    const isFocused  = focusedPlanet === pl.planet;
    const isAnyFocus = focusedPlanet !== null;

    // Opacity: dimmed when something else is focused, boosted when this planet is focused
    const baseOpacity = isAnyFocus
      ? (isFocused ? 0.95 : 0.10)
      : (pl.chartIndex === 1 ? 0.5 : pl.chartIndex === 2 ? 0.4 : 0.7);
    const dashOpacity = isAnyFocus
      ? (isFocused ? 0.65 : 0.07)
      : baseOpacity * 0.55;

    // Stroke widths: thicker when focused
    const solidW = isFocused ? 4.5 : 3;
    const dashW  = isFocused ? 3   : 2;

    // MC — solid vertical meridian line
    if (pl.mc !== null) {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[pl.mc, -85], [pl.mc, 85]] },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-${pl.chartIndex ?? 0}-MC`} d={d}
          stroke={color} strokeWidth={solidW} strokeOpacity={baseOpacity} fill="none"
          strokeLinecap="round" />
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
        <path key={`${pl.planet}-${pl.chartIndex ?? 0}-IC`} d={d}
          stroke={color} strokeWidth={dashW} strokeOpacity={dashOpacity} fill="none"
          strokeDasharray="6 5" strokeLinecap="round" />
      );
    }

    // AC — solid curved rising line
    pl.ac.forEach((seg, i) => {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: seg },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-${pl.chartIndex ?? 0}-AC-${i}`} d={d}
          stroke={color} strokeWidth={solidW} strokeOpacity={baseOpacity} fill="none"
          strokeLinecap="round" />
      );
    });

    // DC — dashed curved setting line
    pl.dc.forEach((seg, i) => {
      const d = path({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: seg },
        properties: {},
      });
      if (d) elements.push(
        <path key={`${pl.planet}-${pl.chartIndex ?? 0}-DC-${i}`} d={d}
          stroke={color} strokeWidth={dashW} strokeOpacity={dashOpacity} fill="none"
          strokeDasharray="6 5" strokeLinecap="round" />
      );
    });
  }

  return <g>{elements}</g>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WorldMap({ readings, onReadingClick, planetLines, charts = [] }) {
  const [tooltip, setTooltip]     = useState(null);
  const [selected, setSelected]   = useState(null); // tap-selected pin (mobile popup)
  const [position, setPosition]   = useState({ coordinates: [0, 20], zoom: 1 });
  const [focusedPlanet, setFocusedPlanet] = useState(null);

  // Build chart color map: chartId → { color, label, index }
  const chartColorMap = {};
  charts.forEach((c, i) => {
    chartColorMap[c.id] = { color: CHART_COLORS[i % CHART_COLORS.length], label: c.label, index: i };
  });
  const multiChart = charts.length > 1;

  // Deduplicate pins by city (keep highest-rated per city per chart)
  // If multi-chart: keep one pin per city+chart combo
  // If single-chart: keep highest-rated per city
  const pinMap = {};
  for (const r of readings) {
    if (!r.city_lat || !r.city_lng) continue;
    const key = multiChart
      ? `${r.chart_id}::${r.city_name}`   // separate pins per chart
      : r.city_name;
    const existing = pinMap[key];
    const rating = r.themes?.overallRating ?? 0;
    if (!existing || rating > (existing.themes?.overallRating ?? 0)) pinMap[key] = r;
  }
  const pins = Object.values(pinMap);

  // For multi-chart: slightly offset pins for same city across charts so they don't perfectly overlap
  // Build a map of cityName → [readings] sorted by chartIndex
  const cityChartPins = {};
  if (multiChart) {
    for (const r of pins) {
      const city = r.city_name;
      if (!cityChartPins[city]) cityChartPins[city] = [];
      cityChartPins[city].push(r);
    }
  }

  // Clicking a planet chip focuses it (highlights it, dims others).
  // Clicking the focused planet again returns to all-equal visibility.
  function togglePlanet(p) {
    setFocusedPlanet(prev => (prev === p ? null : p));
  }

  const hasLines = planetLines && planetLines.length > 0;

  // Deduplicate planet chips by planet name (multiple charts may have same planet)
  const uniquePlanetChips = planetLines
    ? planetLines.filter((pl, i, arr) => arr.findIndex(x => x.planet === pl.planet) === i)
    : [];

  return (
    <div className="space-y-2">

      {/* ── Per-chart legend (only in multi-chart mode) ── */}
      {multiChart && charts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {charts.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full border-2 shrink-0"
                style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length], background: 'transparent' }}
              />
              <span className="font-sans text-[11px] text-text-s">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Planet filter chips ── */}
      {hasLines && (
        <div className="flex flex-wrap gap-1.5">
          {uniquePlanetChips.map(pl => {
            const color     = PLANET_COLORS[pl.planet];
            const isFocused = focusedPlanet === pl.planet;
            const isAny     = focusedPlanet !== null;
            const isDimmed  = isAny && !isFocused;
            return (
              <button
                key={pl.planet}
                onClick={() => togglePlanet(pl.planet)}
                title={isFocused ? 'Click to reset' : 'Click to highlight'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans border transition-all duration-200"
                style={{
                  borderColor:     isDimmed ? 'rgba(255,255,255,0.06)' : color,
                  color:           isDimmed ? 'rgba(255,255,255,0.20)' : color,
                  backgroundColor: isFocused ? `${color}28` : isDimmed ? 'transparent' : `${color}10`,
                  boxShadow:       isFocused ? `0 0 0 1px ${color}60` : 'none',
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
      <div className="relative rounded-xl overflow-hidden border border-border bg-nebula" style={{ height: '320px' }}>

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

        {/* Pin score legend (only when no planet lines overlay AND single-chart) */}
        {!hasLines && !multiChart && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-cosmos/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5">
            <p className="text-text-m text-[10px] font-sans uppercase tracking-wider mb-0.5">Score</p>
            {[
              { color: '#B88FD8', label: 'Exceptional' },
              { color: '#C9A96E', label: 'Strong'      },
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
          width={800}
          height={450}
          style={{ width: '100%', height: '100%', display: 'block' }}
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
            <PlanetLineLayer planetLines={planetLines} focusedPlanet={focusedPlanet} />

            {/* City pins */}
            {pins.map((r, pinIdx) => {
              const rating      = r.themes?.overallRating ?? 0;
              const fillColor   = ratingColor(rating);
              const hovered     = tooltip?.reading?.id === r.id;
              const isSelected  = selected?.reading?.id === r.id;
              const isActive    = hovered || isSelected;
              const chartInfo   = chartColorMap[r.chart_id];
              const ringColor   = multiChart && chartInfo ? chartInfo.color : '#0D1225';
              const ringWidth   = multiChart ? 2 : 1.5;

              // Offset same-city pins slightly so they're both visible
              let offsetLng = 0;
              let offsetLat = 0;
              if (multiChart) {
                const siblings = cityChartPins[r.city_name] || [];
                const pos      = siblings.indexOf(r);
                if (siblings.length > 1) {
                  offsetLng = (pos - (siblings.length - 1) / 2) * 1.5;
                }
              }

              return (
                <Marker
                  key={`${r.id}-${pinIdx}`}
                  coordinates={[r.city_lng + offsetLng, r.city_lat + offsetLat]}
                  onClick={() => setSelected(prev =>
                    prev?.reading?.id === r.id ? null : { reading: r, chartInfo }
                  )}
                  onMouseEnter={() => setTooltip({ reading: r, chartInfo })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={isActive ? 8 : 5}
                    fill={fillColor}
                    fillOpacity={isActive ? 1 : 0.9}
                    stroke={isActive && multiChart ? chartInfo?.color : ringColor}
                    strokeWidth={ringWidth}
                    style={{ transition: 'r 0.15s' }}
                  />
                  {/* Chart initial label on pin (multi-chart only) */}
                  {multiChart && chartInfo && (
                    <text
                      y={-8}
                      textAnchor="middle"
                      fontSize={6}
                      fontFamily="sans-serif"
                      fill={chartInfo.color}
                      fillOpacity={0.85}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {chartInfo.label.charAt(0).toUpperCase()}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover tooltip (desktop only — pointer-events-none so it doesn't block) */}
        {tooltip && !selected && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-cosmos border border-border rounded-lg shadow-lg px-4 py-3 min-w-[180px] text-center">
              <p className="font-serif text-sm text-text-p font-medium">{tooltip.reading.city_name.split(',')[0]}</p>
              {multiChart && tooltip.chartInfo && (
                <p
                  className="font-sans text-[10px] mt-0.5 font-medium uppercase tracking-wider"
                  style={{ color: tooltip.chartInfo.color }}
                >
                  {tooltip.chartInfo.label}
                </p>
              )}
              {tooltip.reading.themes?.overallRating != null && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ratingColor(tooltip.reading.themes.overallRating) }} />
                  <span className="text-text-s text-xs font-sans">
                    {ratingLabel(tooltip.reading.themes.overallRating)} · {tooltip.reading.themes.overallRating}/5
                  </span>
                </div>
              )}
              <p className="text-gold text-xs font-sans mt-2">Tap to open →</p>
            </div>
          </div>
        )}

        {/* Tap-selected popup — interactive, shown after first tap on a pin */}
        {selected && (
          <div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-cosmos border border-border rounded-lg shadow-lg px-4 py-3 min-w-[190px] text-center">
              {/* Dismiss × */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-2.5 text-text-m hover:text-text-s text-xs leading-none transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>

              <p className="font-serif text-sm text-text-p font-medium pr-4">
                {selected.reading.city_name.split(',')[0]}
              </p>

              {multiChart && selected.chartInfo && (
                <p
                  className="font-sans text-[10px] mt-0.5 font-medium uppercase tracking-wider"
                  style={{ color: selected.chartInfo.color }}
                >
                  {selected.chartInfo.label}
                </p>
              )}

              {selected.reading.themes?.overallRating != null && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ratingColor(selected.reading.themes.overallRating) }}
                  />
                  <span className="text-text-s text-xs font-sans">
                    {ratingLabel(selected.reading.themes.overallRating)} · {selected.reading.themes.overallRating}/5
                  </span>
                </div>
              )}

              <button
                onClick={() => onReadingClick(selected.reading.id)}
                className="mt-3 w-full py-1.5 rounded-md border border-gold/40 text-gold text-xs font-sans hover:bg-gold/10 hover:border-gold/70 active:bg-gold/20 transition-colors"
              >
                Open reading →
              </button>
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
      {hasLines && (
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
