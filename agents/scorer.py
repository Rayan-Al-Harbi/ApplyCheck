import os
from groq import Groq
from dotenv import load_dotenv
from model import AlignmentAnalysis, JobProfile, ScorerOutput
from prompt import SCORER_PROMPT
from utils import parse_llm_json

load_dotenv()

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def _format_job_profile(job_profile: JobProfile) -> str:
    return (
        f"Title: {job_profile.title}\n"
        f"Experience Level: {job_profile.experience_level}\n"
        f"Required Skills: {', '.join(job_profile.required_skills)}\n"
        f"Responsibilities:\n" + "\n".join(f"  - {r}" for r in job_profile.responsibilities)
    )


def _format_analysis(analysis: AlignmentAnalysis) -> str:
    matched_section = "\n".join(
        f"  - {m.skill} (MATCHED — evidence: {m.evidence})"
        for m in analysis.matched_skills
    )
    missing_section = "\n".join(f"  - {skill}" for skill in analysis.missing_skills)
    return (
        f"Matched Skills:\n{matched_section or '  none'}\n\n"
        f"Missing Skills:\n{missing_section or '  none'}\n\n"
        f"Overall Fit: {analysis.overall_fit}"
    )


def scorer_node(state) -> dict:
    job_profile = state.job_profile
    analysis = state.alignment_analysis
    cover_letter = state.cover_letter

    prompt = SCORER_PROMPT.format(
        job_profile=_format_job_profile(job_profile),
        analysis=_format_analysis(analysis),
        cover_letter=cover_letter,
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    scorer_output = parse_llm_json(response.choices[0].message.content, ScorerOutput)

    return {
        "scorer_output": scorer_output,
        "is_complete": True,
    }
