import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface Props {
  provider: "google" | "linkedin";
}

export default function OAuthCallback({ provider }: Props) {
  const [searchParams] = useSearchParams();
  const { loginWithGoogle, loginWithLinkedin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("Authentication was cancelled or failed");
      return;
    }

    if (!code) {
      setError("No authorization code received");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/${provider}/callback`;

    const authenticate = async () => {
      try {
        if (provider === "google") {
          await loginWithGoogle(code, redirectUri);
        } else {
          await loginWithLinkedin(code, redirectUri);
        }
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    authenticate();
  }, [searchParams, provider, loginWithGoogle, loginWithLinkedin, navigate]);

  if (error) {
    return (
      <div className="animate-fade-up max-w-md mx-auto py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Authentication Failed</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Signing in with {provider === "google" ? "Google" : "LinkedIn"}...
      </p>
    </div>
  );
}
