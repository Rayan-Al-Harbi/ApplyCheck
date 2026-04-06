import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useDarkMode } from "./hooks/useDarkMode";

// Pages
import AuthPage from "./components/auth/AuthPage";
import OAuthCallback from "./components/auth/OAuthCallback";
import Dashboard from "./components/dashboard/Dashboard";
import AnalyzePage from "./components/analyze/AnalyzePage";
import HistoryPage from "./components/history/HistoryPage";
import AnalysisDetailPage from "./components/history/AnalysisDetailPage";
import GuestPage from "./components/guest/GuestPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="w-6 h-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { dark, toggle } = useDarkMode();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* Animated mesh background */}
      <div className="bg-mesh">
        <div className="grid-overlay" />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
      </div>

      <div className="min-h-screen relative">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="fixed top-5 right-5 z-50 w-10 h-10 rounded-full glass-card flex items-center justify-center
                     text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
          aria-label="Toggle dark mode"
        >
          {dark ? (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <Routes>
            {/* Guest (unauthenticated) flow */}
            <Route path="/" element={
              !isLoading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <GuestPage />
            } />

            {/* Auth */}
            <Route path="/login" element={
              !isLoading && isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
            } />
            <Route path="/auth/google/callback" element={<OAuthCallback provider="google" />} />
            <Route path="/auth/linkedin/callback" element={<OAuthCallback provider="linkedin" />} />

            {/* Protected */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/history/:id" element={<ProtectedRoute><AnalysisDetailPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
