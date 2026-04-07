import json
import logging
import time

from model import AlignmentAnalysis
from prompt import WRITER_PROMPT
from utils import tracked_llm_call, WRITER_MODEL
from api.metrics import AGENT_LATENCY, PIPELINE_ERROR_COUNT

logger = logging.getLogger("applycheck.writer")


def _format_analysis(analysis: AlignmentAnalysis) -> str:
    matched_section = "\n".join(
        f"- {m.skill} (MATCHED — evidence: {m.evidence})"
        for m in analysis.matched_skills
    )
    missing_section = "\n".join(
        f"- {skill}" for skill in analysis.missing_skills
    )

    lines = [
        f"REQUIRED — MATCHED:\n{matched_section or 'none'}",
        f"\nREQUIRED — MISSING:\n{missing_section or 'none'}",
    ]

    if analysis.matched_preferred or analysis.missing_preferred:
        pref_matched = "\n".join(
            f"- {m.skill} (MATCHED — evidence: {m.evidence})"
            for m in analysis.matched_preferred
        )
        pref_missing = "\n".join(f"- {skill}" for skill in analysis.missing_preferred)
        lines.append(f"\nPREFERRED — MATCHED:\n{pref_matched or 'none'}")
        lines.append(f"\nPREFERRED — MISSING:\n{pref_missing or 'none'}")

    return "\n".join(lines)


def rewrite(job_profile, analysis, cv_text) -> dict:
    """Standalone rewrite — used by /rescore when user disputes missing skills."""
    prompt = WRITER_PROMPT.format(
        title=job_profile.title,
        responsibilities="\n".join(f"- {r}" for r in job_profile.responsibilities),
        analysis=_format_analysis(analysis),
        cv_text=cv_text,
    )
    raw = tracked_llm_call(
        agent="writer",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        model=WRITER_MODEL,
    )
    clean = raw.strip().strip("```json").strip("```").strip()
    parsed = json.loads(clean, strict=False)
    return {
        "cv_suggestions": parsed["cv_suggestions"],
        "cover_letter": parsed["cover_letter"],
    }


def writer_node(state) -> dict:
    trace_id = state.trace_id
    start = time.perf_counter()

    logger.info("Writer started", extra={"event_data": {
        "event": "agent_start",
        "agent": "writer",
        "trace_id": trace_id,
    }})

    try:
        job_profile = state.job_profile
        analysis = state.alignment_analysis
        cv_text = state.cv_text

        prompt = WRITER_PROMPT.format(
            title=job_profile.title,
            responsibilities="\n".join(f"- {r}" for r in job_profile.responsibilities),
            analysis=_format_analysis(analysis),
            cv_text=cv_text,
        )

        raw = tracked_llm_call(
            agent="writer",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        logger.info("Writer LLM call complete", extra={"event_data": {
            "event": "llm_call",
            "agent": "writer",
            "trace_id": trace_id,
        }})

        clean = raw.strip().strip("```json").strip("```").strip()
        parsed = json.loads(clean, strict=False)

        elapsed_ms = (time.perf_counter() - start) * 1000

        logger.info("Writer complete", extra={"event_data": {
            "event": "agent_complete",
            "agent": "writer",
            "trace_id": trace_id,
            "suggestions_count": len(parsed["cv_suggestions"]),
            "latency_ms": round(elapsed_ms, 2),
        }})

        return {
            "cv_suggestions": parsed["cv_suggestions"],
            "cover_letter": parsed["cover_letter"],
            "current_agent": "scorer",
        }
    except Exception:
        PIPELINE_ERROR_COUNT.labels(agent="writer").inc()
        raise
    finally:
        AGENT_LATENCY.labels(agent="writer").observe(time.perf_counter() - start)
