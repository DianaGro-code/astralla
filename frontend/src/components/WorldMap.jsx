import { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Map overall rating (1-5) to a color
function ratingColor(rating) {
  if (rating >= 4.5) return '#B88FD8'; // violet — exceptional
  if (rating >= 3.5) return '#D4AF37'; // gold — strong
  if (rating >= 2.5) return '#3DBFB0'; // teal — moderate
  return '#7A8FA8';                    // muted blue — mild
}

function ratingLabel(rating) {
  if (rating >= 4.5) return 'Exceptional';
  if (rating >= 3.5) return 'Strong';
  if (rating >= 2.5) return 'Moderate';
  return 'Mild';
}

export default function WorldMap({ readings, onReadingClick }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, reading }
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });

  // Deduplicate by city (keep highest-rated if same city read multiple times)
  const cityMap = {};
  for (const r of readings) {
    if (!r.city_lat || !r.city_lng) continue;
    const key = r.city_name;
    const existing = cityMap[key];
    const rating = r.themes?.overallRating ?? 0;
    if (!existing || rating > (existing.themes?.overallRating ?? 0)) {
      cityMap[key] = r;
    }
  }
  const pins = Object.values(cityMap);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-nebula">
      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-cosmos/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5">
        <p className="text-text-m text-xs font-sans uppercase tracking-wider mb-1">Score</p>
        {[
          { color: '#B88FD8', label: 'Exceptional (4.5+)' },
          { color: '#D4AF37', label: 'Strong (3.5+)' },
          { color: '#3DBFB0', label: 'Moderate (2.5+)' },
          { color: '#7A8FA8', label: 'Mild' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-text-s text-xs font-sans">{label}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-1">
        {[
          { label: '+', action: () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) })) },
          { label: '−', action: () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) })) },
          { label: '⌂', action: () => setPosition({ coordinates: [0, 20], zoom: 1 }) },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-7 h-7 flex items-center justify-center bg-cosmos/90 backdrop-blur-sm border border-border rounded text-text-s text-sm hover:border-gold/40 hover:text-gold transition-colors font-sans"
          >
            {label}
          </button>
        ))}
      </div>

      <ComposableMap
        projection="geoNaturalEarth1"
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={setPosition}
        >
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

          {pins.map(r => {
            const rating = r.themes?.overallRating ?? 0;
            const color = ratingColor(rating);
            const isHovered = tooltip?.reading?.id === r.id;
            return (
              <Marker
                key={r.id}
                coordinates={[r.city_lng, r.city_lat]}
                onClick={() => onReadingClick(r.id)}
                onMouseEnter={(e) => {
                  setTooltip({ reading: r });
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={isHovered ? 9 : 6}
                  fill={color}
                  fillOpacity={isHovered ? 1 : 0.9}
                  stroke="#0D1225"
                  strokeWidth={1.5}
                  style={{ transition: 'r 0.15s' }}
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="bg-cosmos border border-border rounded-lg shadow-lg px-4 py-3 min-w-[180px] text-center">
            <p className="font-serif text-sm text-text-p font-medium">{tooltip.reading.city_name}</p>
            {tooltip.reading.themes?.overallRating != null && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ratingColor(tooltip.reading.themes.overallRating) }}
                />
                <span className="text-text-s text-xs font-sans">
                  {ratingLabel(tooltip.reading.themes.overallRating)} · {tooltip.reading.themes.overallRating}/5
                </span>
              </div>
            )}
            {tooltip.reading.themes?.verdict && (
              <p className="text-text-m text-xs font-serif italic mt-1">{tooltip.reading.themes.verdict}</p>
            )}
            <p className="text-gold text-xs font-sans mt-2">Click to open reading →</p>
          </div>
        </div>
      )}

      {pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-text-m text-sm font-serif italic">
            Your cities will appear here as you explore them.
          </p>
        </div>
      )}
    </div>
  );
}
