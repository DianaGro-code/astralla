export default function Logo({ size = 36, showWordmark = false }) {
  const gold      = "#c9a84c";
  const goldLight = "#e4c97e";
  const goldBright= "#f5d878";
  const navy      = "#0d1220";
  const white     = "#f0eeea";

  const starPts = [
    [18,12],[72,8],[88,28],[12,52],[92,58],[28,82],
    [78,88],[8,72],[62,22],[42,92],[82,68],[22,38],
    [55,15],[38,55],[68,45],[15,30],[85,45],[50,78],
    [94,80],[6,20],[44,18],[76,50],[30,65],[60,92],
  ];

  const planets = [
    { angle: -55, r: 38, size: 6,   color: "#e4c97e", glow: true  },
    { angle:  25, r: 38, size: 4.5, color: "#e07090", glow: false },
    { angle: 100, r: 38, size: 4,   color: "#70a8e0", glow: false },
    { angle: 185, r: 38, size: 4,   color: "#a080e0", glow: false },
    { angle: 255, r: 38, size: 3.5, color: "#e09060", glow: false },
  ];

  const toXY = (angle, r) => {
    const a = (angle - 90) * Math.PI / 180;
    return [60 + r * Math.cos(a), 60 + r * Math.sin(a)];
  };

  // SVG is rendered at size*0.82 inside the circle badge
  const svgSize = size * 0.82;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.28 }}>

      {/* Circular badge */}
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: navy,
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        boxShadow: `0 0 ${size * 0.7}px rgba(245,216,120,0.22), 0 0 ${size * 1.4}px rgba(201,168,76,0.1), 0 ${size * 0.15}px ${size * 0.55}px rgba(0,0,0,0.9)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>

        {/* Stars */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {starPts.map(([cx, cy], i) => (
            <circle key={i}
              cx={cx + '%'} cy={cy + '%'}
              r={i % 4 === 0 ? 1.2 * size / 160 : 0.8 * size / 160}
              fill="white" opacity={i % 3 === 0 ? 0.6 : 0.35}
            />
          ))}
          <circle cx="15%" cy="20%" r={1.5 * size / 160} fill={goldLight} opacity="0.4" />
          <circle cx="85%" cy="75%" r={1.2 * size / 160} fill={goldLight} opacity="0.3" />
        </svg>

        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(245,216,120,0.1) 0%, rgba(201,168,76,0.04) 40%, transparent 70%)',
        }} />

        {/* Chart wheel */}
        <svg width={svgSize} height={svgSize} viewBox="0 0 120 120" style={{ position: 'relative' }}>

          {/* Rings */}
          <circle cx="60" cy="60" r="57" fill="none" stroke={goldBright} strokeWidth="0.5" opacity="0.15" />
          <circle cx="60" cy="60" r="52" fill="none" stroke={goldBright} strokeWidth="2"   opacity="0.9"  />
          <circle cx="60" cy="60" r="52" fill="none" stroke={goldBright} strokeWidth="5"   opacity="0.08" />
          <circle cx="60" cy="60" r="38" fill="none" stroke={gold}       strokeWidth="1"   opacity="0.35" />
          <circle cx="60" cy="60" r="22" fill="none" stroke={gold}       strokeWidth="0.7" opacity="0.2"  />

          {/* Cardinal spokes — bold */}
          {[0, 90, 180, 270].map((deg, i) => {
            const a = (deg - 90) * Math.PI / 180;
            return <line key={i}
              x1={60 + 22 * Math.cos(a)} y1={60 + 22 * Math.sin(a)}
              x2={60 + 52 * Math.cos(a)} y2={60 + 52 * Math.sin(a)}
              stroke={gold} strokeWidth="1.2" opacity="0.45"
            />;
          })}

          {/* Diagonal spokes — thin */}
          {[45, 135, 225, 315].map((deg, i) => {
            const a = (deg - 90) * Math.PI / 180;
            return <line key={i}
              x1={60 + 22 * Math.cos(a)} y1={60 + 22 * Math.sin(a)}
              x2={60 + 52 * Math.cos(a)} y2={60 + 52 * Math.sin(a)}
              stroke={gold} strokeWidth="0.5" opacity="0.2"
            />;
          })}

          {/* Planets */}
          {planets.map((p, i) => {
            const [cx, cy] = toXY(p.angle, p.r);
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={p.size + 6} fill={p.color} opacity="0.08" />
                <circle cx={cx} cy={cy} r={p.size + 3} fill={p.color} opacity={p.glow ? 0.18 : 0.1} />
                <circle cx={cx} cy={cy} r={p.size}     fill={p.color} />
                <circle cx={cx - p.size * 0.25} cy={cy - p.size * 0.25} r={p.size * 0.35} fill="white" opacity="0.35" />
              </g>
            );
          })}

          {/* Centre — layered */}
          <circle cx="60" cy="60" r="18" fill="none" stroke={goldBright} strokeWidth="0.5" opacity="0.12" />
          <circle cx="60" cy="60" r="14" fill={navy}      opacity="0.5"  />
          <circle cx="60" cy="60" r="10" fill="none" stroke={goldBright} strokeWidth="0.8" opacity="0.25" />
          <circle cx="60" cy="60" r="7"  fill="none" stroke={goldBright} strokeWidth="1.2" opacity="0.6"  />
          <circle cx="60" cy="60" r="3.5" fill={goldBright} />
          <circle cx="58.5" cy="58.5" r="1.2" fill="white" opacity="0.6" />

        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.1, position: 'relative' }}>
          <div style={{ width: size * 2.2, height: 1, background: `linear-gradient(to right, transparent, ${gold}, transparent)`, opacity: 0.5 }} />
          <span style={{
            fontFamily: 'Georgia, serif',
            fontSize: size * 0.42,
            color: white,
            letterSpacing: `${size * 0.16}px`,
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            ASTRALLA
          </span>
          <div style={{ width: size * 2.2, height: 1, background: `linear-gradient(to right, transparent, ${gold}, transparent)`, opacity: 0.5 }} />
        </div>
      )}

    </div>
  );
}
