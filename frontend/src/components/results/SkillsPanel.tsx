import { useState } from "react";
import type { Analysis } from "../../api/types";

interface Props {
  analysis: Analysis;
  disputedSkills: Set<string>;
  onToggleDispute: (skill: string) => void;
}

export default function SkillsPanel({ analysis, disputedSkills, onToggleDispute }: Props) {
  const hasPreferred = analysis.matched_preferred.length > 0 ||
    analysis.missing_preferred.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-up">
      {/* Required Skills */}
      <SkillSection
        title="Required Skills"
        matched={analysis.matched_skills}
        missing={analysis.missing_skills}
        disputedSkills={disputedSkills}
        onToggleDispute={onToggleDispute}
      />

      {/* Preferred Skills */}
      {hasPreferred && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <SkillSection
            title="Preferred Skills"
            matched={analysis.matched_preferred}
            missing={analysis.missing_preferred}
            disputedSkills={disputedSkills}
            onToggleDispute={onToggleDispute}
          />
        </div>
      )}
    </div>
  );
}

function SkillSection({
  title,
  matched,
  missing,
  disputedSkills,
  onToggleDispute,
}: {
  title: string;
  matched: { skill: string; evidence: string }[];
  missing: string[];
  disputedSkills: Set<string>;
  onToggleDispute: (skill: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">{title}</h3>

      {/* Matched */}
      {matched.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {matched.map((m) => (
            <MatchedBadge key={m.skill} skill={m.skill} evidence={m.evidence} />
          ))}
        </div>
      )}

      {/* Missing */}
      {missing.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 mt-4">
            Missing — check any skills you actually have:
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.map((skill) => (
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

      {matched.length === 0 && missing.length === 0 && (
        <p className="text-sm text-gray-400 italic">None</p>
      )}
    </div>
  );
}

function MatchedBadge({ skill, evidence }: { skill: string; evidence: string }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const isDisputed = evidence === "Confirmed by candidate";

  return (
    <div className="relative">
      <button
        onClick={() => setShowEvidence(!showEvidence)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isDisputed
            ? "bg-disputed-light text-disputed border border-disputed/20"
            : "bg-success-light text-success border border-success/20"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {skill}
      </button>
      {showEvidence && (
        <div className="absolute z-10 top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 animate-fade-up">
          <p className="text-xs text-gray-600">{evidence}</p>
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        checked
          ? "bg-disputed-light text-disputed border border-disputed/30 ring-2 ring-disputed/20"
          : "bg-danger-light text-danger border border-danger/20 hover:border-danger/40"
      }`}
    >
      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? "bg-disputed border-disputed" : "border-gray-300"
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {skill}
    </button>
  );
}
