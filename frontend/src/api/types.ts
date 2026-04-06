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
  cv_suggestions: string[];
  original_score: Score;
}

// --- Auth ---

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// --- CV ---

export interface CVUploadResponse {
  message: string;
  word_count: number;
  profile: Record<string, unknown>;
}

export interface CVResponse {
  raw_text: string;
  profile: Record<string, unknown>;
  uploaded_at: string;
  updated_at: string;
}

// --- History ---

export interface AnalysisSummary {
  id: string;
  job_title: string;
  overall_score: number;
  matched_count: number;
  missing_count: number;
  cv_changed: boolean;
  created_at: string;
}

export interface AnalysisListResponse {
  analyses: AnalysisSummary[];
  total: number;
}

export interface AnalysisDetail {
  id: string;
  job_description: string;
  job_profile: JobProfile;
  alignment: Analysis;
  cv_suggestions: string[];
  cover_letter: string;
  scorer_output: Score;
  cv_changed: boolean;
  created_at: string;
}
