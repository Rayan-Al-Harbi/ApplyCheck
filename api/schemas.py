# api/schemas.py

from pydantic import BaseModel


# --- Request ---

class AnalyzeRequest(BaseModel):
    job_description: str
    cv_text: str


# --- Response sub-models ---

class SkillMatchResponse(BaseModel):
    skill: str
    matched: bool
    evidence: str


class AnalysisResponse(BaseModel):
    matched_skills: list[SkillMatchResponse]
    missing_skills: list[str]
    matched_preferred: list[SkillMatchResponse] = []
    missing_preferred: list[str] = []


class DimensionScoreResponse(BaseModel):
    dimension: str
    score: float
    weight: float
    reasoning: str


class ScoreResponse(BaseModel):
    dimensions: list[DimensionScoreResponse]
    overall_score: float
    summary: str


class JobProfileResponse(BaseModel):
    title: str
    required_skills: list[str]
    preferred_skills: list[str]
    experience_level: str
    responsibilities: list[str]


class AnalyzeResponse(BaseModel):
    job_title: str
    job_profile: JobProfileResponse
    analysis: AnalysisResponse
    cv_suggestions: list[str]
    cover_letter: str
    score: ScoreResponse
    trace_id: str
    analysis_id: str | None = None


# --- Rescore ---

class DisputedSkill(BaseModel):
    skill: str
    category: str  # "required" or "preferred"


class RescoreRequest(BaseModel):
    trace_id: str
    job_profile: JobProfileResponse
    analysis: AnalysisResponse
    cover_letter: str
    disputed_skills: list[DisputedSkill]
    cv_suggestions: list[str] = []
    original_score: ScoreResponse | None = None
    analysis_id: str | None = None