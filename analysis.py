import json
import os
from groq import Groq
from dotenv import load_dotenv
from model import JobProfile, SkillMatch, AlignmentAnalysis, SkillType
from prompt import SKILL_EVAL_PROMPT, OVERALL_FIT_PROMPT, SKILL_CLASSIFIER_PROMPT, HARD_SKILL_EVAL_RULES, SOFT_SKILL_EVAL_RULES, LANGUAGE_EVAL_RULES
from rag import retrieve_relevant_chunks, get_cv_context
from utils import parse_llm_json

load_dotenv()

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def classify_skills(skills: list[str]) -> dict[str, SkillType]:
    prompt = SKILL_CLASSIFIER_PROMPT.format(skills=", ".join(skills))

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    parsed = json.loads(raw)
    return {item["skill"]: SkillType(item["type"]) for item in parsed["classifications"]}


_RULES_BY_TYPE = {
    SkillType.HARD: HARD_SKILL_EVAL_RULES,
    SkillType.SOFT: SOFT_SKILL_EVAL_RULES,
    SkillType.LANGUAGE: LANGUAGE_EVAL_RULES,
}


def evaluate_skill_match(skill: str, context: str, skill_type: SkillType = SkillType.HARD) -> SkillMatch:
    rules = _RULES_BY_TYPE.get(skill_type, HARD_SKILL_EVAL_RULES)
    prompt = SKILL_EVAL_PROMPT.format(skill=skill, context=context, rules=rules)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    return parse_llm_json(response.choices[0].message.content, SkillMatch)


def generate_overall_fit(
    job_profile: JobProfile,
    matched: list[SkillMatch],
    missing: list[str],
) -> str:
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
