import { useState, useEffect } from "react";
import type { AnalyzeResponse } from "../../api/types";
import ScoreOverview from "./ScoreOverview";
import SkillsPanel from "./SkillsPanel";
import CollapsibleSection from "./CollapsibleSection";
import DisputeBar from "./DisputeBar";

interface Props {
  result: AnalyzeResponse;
  disputedSkills: Set<string>;
  isRescoring: boolean;
  onToggleDispute: (skill: string) => void;
  onSubmitDispute: () => void;
  onStartOver: () => void;
}

export default function ResultsDashboard({
  result,
  disputedSkills,
  isRescoring,
  onToggleDispute,
  onSubmitDispute,
  onStartOver,
}: Props) {
  const [previousScore, setPreviousScore] = useState<number | undefined>();
  const [wasUpdated, setWasUpdated] = useState(false);
  const [copied, setCopied] = useState(false);

  const [prevTraceCheck, setPrevTraceCheck] = useState(result.score.overall_score);
  useEffect(() => {
    if (result.score.overall_score !== prevTraceCheck) {
      setPreviousScore(prevTraceCheck);
      setPrevTraceCheck(result.score.overall_score);
      setWasUpdated(true);
    }
  }, [result.score.overall_score, prevTraceCheck]);

  function handleCopy() {
    navigator.clipboard.writeText(result.cover_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const matchedCount = result.analysis.matched_skills.length + result.analysis.matched_preferred.length;
  const totalSkills = matchedCount + result.analysis.missing_skills.length + result.analysis.missing_preferred.length;

  return (
    <div className="animate-fade-up pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-primary dark:text-indigo-300 uppercase tracking-widest mb-1">Results</p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{result.job_title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all
                       text-gray-600 dark:text-gray-300 glass-card hover:scale-105"
          >
            Back to Home
          </button>
          <button
            onClick={onStartOver}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all
                       text-primary glass-card hover:scale-105"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Score + Skills side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left — Score */}
        <div className="lg:col-span-3">
          <ScoreOverview score={result.score} previousScore={previousScore} />
        </div>

        {/* Right — Skills */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-5 animate-fade-up h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Skills Breakdown
              </h3>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                {matchedCount}/{totalSkills} matched
              </span>
            </div>
            <SkillsPanel
              analysis={result.analysis}
              disputedSkills={disputedSkills}
              onToggleDispute={onToggleDispute}
            />
          </div>
        </div>
      </div>

      {/* Collapsible sections below */}
      <div className="mt-5 space-y-3">
        {/* Overall Fit */}
        <CollapsibleSection
          title="Overall Fit"
          defaultOpen={true}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {result.analysis.overall_fit}
          </p>
        </CollapsibleSection>

        {/* Cover Letter */}
        <CollapsibleSection
          title="Cover Letter"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          badge={
            <div className="flex items-center gap-2">
              {wasUpdated && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-disputed/10 text-disputed dark:bg-disputed/20">
                  Updated
                </span>
              )}
            </div>
          }
        >
          <div className="flex justify-end mb-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                         text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {result.cover_letter}
          </div>
        </CollapsibleSection>

        {/* CV Suggestions */}
        {result.cv_suggestions.length > 0 && (
          <CollapsibleSection
            title="CV Suggestions"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            badge={
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                {result.cv_suggestions.length} tips
              </span>
            }
          >
            <ul className="space-y-3">
              {result.cv_suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}
      </div>

      {/* Rescore overlay */}
      {isRescoring && (
        <div className="fixed inset-0 bg-white/60 dark:bg-gray-900/70 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="glass-card rounded-2xl shadow-2xl p-8 text-center max-w-sm">
            <svg className="w-10 h-10 text-disputed animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Recalculating your score...</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Updating cover letter and scoring</p>
          </div>
        </div>
      )}

      {/* Dispute Bar */}
      <DisputeBar
        count={disputedSkills.size}
        isRescoring={isRescoring}
        onSubmit={onSubmitDispute}
      />
    </div>
  );
}
