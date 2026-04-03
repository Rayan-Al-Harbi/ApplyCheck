from fastapi import HTTPException, UploadFile
from api.schemas import (
    AnalyzeResponse,
    AnalysisResponse,
    SkillMatchResponse,
    ScoreResponse,
    DimensionScoreResponse,
    JobProfileResponse,
)


def build_response(state: dict) -> AnalyzeResponse:
    analysis = state["alignment_analysis"]
    job_profile = state["job_profile"]
    scorer_output = state["scorer_output"]

    return AnalyzeResponse(
        job_title=job_profile.title,
        job_profile=JobProfileResponse(
            title=job_profile.title,
            required_skills=job_profile.required_skills,
            preferred_skills=job_profile.preferred_skills,
            experience_level=job_profile.experience_level,
            responsibilities=job_profile.responsibilities,
        ),
        analysis=AnalysisResponse(
            matched_skills=[
                SkillMatchResponse(
                    skill=m.skill,
                    matched=m.matched,
                    evidence=m.evidence,
                )
                for m in analysis.matched_skills
            ],
            missing_skills=analysis.missing_skills,
            matched_preferred=[
                SkillMatchResponse(
                    skill=m.skill,
                    matched=m.matched,
                    evidence=m.evidence,
                )
                for m in analysis.matched_preferred
            ],
            missing_preferred=analysis.missing_preferred,
            overall_fit=analysis.overall_fit,
        ),
        cv_suggestions=state["cv_suggestions"],
        cover_letter=state["cover_letter"],
        score=ScoreResponse(
            dimensions=[
                DimensionScoreResponse(
                    dimension=d.dimension,
                    score=d.score,
                    weight=d.weight,
                    reasoning=d.reasoning,
                )
                for d in scorer_output.dimensions
            ],
            overall_score=scorer_output.overall_score,
            summary=scorer_output.summary,
        ),
        trace_id=state.get("trace_id", ""),
    )


async def extract_text_from_file(file: UploadFile) -> str:
    content = await file.read()

    if file.filename.endswith(".pdf"):
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)

    elif file.filename.endswith(".docx"):
        import docx
        from io import BytesIO
        doc = docx.Document(BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    elif file.filename.endswith(".txt"):
        return content.decode("utf-8")

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.filename}",
        )