import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAnalysis } from "../../api/client";
import type { AnalysisDetail } from "../../api/types";

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAnalysis(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-6 h-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center py-20 animate-fade-up">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Analysis not found.</p>
        <button onClick={() => navigate("/history")} className="text-primary hover:text-primary-dark text-sm font-semibold">
          Back to history
        </button>
      </div>
    );
  }

  const score = data.scorer_output;
  const analysis = data.alignment;
  const allMatched = [...analysis.matched_skills, ...(analysis.matched_preferred || [])];
  const allMissing = [...analysis.missing_skills, ...(analysis.missing_preferred || [])];

  function scoreColor(s: number) {
    if (s >= 75) return "text-success";
    if (s >= 50) return "text-warning";
    return "text-danger";
  }

  function fitLabel(s: number) {
    if (s >= 75) return "Strong Fit";
    if (s >= 50) return "Partial Fit";
    return "Weak Fit";
  }

  async function copyLetter() {
    await navigator.clipboard.writeText(data!.cover_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-fade-up max-w-4xl mx-auto py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate("/history")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{data.job_profile.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
            {new Date(data.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {data.cv_changed && (
              <span className="ml-3 text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase">
                New CV
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Score section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Score overview */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
                    className="text-gray-200 dark:text-gray-700" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                    strokeDasharray={`${(score.overall_score / 100) * 263.9} 263.9`}
                    strokeLinecap="round"
                    className={`${score.overall_score >= 75 ? "text-success" : score.overall_score >= 50 ? "text-warning" : "text-danger"}`}
                    stroke="currentColor" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${scoreColor(score.overall_score)}`} style={{ fontFamily: "var(--font-mono)" }}>
                    {Math.round(score.overall_score)}
                  </span>
                  <span className="text-[10px] text-gray-400">/ 100</span>
                </div>
              </div>
              <div>
                <p className={`text-lg font-bold ${scoreColor(score.overall_score)}`}>{fitLabel(score.overall_score)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{score.summary}</p>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Scoring Dimensions</h3>
            {score.dimensions.map((d) => (
              <div key={d.dimension} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{d.dimension}</span>
                  <span className={`font-bold ${scoreColor(d.score)}`} style={{ fontFamily: "var(--font-mono)" }}>
                    {Math.round(d.score)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200/80 dark:bg-gray-700/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${d.score >= 75 ? "bg-success" : d.score >= 50 ? "bg-warning" : "bg-danger"}`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{d.reasoning}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skills section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Matched */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Matched Skills ({allMatched.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {allMatched.map((s) => (
                <span
                  key={s.skill}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    s.evidence === "Confirmed by candidate"
                      ? "bg-disputed/10 text-disputed border border-disputed/20"
                      : "bg-success/10 text-success border border-success/20"
                  }`}
                  title={s.evidence}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {s.skill}
                </span>
              ))}
            </div>
          </div>

          {/* Missing */}
          {allMissing.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Missing Skills ({allMissing.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {allMissing.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger/10 text-danger border border-danger/20"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cover letter */}
      <div className="mt-6 glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Cover Letter</h3>
          <button
            onClick={copyLetter}
            className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{data.cover_letter}</div>
      </div>

      {/* Suggestions */}
      {data.cv_suggestions.length > 0 && (
        <div className="mt-6 glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">CV Suggestions</h3>
          <ol className="space-y-3">
            {data.cv_suggestions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                  style={{ fontFamily: "var(--font-mono)" }}>
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
