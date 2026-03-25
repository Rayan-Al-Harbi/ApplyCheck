from typing import Optional
from pydantic import BaseModel
from model import JobProfile, CandidateProfile, AlignmentAnalysis


class ApplicationState(BaseModel):
    # --- Inputs ---
    job_description: str
    cv_text: str

    # --- Phase 1 outputs ---
    job_profile: Optional[JobProfile] = None
    candidate_profile: Optional[CandidateProfile] = None

    # --- Phase 3 outputs (Analyzer) ---
    alignment_analysis: Optional[AlignmentAnalysis] = None

    # --- Writer outputs ---
    cv_suggestions: Optional[list[str]] = None
    cover_letter: Optional[str] = None

    # --- Scorer outputs ---
    score: Optional[float] = None
    score_reasoning: Optional[str] = None

    # --- Control ---
    current_agent: str = "analyzer"
    is_complete: bool = False
