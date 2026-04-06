import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID || "";

function getGoogleAuthUrl() {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function getLinkedinAuthUrl() {
  const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile email",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isReady = email.trim().length > 0 && password.length >= 8;
  const hasGoogle = GOOGLE_CLIENT_ID.length > 0;
  const hasLinkedin = LINKEDIN_CLIENT_ID.length > 0;
  const hasOAuth = hasGoogle || hasLinkedin;

  return (
    <div className="animate-fade-up max-w-md mx-auto py-16 sm:py-24">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Apply<span className="bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">Check</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-3">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8">
        {/* Mode toggle */}
        <div className="flex rounded-xl bg-gray-100/80 dark:bg-gray-800/60 p-1 mb-8">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === "login"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === "register"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* OAuth buttons */}
        {hasOAuth && (
          <>
            <div className="space-y-3 mb-6">
              {hasGoogle && (
                <a
                  href={getGoogleAuthUrl()}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-gray-200/80 dark:border-gray-600/50
                             bg-white/60 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10
                             text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:shadow-md"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>
              )}

              {hasLinkedin && (
                <a
                  href={getLinkedinAuthUrl()}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-gray-200/80 dark:border-gray-600/50
                             bg-white/60 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10
                             text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:shadow-md"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Continue with LinkedIn
                </a>
              )}
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/60 dark:border-gray-700/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white/80 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 font-medium">
                  or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-200/80 dark:border-gray-600/50 px-4 py-3
                         bg-white/40 dark:bg-white/5
                         text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                         text-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-gray-200/80 dark:border-gray-600/50 px-4 py-3
                         bg-white/40 dark:bg-white/5
                         text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                         text-sm transition-all"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">Must be at least 8 characters</p>
          </div>

          {error && (
            <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3">
              <p className="text-sm text-danger font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isReady || loading}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 ${
              isReady && !loading
                ? "bg-gradient-to-r from-primary via-purple-500 to-accent text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                : "bg-gray-200/80 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </span>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        {/* Guest link */}
        <div className="mt-6 pt-6 border-t border-gray-200/60 dark:border-gray-700/40 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
          >
            Continue as guest
          </a>
        </div>
      </div>
    </div>
  );
}
