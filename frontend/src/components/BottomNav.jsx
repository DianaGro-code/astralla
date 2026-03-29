import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={active ? '#C9A96E' : '#4A5568'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    to: '/charts',
    label: 'Charts',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={active ? '#C9A96E' : '#4A5568'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l5 3" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Account',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={active ? '#C9A96E' : '#4A5568'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(9,14,24,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(201,169,110,0.10)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex justify-around items-center h-[58px]">
        {tabs.map(tab => {
          const active = location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-label={tab.label}
              className="flex flex-col items-center gap-1.5 px-8 py-2 transition-opacity active:opacity-50"
            >
              {tab.icon(active)}
              {/* Dot indicator instead of text label */}
              <span
                className="w-1 h-1 rounded-full transition-all duration-300"
                style={{
                  background: active ? '#C9A96E' : 'transparent',
                  boxShadow: active ? '0 0 4px rgba(201,169,110,0.6)' : 'none',
                }}
              />
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
