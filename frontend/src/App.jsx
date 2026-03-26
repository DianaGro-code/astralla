import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Landing   from './pages/Landing.jsx';
import Auth      from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reading   from './pages/Reading.jsx';
import Navbar    from './components/Navbar.jsx';
import StarField from './components/StarField.jsx';

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
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/reading/:id" element={<PrivateRoute><Reading /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
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
