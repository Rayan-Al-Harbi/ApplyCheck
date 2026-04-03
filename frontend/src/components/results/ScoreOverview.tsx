import { useState } from "react";
import type { Score } from "../../api/types";

interface Props {
  score: Score;
  previousScore?: number;
}

function scoreColor(s: number) {
  if (s >= 75) return { ring: "text-success", bg: "bg-success-light", label: "Strong Fit" };
  if (s >= 50) return { ring: "text-warning", bg: "bg-warning-light", label: "Partial Fit" };
  return { ring: "text-danger", bg: "bg-danger-light", label: "Weak Fit" };
}

function barColor(s: number) {
  if (s >= 75) return "bg-success";
  if (s >= 50) return "bg-warning";
  return "bg-danger";
}

export default function ScoreOverview({ score, previousScore }: Props) {
  const { ring, bg, label } = scoreColor(score.overall_score);
  const pct = (score.overall_score / 100) * 283;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-up">
      {/* Score Circle + Summary */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              className={`${ring} animate-score-fill`}
              stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={283 - pct}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {Math.round(score.overall_score)}
            </span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${bg} ${ring}`}>
            {label}
          </span>
          {previousScore != null && previousScore !== score.overall_score && (
            <span className="ml-2 text-xs text-disputed font-medium">
              {score.overall_score > previousScore ? "+" : ""}
              {Math.round(score.overall_score - previousScore)} from dispute
            </span>
          )}
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{score.summary}</p>
        </div>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Score Breakdown</h3>
        {score.dimensions.map((d) => (
          <DimensionBar key={d.dimension} dimension={d} />
        ))}
      </div>
    </div>
  );
}

function DimensionBar({ dimension }: { dimension: Score["dimensions"][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left group"
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            {dimension.dimension}
            <span className="text-xs text-gray-400 ml-1">({Math.round(dimension.weight * 100)}%)</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{Math.round(dimension.score)}</span>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor(dimension.score)}`}
            style={{ width: `${dimension.score}%` }}
          />
        </div>
      </button>
      {open && (
        <p className="text-xs text-gray-500 mt-2 pl-1 leading-relaxed animate-fade-up">
          {dimension.reasoning}
        </p>
      )}
    </div>
  );
}
