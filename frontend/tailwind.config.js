/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#060A12',   // deepest background
        cosmos:  '#0C1118',   // body / nav background
        nebula:  '#0E1828',   // input background
        card:    '#101A2A',   // card background
        'card-h':'#141F32',   // card hover
        border:  '#1E2A3C',   // subtle borders
        'text-p':'#EDE9DF',   // primary text (warm cream)
        'text-s':'#8A827A',   // secondary text
        'text-m':'#605850',   // muted / metadata text
        gold:    '#C9A96E',   // champagne gold accent
        'gold-l':'#D4B87A',   // gold hover
        violet:  '#C0507A',   // venus / love
        teal:    '#5A8FC8',   // moon / inner
      },
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans:  ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.6s ease forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
        'bar-fill':   'barFill 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        barFill: { from: { width: '0%' }, to: {} },
      },
    },
  },
  plugins: [],
};
