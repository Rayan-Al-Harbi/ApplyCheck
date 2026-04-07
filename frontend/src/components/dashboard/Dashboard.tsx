import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCV, getAnalyses, uploadCV, deleteAnalysis, deleteAllAnalyses } from "../../api/client";
import type { CVResponse, AnalysisSummary } from "../../api/types";
import { AIDisclaimer } from "../Footer";

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [cv, setCv] = useState<CVResponse | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const cvData = await getCV();
      setCv(cvData);
      // Extract name from CV profile
      const name = (cvData.profile as Record<string, unknown>)?.name;
      if (typeof name === "string" && name.trim()) {
        setUserName(name.trim().split(/\s+/)[0]); // First name only
      }
    } catch {
      // No CV yet
    } finally {
      setCvLoading(false);
    }

    try {
      const data = await getAnalyses(5);
      setAnalyses(data.analyses);
    } catch {
      // No analyses yet
    }
  }

  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadCV(file);
      const cvData = await getCV();
      setCv(cvData);
      const name = (cvData.profile as Record<string, unknown>)?.name;
      if (typeof name === "string" && name.trim()) {
        setUserName(name.trim().split(/\s+/)[0]);
      }
    } catch {
      // Error handled silently
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAnalysis(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Error silently
    }
  }

  async function handleClearAll() {
    if (analyses.length === 0) return;
    try {
      await deleteAllAnalyses();
      setAnalyses([]);
    } catch {
      // Error silently
    }
  }

  function scoreColor(score: number) {
    if (score >= 75) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-danger";
  }

  function scoreBg(score: number) {
    if (score >= 75) return "bg-success/10";
    if (score >= 50) return "bg-warning/10";
    return "bg-danger/10";
  }

  const greeting = userName ? `Hi, ${userName}` : "Welcome back";

  return (
    <div className="animate-fade-up max-w-4xl mx-auto py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{greeting}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your CV and view analysis history</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-danger transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CV Card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your CV</h2>
          </div>

          {cvLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          ) : cv ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CV uploaded</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "var(--font-mono)" }}>
                <p>{cv.raw_text.split(/\s+/).length} words</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
              >
                {uploading ? "Uploading..." : "Update CV"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload your CV once and reuse it across all analyses.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                {uploading ? "Uploading..." : "Upload CV"}
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleCVUpload}
            className="hidden"
          />
        </div>

        {/* Quick Action */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Analysis</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1">
            {cv
              ? "Your CV is ready. Start a new analysis with just a job description."
              : "Upload your CV first, then analyze job descriptions instantly."}
          </p>
          <button
            onClick={() => navigate("/analyze")}
            disabled={!cv}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 ${
              cv
                ? "bg-gradient-to-r from-primary via-purple-500 to-accent text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5"
                : "bg-gray-200/80 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            Analyze a Job
          </button>
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Analyses</h2>
          <div className="flex items-center gap-3">
            {analyses.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-danger/70 hover:text-danger font-medium transition-colors"
              >
                Clear all
              </button>
            )}
            {analyses.length > 0 && (
              <button
                onClick={() => navigate("/history")}
                className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
              >
                View all
              </button>
            )}
          </div>
        </div>

        {analyses.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No analyses yet. Start by analyzing a job description.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate(`/history/${a.id}`)}
                className="w-full glass-card rounded-xl p-4 flex items-center gap-4 text-left hover:scale-[1.01] transition-transform cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl ${scoreBg(a.overall_score)} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-lg font-bold ${scoreColor(a.overall_score)}`} style={{ fontFamily: "var(--font-mono)" }}>
                    {Math.round(a.overall_score)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.job_title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {a.matched_count}/{a.matched_count + a.missing_count} skills matched
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 dark:text-gray-500" style={{ fontFamily: "var(--font-mono)" }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    {a.cv_changed && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        New CV
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteAnalysis(a.id, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Delete analysis"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <AIDisclaimer />
    </div>
  );
}
