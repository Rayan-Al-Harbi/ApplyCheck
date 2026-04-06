import { useState, useCallback } from "react";
import type { AnalyzeResponse, DisputedSkill } from "../api/types";
import { analyzeUpload, rescoreAnalysis } from "../api/client";

export type Phase = "input" | "loading" | "results" | "error";

interface AnalysisState {
  phase: Phase;
  result: AnalyzeResponse | null;
  error: string;
  isRescoring: boolean;
  disputedSkills: Set<string>;
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    phase: "input",
    result: null,
    error: "",
    isRescoring: false,
    disputedSkills: new Set(),
  });

  const submit = useCallback(async (jobDescription: string, cvFile: File) => {
    setState((s) => ({ ...s, phase: "loading", error: "" }));
    try {
      const result = await analyzeUpload(jobDescription, cvFile);
      setState((s) => ({
        ...s,
        phase: "results",
        result,
        disputedSkills: new Set(),
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        phase: "error",
        error: e instanceof Error ? e.message : "Something went wrong",
      }));
    }
  }, []);

  const setExternalResult = useCallback((result: AnalyzeResponse) => {
    setState((s) => ({
      ...s,
      result,
      disputedSkills: new Set(),
    }));
  }, []);

  const toggleDispute = useCallback((skill: string) => {
    setState((s) => {
      const next = new Set(s.disputedSkills);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return { ...s, disputedSkills: next };
    });
  }, []);

  const submitDispute = useCallback(async () => {
    const { result, disputedSkills } = state;
    if (!result || disputedSkills.size === 0) return;

    setState((s) => ({ ...s, isRescoring: true }));

    const disputed: DisputedSkill[] = [];
    for (const skill of disputedSkills) {
      if (result.analysis.missing_skills.includes(skill)) {
        disputed.push({ skill, category: "required" });
      } else if (result.analysis.missing_preferred.includes(skill)) {
        disputed.push({ skill, category: "preferred" });
      }
    }

    try {
      const updated = await rescoreAnalysis({
        trace_id: result.trace_id,
        job_profile: result.job_profile,
        analysis: result.analysis,
        cover_letter: result.cover_letter,
        disputed_skills: disputed,
        cv_suggestions: result.cv_suggestions,
        original_score: result.score,
      });
      setState((s) => ({
        ...s,
        result: updated,
        isRescoring: false,
        disputedSkills: new Set(),
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        isRescoring: false,
        error: e instanceof Error ? e.message : "Rescore failed",
      }));
    }
  }, [state]);

  const reset = useCallback(() => {
    setState({
      phase: "input",
      result: null,
      error: "",
      isRescoring: false,
      disputedSkills: new Set(),
    });
  }, []);

  return {
    ...state,
    submit,
    setExternalResult,
    toggleDispute,
    submitDispute,
    reset,
  };
}
