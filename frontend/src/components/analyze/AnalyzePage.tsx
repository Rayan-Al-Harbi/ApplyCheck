import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeAuthStream } from "../../api/client";
import type { AnalyzeResponse } from "../../api/types";
import AnalysisProgress from "../loading/AnalysisProgress";
import ResultsDashboard from "../results/ResultsDashboard";
import { useAnalysis } from "../../hooks/useAnalysis";

type Phase = "input" | "loading" | "results" | "error";

// Minimum delay after all agents complete before showing results (smooth transition)
const MIN_FINISH_DELAY_MS = 1000;

export default function AnalyzePage() {
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState("");
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());

  const dispute = useAnalysis();
  const pendingResult = useRef<AnalyzeResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    setPhase("loading");
    setError("");
    setCompletedAgents(new Set());
    pendingResult.current = null;

    try {
      await analyzeAuthStream(jobDescription.trim(), (event) => {
        if (event.type === "agent_complete") {
          setCompletedAgents((prev) => new Set([...prev, event.agent]));
        } else if (event.type === "result") {
          // Don't show results immediately — store and wait for smooth transition
          pendingResult.current = event.data;
          // Give the UI time to show the last agent completing
          setTimeout(() => {
            if (pendingResult.current) {
              setResult(pendingResult.current);
              dispute.setExternalResult(pendingResult.current);
              setPhase("results");
            }
          }, MIN_FINISH_DELAY_MS);
        } else if (event.type === "error") {
          setError(event.detail);
          setPhase("error");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }

  const isReady = jobDescription.trim().length > 20;

  if (phase === "loading") {
    return <AnalysisProgress completedAgents={completedAgents} />;
  }

  if (phase === "results" && result) {
    return (
      <ResultsDashboard
        result={dispute.result ?? result}
        disputedSkills={dispute.disputedSkills}
        isRescoring={dispute.isRescoring}
        onToggleDispute={dispute.toggleDispute}
        onSubmitDispute={dispute.submitDispute}
        onStartOver={() => {
          setPhase("input");
          setResult(null);
          setJobDescription("");
          dispute.reset();
        }}
      />
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-md mx-auto text-center py-16 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Analysis Failed</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => setPhase("input")}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up max-w-3xl mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">New Analysis</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-card rounded-2xl p-6 space-y-3 mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={10}
            className="w-full rounded-xl border border-gray-200/80 dark:border-gray-600/50 px-4 py-3
                       bg-white/40 dark:bg-white/5
                       text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                       resize-y text-sm leading-relaxed transition-all"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right" style={{ fontFamily: "var(--font-mono)" }}>
            {jobDescription.length} chars
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your stored CV will be used automatically.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isReady}
          className={`w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-200 ${
            isReady
              ? "bg-gradient-to-r from-primary via-purple-500 to-accent text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              : "bg-gray-200/80 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}
        >
          Analyze Application
        </button>
      </form>
    </div>
  );
}
