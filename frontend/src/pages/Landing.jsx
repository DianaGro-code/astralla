import { Link } from 'react-router-dom';

const FEATURES = [
  { glyph: '☉', label: 'All 10 bodies', desc: 'Sun through Pluto — every planetary influence mapped' },
  { glyph: '✦', label: 'All 4 angles', desc: 'MC, IC, AC, DC lines calculated for your exact birth moment' },
  { glyph: '⊕', label: 'Parans', desc: 'Latitude crossings where two planets are simultaneously angular' },
  { glyph: '◈', label: 'AI synthesis', desc: 'Claude reads the interplay — not individual planets, but the whole story' },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="stars" />

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-sm font-sans mb-8 animate-fade-in">
          <span>✦</span>
          <span>The map of your stars</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-light text-text-p leading-tight mb-6 animate-slide-up">
          Where on Earth<br />
          <span className="text-gold italic">were you born to be?</span>
        </h1>

        <p className="max-w-xl text-text-s font-sans text-lg font-light leading-relaxed mb-10 animate-fade-in">
          Enter your birth data and a city. Receive a holistic astrocartographic reading —
          how the planets, lines, and parans weave together into a unique story for that place.
        </p>

        <Link to="/auth" className="btn-gold text-base px-8 py-4 animate-fade-in">
          Begin your reading
        </Link>

        {/* Features */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full animate-fade-in">
          {FEATURES.map(f => (
            <div key={f.label} className="card text-center hover:border-gold/40 transition-colors">
              <div className="text-gold text-2xl mb-2">{f.glyph}</div>
              <div className="text-text-p font-sans font-medium text-sm mb-1">{f.label}</div>
              <div className="text-text-m font-sans text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-text-m text-xs font-sans py-6 border-t border-border/30">
        Astrocartography calculations based on Jean Meeus &bull; Powered by Claude AI
      </footer>
    </div>
  );
}
