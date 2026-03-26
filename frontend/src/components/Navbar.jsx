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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-cosmos/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center group transition-opacity hover:opacity-85">
          <Logo size={36} showWordmark={true} />
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
