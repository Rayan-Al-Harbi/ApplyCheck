import Header from "./components/layout/Header";
import UploadForm from "./components/upload/UploadForm";
import AnalysisProgress from "./components/loading/AnalysisProgress";
import ResultsDashboard from "./components/results/ResultsDashboard";
import { useAnalysis } from "./hooks/useAnalysis";

export default function App() {
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
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {phase === "input" && <UploadForm onSubmit={submit} />}

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
            <div className="w-16 h-16 rounded-2xl bg-danger-light flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
