import { useEffect, useRef } from 'react';

const SIZE = 220;
const R = 88;
const CX = SIZE / 2;
const CY = SIZE / 2;

export default function GlobeLoader({ cityName, lat = 0, lng = 0 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function draw(elapsed) {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Spin: starts fast, settles to steady after 2s
      const spinRate = Math.max(0.5, 1.5 - elapsed * 0.3);
      const rotation = elapsed * spinRate;

      // How much we've zoomed toward the city (0→1 over 3s)
      const zoomT = Math.min(1, elapsed / 3);
      // Rotation offset to face the city's longitude
      const targetOffset = -(lng * Math.PI / 180);
      const rotOffset = targetOffset * zoomT;

      const r = rotation + rotOffset;

      // Atmosphere glow
      const atmo = ctx.createRadialGradient(CX, CY, R * 0.85, CX, CY, R + 24);
      atmo.addColorStop(0, 'rgba(100, 80, 255, 0.45)');
      atmo.addColorStop(1, 'rgba(80, 60, 200, 0)');
      ctx.beginPath();
      ctx.arc(CX, CY, R + 24, 0, Math.PI * 2);
      ctx.fillStyle = atmo;
      ctx.fill();

      // Sphere fill
      const grad = ctx.createRadialGradient(CX - R * 0.28, CY - R * 0.28, R * 0.04, CX, CY, R);
      grad.addColorStop(0, '#3030a8');
      grad.addColorStop(0.55, '#1a1a6e');
      grad.addColorStop(1, '#0c0c48');
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Clip to sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.clip();

      // Latitude lines
      for (let latDeg = -60; latDeg <= 60; latDeg += 30) {
        const latRad = latDeg * Math.PI / 180;
        const y = CY - R * Math.sin(latRad);
        const rx = R * Math.cos(latRad);
        ctx.beginPath();
        ctx.ellipse(CX, y, rx, rx * 0.13, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(120, 120, 255, 0.7)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Longitude lines (6 meridians, rotating)
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 6) + r;
        const cosA = Math.cos(angle);
        const rx = Math.abs(R * cosA);
        ctx.beginPath();
        ctx.ellipse(CX, CY, rx, R, 0, 0, Math.PI * 2);
        ctx.strokeStyle = cosA > 0
          ? 'rgba(130, 130, 255, 0.75)'
          : 'rgba(70, 70, 180, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // City dot
      const cityLatRad = lat * Math.PI / 180;
      const cityLngRad = (lng * Math.PI / 180) + r;
      const dotX = CX + R * Math.cos(cityLatRad) * Math.sin(cityLngRad);
      const dotY = CY - R * Math.sin(cityLatRad);
      const facing = Math.cos(cityLngRad);

      if (facing > -0.1) {
        const alpha = Math.max(0, facing);
        const pulse = 0.6 + 0.4 * Math.sin(elapsed * 3);

        // Glow ring
        const glow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 14);
        glow.addColorStop(0, `rgba(212, 175, 55, ${0.45 * alpha * pulse})`);
        glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.beginPath();
        ctx.arc(dotX, dotY, 14, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
        ctx.fill();
      }

      ctx.restore();

      // Sphere border
      ctx.beginPath();
      ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120, 120, 255, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    function animate() {
      const elapsed = (Date.now() - startRef.current) / 1000;
      draw(elapsed);
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [lat, lng]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/60 backdrop-blur-sm">
      <div style={{ animation: 'globeZoom 1.4s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: 'block' }} />
      </div>
      <div className="mt-5 text-center animate-fade-in">
        <p className="font-serif text-2xl text-gold tracking-wide drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]">{cityName?.split(',')[0]}</p>
        <p className="font-sans text-sm text-white/70 mt-1.5 animate-pulse tracking-wide">Reading the stars…</p>
      </div>
    </div>
  );
}
