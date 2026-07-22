import { Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";
import ChatRoom from "./pages/ChatRoom";
import Places from "./pages/Places";
import Business from "./pages/Business";
import BusinessEditor from "./pages/BusinessEditor";
import BusinessDashboard from "./pages/BusinessDashboard";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import { Terms, Privacy } from "./pages/Legal";
import Membership from "./pages/Membership";
import Search from "./pages/Search";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import WelcomeModal from "./components/WelcomeModal";
import RealtimeListener from "./components/RealtimeListener";

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white max-w-md mx-auto">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
          <p className="text-gray-400 text-sm mt-2 mb-6">
            The app ran into an unexpected error. Please reload.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Loading spinner (shared) ─────────────────────────────────────────────────
function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white max-w-md mx-auto">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary rounded-full mx-auto animate-pulse" />
        <p className="mt-4 text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// ─── Route guards ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isSetup) return <Navigate to="/setup" replace />;
  return children;
};

const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;    // ← was returning null (causes flicker)
  if (user && user.isSetup) return <Navigate to="/home" replace />;
  return children;
};

// ─── App shell (with bottom nav) ─────────────────────────────────────────────
const AppShell = ({ children }) => (
  <div className="max-w-md mx-auto min-h-screen pb-20 relative bg-gray-50">
    {children}
    <BottomNav />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <OfflineBanner />
          <BrowserRouter>
            <RealtimeListener />
            <WelcomeModal />
            <Routes>
            {/* Auth */}
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/setup" element={<ProfileSetup />} />

            {/* Legal — public, no auth required */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Main App */}
            <Route path="/home" element={
              <ProtectedRoute>
                <AppShell><Home /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/matches" element={
              <ProtectedRoute>
                <AppShell><Matches /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <AppShell><Chat /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/chat/:matchId" element={
              <ProtectedRoute>
                <ChatRoom />
              </ProtectedRoute>
            } />
            {/* Market — new home for businesses. /places kept as alias. */}
            <Route path="/market" element={
              <ProtectedRoute>
                <AppShell><Places /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/places" element={<Navigate to="/market" replace />} />
            <Route path="/business/new" element={
              <ProtectedRoute>
                <AppShell><BusinessEditor /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/business/:id/edit" element={
              <ProtectedRoute>
                <AppShell><BusinessEditor /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/business/:id/dashboard" element={
              <ProtectedRoute>
                <AppShell><BusinessDashboard /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/business/:id" element={
              <ProtectedRoute>
                <AppShell><Business /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <AppShell><Profile /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/membership" element={
              <ProtectedRoute>
                <AppShell><Membership /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute>
                <AppShell><Search /></AppShell>
              </ProtectedRoute>
            } />

            {/* Fallback — Home is the new front door */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
