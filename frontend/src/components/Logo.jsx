export default function Logo({ size = 36, showWordmark = false }) {
  const gold = "#c9a84c";
  const goldLight = "#e4c97e";
  const navy = "#0d1220";

  const planets = [
    { angle: -60,  r: 40, size: 3.5, color: goldLight,  opacity: 1    },
    { angle: 20,   r: 40, size: 2.5, color: "#d97090",  opacity: 0.9  },
    { angle: 110,  r: 40, size: 2,   color: "#6090c8",  opacity: 0.85 },
    { angle: 200,  r: 40, size: 2.5, color: "#8870c8",  opacity: 0.85 },
  ];

  const stars = [[20,15,0.8],[75,20,0.7],[85,65,0.6],[15,70,0.7],[60,88,0.6],[90,40,0.5]];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Circular badge */}
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: navy,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 ${size * 0.6}px rgba(201,168,76,0.18), 0 2px ${size * 0.4}px rgba(0,0,0,0.6)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {/* Stars */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {stars.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx + '%'} cy={cy + '%'} r={r * size / 160} fill="white" opacity={0.45} />
          ))}
        </svg>

        {/* Glow */}
        <div style={{
          position: 'absolute',
          width: size * 0.75, height: size * 0.75,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)',
        }} />

        {/* Chart wheel */}
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 120 120"
          style={{ position: 'relative' }}
        >
          <circle cx="60" cy="60" r="56" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.6" />
          <circle cx="60" cy="60" r="40" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.35" />
          <circle cx="60" cy="60" r="24" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.25" />

          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180;
            return (
              <line key={i}
                x1={60 + 24 * Math.cos(angle)} y1={60 + 24 * Math.sin(angle)}
                x2={60 + 56 * Math.cos(angle)} y2={60 + 56 * Math.sin(angle)}
                stroke={gold} strokeWidth="0.6" opacity="0.3"
              />
            );
          })}

          {planets.map((p, i) => {
            const a = (p.angle - 90) * Math.PI / 180;
            return (
              <circle key={i}
                cx={60 + p.r * Math.cos(a)}
                cy={60 + p.r * Math.sin(a)}
                r={p.size} fill={p.color} opacity={p.opacity}
              />
            );
          })}

          <line x1="60" y1="20" x2="60" y2="100" stroke={gold} strokeWidth="0.6" opacity="0.2" />
          <line x1="20" y1="60" x2="100" y2="60" stroke={gold} strokeWidth="0.6" opacity="0.2" />
          <circle cx="60" cy="60" r="5" fill="none" stroke={goldLight} strokeWidth="1.5" />
          <circle cx="60" cy="60" r="2" fill={goldLight} />
        </svg>
      </div>

      {/* Optional wordmark */}
      {showWordmark && (
        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: size * 0.45,
          fontWeight: 400,
          color: '#f0eeea',
          letterSpacing: '4px',
          textTransform: 'uppercase',
        }}>
          Astralla
        </span>
      )}
    </div>
  );
}
