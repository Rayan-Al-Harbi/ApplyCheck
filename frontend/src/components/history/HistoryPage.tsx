import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAnalyses } from "../../api/client";
import { AIDisclaimer } from "../Footer";
import type { AnalysisSummary } from "../../api/types";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadAnalyses();
  }, [offset]);

  async function loadAnalyses() {
    setLoading(true);
    try {
      const data = await getAnalyses(limit, offset);
      setAnalyses(data.analyses);
      setTotal(data.total);
    } catch {
      // Error silently
    } finally {
      setLoading(false);
    }
  }

  function scoreColor(score: number) {
    if (score >= 75) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-danger";
  }

  function scoreBg(score: number) {
    if (score >= 75) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-danger";
  }

  // Group analyses, inserting CV change dividers
  function renderTimeline() {
    const items: React.ReactNode[] = [];

    analyses.forEach((a) => {
      // Show CV change divider before the analysis that has cv_changed
      if (a.cv_changed) {
        items.push(
          <div key={`cv-${a.id}`} className="flex items-center gap-3 py-3">
            <div className="h-px flex-1 bg-accent/30" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider px-3 py-1 rounded-full bg-accent/10">
              CV Updated
            </span>
            <div className="h-px flex-1 bg-accent/30" />
          </div>
        );
      }

      items.push(
        <button
          key={a.id}
          onClick={() => navigate(`/history/${a.id}`)}
          className="w-full glass-card rounded-xl p-5 flex items-center gap-5 text-left hover:scale-[1.005] transition-transform"
        >
          {/* Score circle */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
                className="text-gray-200 dark:text-gray-700" />
              <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3"
                strokeDasharray={`${(a.overall_score / 100) * 125.6} 125.6`}
                strokeLinecap="round"
                className={scoreBg(a.overall_score).replace("bg-", "text-")} stroke="currentColor" />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor(a.overall_score)}`}
              style={{ fontFamily: "var(--font-mono)" }}>
              {Math.round(a.overall_score)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.job_title}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {a.matched_count}/{a.matched_count + a.missing_count} skills
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500" style={{ fontFamily: "var(--font-mono)" }}>
                {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      );
    });

    return items;
  }

  return (
    <div className="animate-fade-up max-w-3xl mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Analysis History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total {total === 1 ? "analysis" : "analyses"}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-6 h-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : analyses.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No analyses yet.</p>
          <button
            onClick={() => navigate("/analyze")}
            className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Start your first analysis
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">{renderTimeline()}</div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-center gap-3 mt-8">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium glass-card disabled:opacity-40 text-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 rounded-xl text-sm font-medium glass-card disabled:opacity-40 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      <AIDisclaimer />
    </div>
  );
}
