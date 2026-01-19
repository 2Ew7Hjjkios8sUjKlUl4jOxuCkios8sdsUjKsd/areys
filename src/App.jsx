import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import CreateFlight from './pages/CreateFlight';
import SearchFlight from './pages/SearchFlight';
import FlightDetails from './pages/FlightDetails';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ActivityLog from './pages/ActivityLog';
import { FlightProvider, useFlights } from './context/FlightContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Loader from './components/Loader';
import { AlertTriangle, Shield, Ban, LogOut, Menu, X, PlaneTakeoff } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main App Layout (with Sidebar)
const AppLayout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { agencyName, agencyTagline } = useFlights();

  // Update site title
  useEffect(() => {
    document.title = `${agencyName} - ${agencyTagline}`;
  }, [agencyName, agencyTagline]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className={`app-layout ${isMenuOpen ? 'menu-open' : ''}`}>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="logo-container">
          <PlaneTakeoff size={24} className="logo-icon" />
          <div className="logo-text-col">
            <span className="logo-text">{agencyName}</span>
            <span className="brand-tagline">{agencyTagline}</span>
          </div>
        </div>
        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMenuOpen && <div className="mobile-overlay" onClick={() => setIsMenuOpen(false)}></div>}
    </div>
  );
};

function AppRoutes() {
  const { currentUser, loading, userActive, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullScreen text="Initializing App..." />;
  }

  if (currentUser && userActive === false) {
    return (
      <div className="deactivated-screen">
        <div className="deactivated-container">
          <div className="deactivated-card-premium">
            <div className="status-icon-wrapper">
              <div className="pulse-animation danger"></div>
              <Ban size={48} className="status-icon" color="var(--danger)" />
            </div>

            <h1 className="status-title">Access Denied</h1>
            <div className="status-divider"></div>

            <div className="status-message-box">
              <AlertTriangle size={20} className="inline mr-2" />
              <p>The User has no access for this Agency.</p>
            </div>

            <p className="status-description">
              Your account has been deactivated by the system administrator.
              Please contact management if you believe this is a mistake.
            </p>

            <div className="status-actions">
              <button onClick={() => window.location.reload()} className="btn btn-secondary flex items-center gap-2">
                <Shield size={18} /> Check Status
              </button>
              <button onClick={logout} className="btn btn-logout-outline mt-2">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>

          <div className="deactivated-footer">
            <p>© 2026 Ticket Printer System • Security Module</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/forgot-password"
        element={currentUser ? <Navigate to="/" replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/create-flight" element={
        <ProtectedRoute>
          <AppLayout><CreateFlight /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/edit-flight/:id" element={
        <ProtectedRoute>
          <AppLayout><CreateFlight /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <AppLayout><SearchFlight /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/flight/:id" element={
        <ProtectedRoute>
          <AppLayout><FlightDetails /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/activity-log" element={
        <ProtectedRoute>
          <AppLayout><ActivityLog /></AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <FlightProvider>
          <div className="app">
            <Toaster position="top-right" />
            <AppRoutes />
          </div>
        </FlightProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
