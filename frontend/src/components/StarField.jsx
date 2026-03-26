import { useEffect, useRef } from 'react';

/**
 * Hybrid star field: ~38% warm amber-tinted stars, 62% cool cream.
 * Renders once on mount at full viewport size.
 */
export default function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];

    // Field stars — spread across upper 75% of viewport
    for (let i = 0; i < 260; i++) {
      stars.push({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height * 0.75,
        r:    Math.random() * 1.1 + 0.2,
        a:    Math.random() * 0.6 + 0.15,
        warm: Math.random() > 0.62,
      });
    }

    // A handful of brighter stars near the top
    for (let i = 0; i < 18; i++) {
      stars.push({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height * 0.6,
        r:    Math.random() * 1.6 + 0.8,
        a:    Math.random() * 0.35 + 0.55,
        warm: Math.random() > 0.5,
      });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.warm
        ? `rgba(238, 210, 155, ${s.a})`   // warm amber tint
        : `rgba(228, 222, 208, ${s.a})`;  // cool cream
      ctx.fill();
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
