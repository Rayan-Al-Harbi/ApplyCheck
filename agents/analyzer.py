from extraction import extract_job_profile
from chunking import chunk_cv
from rag import store_cv_chunks
from analysis import analyze_alignment, classify_skills


def _validate_job_profile(job_profile) -> None:
    if not job_profile.title or not job_profile.title.strip():
        raise ValueError("Extracted job profile has no title — job description may be too vague.")
    if not job_profile.required_skills:
        raise ValueError(
            f"Job profile '{job_profile.title}' has no required skills — "
            "job description may be too vague to analyze meaningfully."
        )


def _validate_cv_text(cv_text: str) -> None:
    if not cv_text or not cv_text.strip():
        raise ValueError("CV text is empty — nothing to analyze.")


def analyzer_node(state) -> dict:
    job_description = state.job_description
    cv_text = state.cv_text

    # Phase 1: extract structured job profile
    job_profile = extract_job_profile(job_description)
    _validate_job_profile(job_profile)

    # Phase 2: chunk CV and store in vector DB
    _validate_cv_text(cv_text)
    chunks = chunk_cv(cv_text)
    store_cv_chunks(chunks)
    chunks_stored = len(chunks) > 0

    # Phase 3: classify skills and run alignment analysis
    skill_types = classify_skills(job_profile.required_skills)
    alignment = analyze_alignment(
        job_profile, cv_text,
        chunks_stored=chunks_stored,
        skill_types=skill_types,
    )

    return {
        "job_profile": job_profile,
        "alignment_analysis": alignment,
        "current_agent": "writer",
    }
