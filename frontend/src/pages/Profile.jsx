import { useAuth } from '../contexts/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen px-6 pt-16 pb-32 flex flex-col items-center">
      {/* Avatar */}
      <div className="mt-8 mb-6">
        <Logo size={72} showWordmark={false} />
      </div>

      <h1 className="text-2xl font-serif text-gold mb-1">{user?.name}</h1>
      <p className="text-muted text-sm mb-10">{user?.email}</p>

      <div className="w-full max-w-sm space-y-3">
        <div className="bg-surface border border-border rounded-xl px-5 py-4 flex justify-between items-center">
          <span className="text-text-s text-sm">Member since</span>
          <span className="text-text-p text-sm">
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : 'Recently'}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full bg-surface border border-border rounded-xl px-5 py-4 text-left text-red-400 hover:border-red-400/40 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
