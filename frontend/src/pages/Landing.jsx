import { Link } from 'react-router-dom';

const OUTCOMES = [
  { glyph: '♀', label: "Where you'll fall in love", desc: "Venus on your Descendant doesn't lie." },
  { glyph: '☉', label: "Where you'll be unstoppable", desc: 'Some cities put the Sun on your Midheaven. Those are your cities.' },
  { glyph: '☽', label: "Where you'll finally feel at home", desc: "The Moon on your IC is a hug from a place you haven't been yet." },
  { glyph: '♇', label: "Where you'll be transformed", desc: 'Pluto asks for everything. Some locations hand it right to him.' },
];


export default function Landing() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="stars" />

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-sans mb-8 animate-fade-in tracking-widest uppercase">
          <span>✦</span>
          <span>Astralla</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-light text-text-p leading-tight mb-6 animate-slide-up">
          Some places will<br />
          <span className="text-gold italic">change you.</span>
        </h1>

        <p className="max-w-lg text-text-s font-sans text-lg font-light leading-relaxed mb-4 animate-fade-in">
          Find out which ones. Your birth chart has specific opinions about where you should live, love, and build a career — and most people never look.
        </p>

        <p className="max-w-md text-text-m font-sans text-sm font-light leading-relaxed mb-10 animate-fade-in">
          Enter a city. Get a reading. The planets have been waiting.
        </p>

        <Link to="/auth" className="btn-gold text-base px-8 py-4 animate-fade-in">
          Read my chart
        </Link>

        <p className="text-text-m text-xs font-sans mt-4 animate-fade-in">Free to use · Takes 2 minutes</p>

        {/* Outcomes */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full animate-fade-in">
          {OUTCOMES.map(f => (
            <div key={f.label} className="card text-center hover:border-gold/40 transition-colors cursor-default">
              <div className="text-gold text-2xl mb-2">{f.glyph}</div>
              <div className="text-text-p font-sans font-medium text-sm mb-1.5">{f.label}</div>
              <div className="text-text-m font-sans text-xs leading-relaxed italic">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-16 max-w-xl w-full animate-fade-in">
          <p className="text-text-m text-xs font-sans uppercase tracking-widest mb-2">What is astrocartography?</p>
          <p className="font-serif text-base text-text-s leading-relaxed font-light mb-8">
            The moment you were born, every planet held a precise position in the sky. As Earth rotates, those positions trace invisible lines across every continent. Where those lines cross a city is where that planet's energy is strongest for you — and where it quietly shapes the person you become there.
          </p>
          <div className="space-y-3 text-left">
            {[
              ['01', 'Enter your birth data', 'Date, time, and place. Exact time gives the most accurate reading.'],
              ['02', 'Pick a city', 'Anywhere on Earth. A dream destination, a place you\'re moving to, or somewhere that\'s been calling you.'],
              ['03', 'Get your reading', 'Love, career, inner life, vitality, and transformation — all five domains, for that specific city.'],
            ].map(([n, title, desc]) => (
              <div key={n} className="flex gap-4 items-start">
                <span className="text-gold font-serif text-lg leading-none mt-0.5 shrink-0">{n}</span>
                <div>
                  <p className="font-sans font-medium text-sm text-text-p">{title}</p>
                  <p className="font-sans text-xs text-text-m leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA repeat */}
        <div className="mt-16 animate-fade-in">
          <Link to="/auth" className="btn-gold text-base px-8 py-4">
            Start with your birth chart →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-text-m text-xs font-sans py-6 border-t border-border/30">
        Calculations based on Jean Meeus · Your data stays private
      </footer>
    </div>
  );
}
