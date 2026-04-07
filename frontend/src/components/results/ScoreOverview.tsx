import { useState } from "react";
import type { Score } from "../../api/types";

interface Props {
  score: Score;
  previousScore?: number;
}

function scoreColor(s: number) {
  if (s >= 75) return { ring: "text-success", gradient: "from-success to-emerald-400", label: "Strong Fit" };
  if (s >= 50) return { ring: "text-warning", gradient: "from-warning to-amber-400", label: "Partial Fit" };
  return { ring: "text-danger", gradient: "from-danger to-rose-400", label: "Weak Fit" };
}

function barColor(s: number) {
  if (s >= 75) return "bg-gradient-to-r from-success to-emerald-400";
  if (s >= 50) return "bg-gradient-to-r from-warning to-amber-400";
  return "bg-gradient-to-r from-danger to-rose-400";
}

export default function ScoreOverview({ score, previousScore }: Props) {
  const { ring, gradient, label } = scoreColor(score.overall_score);
  const pct = (score.overall_score / 100) * 283;

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-up h-full flex flex-col">
      {/* Score Circle + Summary */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="7" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              className={`${ring} animate-score-fill`}
              stroke="currentColor" strokeWidth="7" strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={283 - pct}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-mono)' }}>
              {Math.round(score.overall_score)}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">/ 100</span>
          </div>
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${gradient} text-white`}>
              {label}
            </span>
            {previousScore != null && previousScore !== score.overall_score && (
              <span className="text-xs text-disputed font-semibold">
                {score.overall_score > previousScore ? "+" : ""}
                {Math.round(score.overall_score - previousScore)} from previous
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{score.summary}</p>
        </div>
      </div>

      {/* Dimension Bars */}
      <div className="space-y-3 flex-1 flex flex-col justify-end">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score Breakdown</h3>
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
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium">
            {dimension.dimension}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(dimension.score)}</span>
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor(dimension.score)}`}
            style={{ width: `${dimension.score}%` }}
          />
        </div>
      </button>
      {open && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-1 leading-relaxed animate-fade-up">
          {dimension.reasoning}
        </p>
      )}
    </div>
  );
}
