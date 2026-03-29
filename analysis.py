import logging
import os
import time

from groq import Groq
from dotenv import load_dotenv
from langsmith import traceable
from model import JobProfile, SkillMatch, AlignmentAnalysis, SkillType, SkillClassifierOutput
from prompt import SKILL_EVAL_PROMPT, OVERALL_FIT_PROMPT, SKILL_CLASSIFIER_PROMPT, HARD_SKILL_EVAL_RULES, SOFT_SKILL_EVAL_RULES, LANGUAGE_EVAL_RULES
from rag import retrieve_relevant_chunks, get_cv_context
from utils import parse_llm_json

load_dotenv()

logger = logging.getLogger("applycheck.analysis")

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def classify_skills(skills: list[str]) -> dict[str, SkillType]:
    start = time.perf_counter()

    prompt = SKILL_CLASSIFIER_PROMPT.format(skills=", ".join(skills))

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    result = parse_llm_json(response.choices[0].message.content, SkillClassifierOutput)

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

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    result = parse_llm_json(response.choices[0].message.content, SkillMatch)

    logger.info("Skill evaluated", extra={"event_data": {
        "event": "llm_call",
        "function": "evaluate_skill_match",
        "skill": skill,
        "skill_type": skill_type.value,
        "matched": result.matched,
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
    }})

    return result


def generate_overall_fit(
    job_profile: JobProfile,
    matched: list[SkillMatch],
    missing: list[str],
) -> str:
    start = time.perf_counter()

    prompt = OVERALL_FIT_PROMPT.format(
        title=job_profile.title,
        matched_list=", ".join([m.skill for m in matched]),
        missing_list=", ".join(missing) if missing else "none",
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    logger.info("Overall fit generated", extra={"event_data": {
        "event": "llm_call",
        "function": "generate_overall_fit",
        "latency_ms": round((time.perf_counter() - start) * 1000, 2),
    }})

    return response.choices[0].message.content.strip()


def analyze_alignment(job_profile: JobProfile, cv_text: str, chunks_stored: bool = True, skill_types: dict[str, SkillType] | None = None) -> AlignmentAnalysis:
    matched = []
    missing = []

    if skill_types is None:
        skill_types = classify_skills(job_profile.required_skills)

    for skill in job_profile.required_skills:
        context = get_cv_context(cv_text, skill, chunks_stored)
        skill_type = skill_types.get(skill, SkillType.HARD)

        result = evaluate_skill_match(skill, context, skill_type)

        if result.matched:
            matched.append(result)
        else:
            missing.append(skill)

    overall_fit = generate_overall_fit(job_profile, matched, missing)

    return AlignmentAnalysis(
        matched_skills=matched,
        missing_skills=missing,
        overall_fit=overall_fit,
    )
