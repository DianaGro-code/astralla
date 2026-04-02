import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../lib/api.js';

// mode: 'login' | 'register' | 'forgot' | 'reset'
export default function Auth() {
  const [searchParams] = useSearchParams();
  const urlMode  = searchParams.get('mode');
  const urlToken = searchParams.get('token');

  const [mode, setMode] = useState(
    urlMode === 'reset' && urlToken ? 'reset' : 'login'
  );
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // If URL changes (e.g. user navigates back) sync mode
  useEffect(() => {
    if (urlMode === 'reset' && urlToken) setMode('reset');
  }, [urlMode, urlToken]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function switchMode(next) {
    setMode(next);
    setError('');
    setSuccess('');
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  }

  // ── Login / Register ────────────────────────────────────────────────────────
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password ─────────────────────────────────────────────────────────
  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email: form.email });
      setSuccess('Check your inbox — a reset link is on its way.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Reset Password ──────────────────────────────────────────────────────────
  async function handleResetSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ token: urlToken, password: form.password });
      setSuccess('Password updated. You can now sign in.');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Heading copy ────────────────────────────────────────────────────────────
  const headings = {
    login:    { title: 'Welcome back',          sub: 'The stars have been waiting.' },
    register: { title: 'Your chart is waiting', sub: 'Takes 2 minutes. No credit card.' },
    forgot:   { title: 'Forgot your password?', sub: "Enter your email and we'll send a reset link." },
    reset:    { title: 'Set a new password',    sub: "Choose something you'll remember." },
  };
  const { title, sub } = headings[mode];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-14">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-10">
          <div className="text-gold text-2xl mb-4 opacity-70">✦</div>
          <h1 className="font-serif text-4xl text-text-p mb-2">{title}</h1>
          <p className="text-text-m font-sans text-sm">{sub}</p>
        </div>

        {/* ── LOGIN / REGISTER ── */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleAuthSubmit} className="card space-y-5 p-7">
            {mode === 'register' && (
              <div>
                <label className="label">Name</label>
                <input className="input" type="text" placeholder="Your name"
                  value={form.name} onChange={set('name')} autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                value={form.password}
                onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="mt-1.5 text-xs font-sans text-text-m hover:text-gold transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm font-sans bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-gold w-full mt-2" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-void/40 border-t-void rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign in →' : 'Start reading my chart →'
              )}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="card space-y-5 p-7">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} autoComplete="email" required />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-sans bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-400 text-sm font-sans bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            {!success && (
              <button type="submit" className="btn-gold w-full" disabled={loading}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-void/40 border-t-void rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : (
                  'Send reset link →'
                )}
              </button>
            )}
          </form>
        )}

        {/* ── RESET PASSWORD ── */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="card space-y-5 p-7">
            <div>
              <label className="label">New Password</label>
              <input className="input" type="password" placeholder="At least 8 characters"
                value={form.password} onChange={set('password')} autoComplete="new-password" required />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input className="input" type="password" placeholder="Same again"
                value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" required />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-sans bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-400 text-sm font-sans bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            {!success && (
              <button type="submit" className="btn-gold w-full" disabled={loading}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-void/40 border-t-void rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : (
                  'Set new password →'
                )}
              </button>
            )}
          </form>
        )}

        {/* ── Bottom links ── */}
        <p className="text-center text-text-m text-sm font-sans mt-4">
          {mode === 'login' && (
            <>
              New here?{' '}
              <button onClick={() => switchMode('register')} className="text-gold hover:text-gold-l transition-colors">
                Create an account
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Already have a chart?{' '}
              <button onClick={() => switchMode('login')} className="text-gold hover:text-gold-l transition-colors">
                Sign in
              </button>
            </>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button onClick={() => switchMode('login')} className="text-gold hover:text-gold-l transition-colors">
              ← Back to sign in
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
