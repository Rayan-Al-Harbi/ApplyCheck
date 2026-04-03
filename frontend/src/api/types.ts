export interface SkillMatch {
  skill: string;
  matched: boolean;
  evidence: string;
}

export interface Analysis {
  matched_skills: SkillMatch[];
  missing_skills: string[];
  matched_preferred: SkillMatch[];
  missing_preferred: string[];
  overall_fit: string;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  reasoning: string;
}

export interface Score {
  dimensions: DimensionScore[];
  overall_score: number;
  summary: string;
}

export interface JobProfile {
  title: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string;
  responsibilities: string[];
}

export interface AnalyzeResponse {
  job_title: string;
  job_profile: JobProfile;
  analysis: Analysis;
  cv_suggestions: string[];
  cover_letter: string;
  score: Score;
  trace_id: string;
}

export interface DisputedSkill {
  skill: string;
  category: "required" | "preferred";
}

export interface RescoreRequest {
  trace_id: string;
  job_profile: JobProfile;
  analysis: Analysis;
  cover_letter: string;
  disputed_skills: DisputedSkill[];
}
