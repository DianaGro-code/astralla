import { useAuth } from '../contexts/AuthContext.jsx';

export default function Profile() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="min-h-screen px-6 pt-16 pb-32 flex flex-col items-center">
      {/* Avatar */}
      <div className="mt-8 mb-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-sans font-medium"
          style={{
            background: 'rgba(201,169,110,0.12)',
            color: '#C9A96E',
            border: '1px solid rgba(201,169,110,0.25)',
          }}
        >
          {initials}
        </div>
      </div>

      <h1 className="font-serif text-2xl text-text-p mb-1">{user?.name}</h1>
      <p className="text-text-m text-sm mb-10">{user?.email}</p>

      <div className="w-full max-w-sm space-y-3">
        <div className="card px-5 py-4 flex justify-between items-center">
          <span className="text-text-s text-sm">Member since</span>
          <span className="text-text-p text-sm">
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : 'Recently'}
          </span>
        </div>

        <button
          onClick={logout}
          className="w-full card px-5 py-4 text-left text-red-400 hover:border-red-400/30 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
