import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(9,14,24,0.80)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center transition-opacity hover:opacity-80">
          <Logo size={34} showWordmark={true} />
        </Link>

        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 group"
            title="Sign out"
          >
            {/* Initials avatar */}
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium transition-all duration-200 group-hover:ring-1 group-hover:ring-gold/40"
              style={{
                background: 'rgba(201,169,110,0.12)',
                color: '#C9A96E',
                border: '1px solid rgba(201,169,110,0.25)',
              }}
            >
              {initials}
            </span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="text-sm text-text-s hover:text-gold transition-colors font-sans tracking-wide"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
