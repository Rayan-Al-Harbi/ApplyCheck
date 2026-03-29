import json
import logging
import os
import time

from groq import Groq
from model import AlignmentAnalysis
from prompt import WRITER_PROMPT

logger = logging.getLogger("applycheck.writer")

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def _format_analysis(analysis: AlignmentAnalysis) -> str:
    matched_section = "\n".join(
        f"- {m.skill} (MATCHED — evidence: {m.evidence})"
        for m in analysis.matched_skills
    )
    missing_section = "\n".join(
        f"- {skill}" for skill in analysis.missing_skills
    )
    return f"MATCHED SKILLS:\n{matched_section or 'none'}\n\nMISSING SKILLS:\n{missing_section or 'none'}"


def writer_node(state) -> dict:
    trace_id = state.trace_id
    start = time.perf_counter()

    logger.info("Writer started", extra={"event_data": {
        "event": "agent_start",
        "agent": "writer",
        "trace_id": trace_id,
    }})

    job_profile = state.job_profile
    analysis = state.alignment_analysis
    cv_text = state.cv_text

    prompt = WRITER_PROMPT.format(
        title=job_profile.title,
        responsibilities="\n".join(f"- {r}" for r in job_profile.responsibilities),
        analysis=_format_analysis(analysis),
        overall_fit=analysis.overall_fit,
        cv_text=cv_text,
    )

    llm_start = time.perf_counter()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    llm_ms = (time.perf_counter() - llm_start) * 1000

    logger.info("Writer LLM call complete", extra={"event_data": {
        "event": "llm_call",
        "agent": "writer",
        "trace_id": trace_id,
        "latency_ms": round(llm_ms, 2),
    }})

    raw = response.choices[0].message.content.strip().strip("```json").strip("```").strip()
    parsed = json.loads(raw, strict=False)

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
