import { Link } from "react-router-dom";
import UploadForm from "../upload/UploadForm";
import AnalysisProgress from "../loading/AnalysisProgress";
import ResultsDashboard from "../results/ResultsDashboard";
import { useAnalysis } from "../../hooks/useAnalysis";

export default function GuestPage() {
  const {
    phase,
    result,
    error,
    isRescoring,
    disputedSkills,
    submit,
    toggleDispute,
    submitDispute,
    reset,
  } = useAnalysis();

  return (
    <>
      {phase === "input" && (
        <div className="relative">
          {/* Sign in link */}
          <div className="text-center mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Sign in for better experience
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <UploadForm onSubmit={submit} />
        </div>
      )}

      {phase === "loading" && <AnalysisProgress />}

      {phase === "results" && result && (
        <ResultsDashboard
          result={result}
          disputedSkills={disputedSkills}
          isRescoring={isRescoring}
          onToggleDispute={toggleDispute}
          onSubmitDispute={submitDispute}
          onStartOver={reset}
        />
      )}

      {phase === "error" && (
        <div className="max-w-md mx-auto text-center py-16 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Analysis Failed</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </>
  );
}
