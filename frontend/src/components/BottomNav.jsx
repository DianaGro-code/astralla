import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? '#c9a84c' : 'none'} stroke={active ? '#c9a84c' : '#6b7280'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? '#c9a84c' : 'none'} stroke={active ? '#c9a84c' : '#6b7280'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        background: 'rgba(13,18,32,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => {
          const active = location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center gap-1 px-8 py-2 transition-opacity active:opacity-60"
            >
              {tab.icon(active)}
              <span className="text-[10px] font-medium" style={{ color: active ? '#c9a84c' : '#6b7280' }}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
