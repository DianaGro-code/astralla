import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Landing   from './pages/Landing.jsx';
import Auth      from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reading   from './pages/Reading.jsx';
import Profile   from './pages/Profile.jsx';
import Admin     from './pages/Admin.jsx';
import Navbar    from './components/Navbar.jsx';
import BottomNav from './components/BottomNav.jsx';
import StarField from './components/StarField.jsx';
import { useNative } from './hooks/useNative.js';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  return user ? children : <Navigate to="/auth" replace />;
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-border border-t-gold rounded-full animate-spin" />
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const native = useNative();
  const location = useLocation();

  // Show bottom nav only when logged in on native, and not on reading detail pages
  const showBottomNav = native && user && !location.pathname.startsWith('/reading');

  return (
    <>
      {!native && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/reading/:id" element={<PrivateRoute><Reading /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <StarField />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
