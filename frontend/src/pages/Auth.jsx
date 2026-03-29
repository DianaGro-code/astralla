import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-14">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-10">
          <div className="text-gold text-2xl mb-4 opacity-70">✦</div>
          <h1 className="font-serif text-4xl text-text-p mb-2">
            {mode === 'login' ? 'Welcome back' : 'Your chart is waiting'}
          </h1>
          <p className="text-text-m font-sans text-sm">
            {mode === 'login' ? 'The stars have been waiting.' : 'Takes 2 minutes. No credit card.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-7">
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
            <input className="input" type="password" placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
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

        <p className="text-center text-text-m text-sm font-sans mt-4">
          {mode === 'login' ? "New here? " : 'Already have a chart? '}
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-gold hover:text-gold-l transition-colors"
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
