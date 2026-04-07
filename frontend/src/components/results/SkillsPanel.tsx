import { useState } from "react";
import type { Analysis } from "../../api/types";

interface Props {
  analysis: Analysis;
  disputedSkills: Set<string>;
  onToggleDispute: (skill: string) => void;
}

export default function SkillsPanel({ analysis, disputedSkills, onToggleDispute }: Props) {
  const hasPreferredMatched = analysis.matched_preferred.length > 0;
  const hasPreferredMissing = analysis.missing_preferred.length > 0;

  return (
    <div className="space-y-5">
      {/* Matched Skills */}
      {(analysis.matched_skills.length > 0 || hasPreferredMatched) && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Matched Skills
          </h4>

          {analysis.matched_skills.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 ml-0.5">Required</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.matched_skills.map((m) => (
                  <MatchedBadge key={m.skill} skill={m.skill} evidence={m.evidence} />
                ))}
              </div>
            </div>
          )}

          {hasPreferredMatched && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 ml-0.5">Preferred</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.matched_preferred.map((m) => (
                  <MatchedBadge key={m.skill} skill={m.skill} evidence={m.evidence} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Missing Skills */}
      {(analysis.missing_skills.length > 0 || hasPreferredMissing) && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-danger" />
            Missing Skills
            <span className="font-medium normal-case tracking-normal text-primary dark:text-indigo-300">— Select the skills you have and recalculate</span>
          </h4>

          {analysis.missing_skills.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 ml-0.5">Required</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_skills.map((skill) => (
                  <MissingBadge
                    key={skill}
                    skill={skill}
                    checked={disputedSkills.has(skill)}
                    onToggle={() => onToggleDispute(skill)}
                  />
                ))}
              </div>
            </div>
          )}

          {hasPreferredMissing && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 ml-0.5">Preferred</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_preferred.map((skill) => (
                  <MissingBadge
                    key={skill}
                    skill={skill}
                    checked={disputedSkills.has(skill)}
                    onToggle={() => onToggleDispute(skill)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchedBadge({ skill, evidence }: { skill: string; evidence: string }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const isDisputed = evidence === "Demonstrated through professional experience and practical application.";

  return (
    <div className="relative">
      <button
        onClick={() => setShowEvidence(!showEvidence)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          isDisputed
            ? "bg-disputed/10 text-disputed border border-disputed/20 dark:bg-disputed/20 dark:border-disputed/30"
            : "bg-success/10 text-success border border-success/20 dark:bg-success/20 dark:border-success/30"
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {skill}
      </button>
      {showEvidence && (
        <div className="absolute z-10 top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-64 animate-fade-up">
          <p className="text-xs text-gray-600 dark:text-gray-300">{evidence}</p>
        </div>
      )}
    </div>
  );
}

function MissingBadge({
  skill,
  checked,
  onToggle,
}: {
  skill: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
        checked
          ? "bg-disputed/10 text-disputed border border-disputed/30 ring-2 ring-disputed/20 dark:bg-disputed/20"
          : "bg-danger/10 text-danger border border-danger/20 hover:border-danger/40 dark:bg-danger/20"
      }`}
    >
      <div className={`w-3 h-3 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? "bg-disputed border-disputed" : "border-gray-300 dark:border-gray-600"
      }`}>
        {checked && (
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {skill}
    </button>
  );
}
