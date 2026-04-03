import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('astro_token');
    const stored = localStorage.getItem('astro_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem('astro_token', token);
    localStorage.setItem('astro_user', JSON.stringify(user));
    setUser(user);
  }

  async function register(name, email, password) {
    const { token, user } = await api.auth.register({ name, email, password });
    localStorage.setItem('astro_token', token);
    localStorage.setItem('astro_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('astro_token');
    localStorage.removeItem('astro_user');
    setUser(null);
  }

  /** Re-fetch user from server and sync to local state (e.g. after subscription upgrade). */
  async function refreshUser() {
    try {
      const data = await api.profile.get();
      const updated = { ...user, ...data };
      localStorage.setItem('astro_user', JSON.stringify(updated));
      setUser(updated);
      return updated;
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
