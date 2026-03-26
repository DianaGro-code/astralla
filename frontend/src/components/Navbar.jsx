import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-cosmos/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <svg
            width="20" height="20" viewBox="0 0 20 20" fill="none"
            className="text-gold shrink-0 transition-opacity group-hover:opacity-90"
            style={{ filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.5))' }}
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1"/>
            <circle cx="10" cy="10" r="2.2" fill="currentColor"/>
            <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1"/>
            <line x1="10" y1="16" x2="10" y2="19" stroke="currentColor" strokeWidth="1"/>
            <line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1"/>
            <line x1="16" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <span className="font-serif text-lg tracking-wide text-text-p group-hover:text-gold transition-colors">
            Astralla
          </span>
          <span className="hidden sm:flex items-center gap-2 ml-1">
            <span className="text-border text-xs">·</span>
            <span className="font-sans text-xs text-text-m font-light tracking-wide">your life, in the right place</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-text-m text-sm font-sans hidden sm:block">{user.name}</span>
            <button onClick={handleLogout} className="text-sm text-text-s hover:text-gold transition-colors font-sans">
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/auth" className="text-sm text-text-s hover:text-gold transition-colors font-sans">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
