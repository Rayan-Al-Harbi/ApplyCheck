import logging
import time

from extraction import extract_job_profile
from chunking import chunk_cv
from rag import store_cv_chunks, cleanup_collection
from analysis import analyze_alignment, classify_skills
from api.metrics import AGENT_LATENCY, PIPELINE_ERROR_COUNT

logger = logging.getLogger("applycheck.analyzer")


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
    trace_id = state.trace_id
    start = time.perf_counter()

    logger.info("Analyzer started", extra={"event_data": {
        "event": "agent_start",
        "agent": "analyzer",
        "trace_id": trace_id,
    }})

    try:
        job_description = state.job_description
        cv_text = state.cv_text

        # Phase 1: extract structured job profile
        job_profile = extract_job_profile(job_description)
        _validate_job_profile(job_profile)

        # Phase 2: chunk CV and store in per-request vector collection
        _validate_cv_text(cv_text)
        chunks = chunk_cv(cv_text)
        store_cv_chunks(chunks, trace_id)
        chunks_stored = len(chunks) > 0

        # Phase 3: classify skills and run alignment analysis
        skill_types = classify_skills(job_profile.required_skills)
        alignment = analyze_alignment(
            job_profile, cv_text,
            chunks_stored=chunks_stored,
            skill_types=skill_types,
            trace_id=trace_id,
        )

        # Clean up per-request vector collection
        cleanup_collection(trace_id)

        elapsed_ms = (time.perf_counter() - start) * 1000

        logger.info("Analyzer complete", extra={"event_data": {
            "event": "agent_complete",
            "agent": "analyzer",
            "trace_id": trace_id,
            "matched_count": len(alignment.matched_skills),
            "missing_count": len(alignment.missing_skills),
            "latency_ms": round(elapsed_ms, 2),
        }})

        return {
            "job_profile": job_profile,
            "alignment_analysis": alignment,
            "current_agent": "writer",
        }
    except Exception:
        # Best-effort cleanup on error too
        cleanup_collection(trace_id)
        PIPELINE_ERROR_COUNT.labels(agent="analyzer").inc()
        raise
    finally:
        AGENT_LATENCY.labels(agent="analyzer").observe(time.perf_counter() - start)
