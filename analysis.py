import logging
import time

from langsmith import traceable
from model import JobProfile, SkillMatch, AlignmentAnalysis, SkillType, SkillClassifierOutput
from prompt import SKILL_EVAL_PROMPT, SKILL_CLASSIFIER_PROMPT, HARD_SKILL_EVAL_RULES, SOFT_SKILL_EVAL_RULES, LANGUAGE_EVAL_RULES
from rag import get_cv_context, precompute_skill_embeddings
from utils import parse_llm_json, tracked_llm_call

logger = logging.getLogger("applycheck.analysis")


def classify_skills(skills: list[str]) -> dict[str, SkillType]:
    start = time.perf_counter()

    prompt = SKILL_CLASSIFIER_PROMPT.format(skills=", ".join(skills))

    raw = tracked_llm_call(
        agent="analyzer",
        messages=[{"role": "user", "content": prompt}],
    )

    result = parse_llm_json(raw, SkillClassifierOutput, agent="analyzer")

    logger.info("Skills classified", extra={"event_data": {
        "event": "llm_call",
        "function": "classify_skills",
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
        "skills_count": len(skills),
    }})

    return {item.skill: item.type for item in result.classifications}


_RULES_BY_TYPE = {
    SkillType.HARD: HARD_SKILL_EVAL_RULES,
    SkillType.SOFT: SOFT_SKILL_EVAL_RULES,
    SkillType.LANGUAGE: LANGUAGE_EVAL_RULES,
}


@traceable(name="skill_evaluation", metadata={"component": "analyzer"})
def evaluate_skill_match(skill: str, context: str, skill_type: SkillType = SkillType.HARD) -> SkillMatch:
    start = time.perf_counter()

    rules = _RULES_BY_TYPE.get(skill_type, HARD_SKILL_EVAL_RULES)
    prompt = SKILL_EVAL_PROMPT.format(skill=skill, context=context, rules=rules)

    raw = tracked_llm_call(
        agent="analyzer",
        messages=[{"role": "user", "content": prompt}],
    )

    result = parse_llm_json(raw, SkillMatch, agent="analyzer")

    logger.info("Skill evaluated", extra={"event_data": {
        "event": "llm_call",
        "function": "evaluate_skill_match",
        "skill": skill,
        "skill_type": skill_type.value,
        "matched": result.matched,
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
    }})

    return result


def analyze_alignment(job_profile: JobProfile, cv_text: str, chunks_stored: bool = True, skill_types: dict[str, SkillType] | None = None, trace_id: str = "") -> AlignmentAnalysis:
    matched = []
    missing = []

    all_skills = job_profile.required_skills + job_profile.preferred_skills
    if skill_types is None:
        skill_types = classify_skills(all_skills)

    # Pre-embed all skill queries in one batch call instead of one-by-one
    precompute_skill_embeddings(all_skills)

    for skill in job_profile.required_skills:
        context = get_cv_context(cv_text, skill, chunks_stored, trace_id)
        skill_type = skill_types.get(skill, SkillType.HARD)

        result = evaluate_skill_match(skill, context, skill_type)

        if result.matched:
            matched.append(result)
        else:
            missing.append(skill)

    matched_preferred = []
    missing_preferred = []

    for skill in job_profile.preferred_skills:
        context = get_cv_context(cv_text, skill, chunks_stored, trace_id)
        skill_type = skill_types.get(skill, SkillType.HARD)

        result = evaluate_skill_match(skill, context, skill_type)

        if result.matched:
            matched_preferred.append(result)
        else:
            missing_preferred.append(skill)

    return AlignmentAnalysis(
        matched_skills=matched,
        missing_skills=missing,
        matched_preferred=matched_preferred,
        missing_preferred=missing_preferred,
    )
