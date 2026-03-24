/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#050510',
        cosmos:  '#0A0A1F',
        nebula:  '#0F0F2D',
        card:    '#141430',
        'card-h':'#1A1A3E',
        border:  '#2A2A50',
        'text-p':'#E8E4FF',
        'text-s':'#9590B8',
        'text-m':'#5E5880',
        gold:    '#D4AF37',
        'gold-l':'#F0D060',
        violet:  '#7C3AED',
        teal:    '#14B8A6',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.6s ease forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
