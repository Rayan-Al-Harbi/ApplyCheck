import json
import os
from groq import Groq
from prompt import SCORER_PROMPT

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def scorer_node(state) -> dict:
    job_profile = state.job_profile
    analysis = state.alignment_analysis
    cover_letter = state.cover_letter

    matched_skills = ", ".join(m.skill for m in analysis.matched_skills) or "none"
    missing_skills = ", ".join(analysis.missing_skills) or "none"

    prompt = SCORER_PROMPT.format(
        title=job_profile.title,
        required_skills=", ".join(job_profile.required_skills),
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        overall_fit=analysis.overall_fit,
        cover_letter=cover_letter,
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    raw = response.choices[0].message.content.strip().strip("```json").strip("```").strip()
    parsed = json.loads(raw, strict=False)

    return {
        "score": parsed["score"],
        "score_reasoning": parsed["reasoning"],
        "is_complete": True,
    }
