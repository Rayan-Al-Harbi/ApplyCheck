import { useState, useEffect } from "react";
import type { AnalyzeResponse } from "../../api/types";
import ScoreOverview from "./ScoreOverview";
import SkillsPanel from "./SkillsPanel";
import CoverLetter from "./CoverLetter";
import SuggestionsCard from "./SuggestionsCard";
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

  // Track score changes from disputes
  useEffect(() => {
    if (wasUpdated) return; // only set on first render
  }, []);

  // When result changes (after rescore), mark as updated
  const [prevTraceCheck, setPrevTraceCheck] = useState(result.score.overall_score);
  useEffect(() => {
    if (result.score.overall_score !== prevTraceCheck) {
      setPreviousScore(prevTraceCheck);
      setPrevTraceCheck(result.score.overall_score);
      setWasUpdated(true);
    }
  }, [result.score.overall_score, prevTraceCheck]);

  return (
    <div className="animate-fade-up pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{result.job_title}</h2>
          <p className="text-sm text-gray-500 mt-1">Analysis complete</p>
        </div>
        <button
          onClick={onStartOver}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100
                     hover:bg-gray-200 transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Score + Dimensions */}
        <div className="lg:col-span-3 space-y-6">
          <ScoreOverview score={result.score} previousScore={previousScore} />
          <SuggestionsCard suggestions={result.cv_suggestions} />
        </div>

        {/* Right Column - Skills */}
        <div className="lg:col-span-2 space-y-6">
          <SkillsPanel
            analysis={result.analysis}
            disputedSkills={disputedSkills}
            onToggleDispute={onToggleDispute}
          />
          {/* Overall Fit */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-up">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Overall Fit
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {result.analysis.overall_fit}
            </p>
          </div>
        </div>
      </div>

      {/* Cover Letter - Full Width */}
      <div className="mt-6">
        <CoverLetter coverLetter={result.cover_letter} wasUpdated={wasUpdated} />
      </div>

      {/* Rescore overlay */}
      {isRescoring && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm">
            <svg className="w-10 h-10 text-disputed animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-gray-900">Recalculating your score...</p>
            <p className="text-xs text-gray-500 mt-1">Updating cover letter and scoring</p>
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
