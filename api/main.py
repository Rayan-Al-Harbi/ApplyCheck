from dotenv import load_dotenv
load_dotenv()

import logging
import os
import time
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from api.schemas import AnalyzeRequest, AnalyzeResponse, RescoreRequest
from api.metrics import REQUEST_COUNT, REQUEST_LATENCY
from api.utils import build_response, extract_text_from_file
from graph import app as app_graph
from model import AlignmentAnalysis, JobProfile, SkillMatch
from agents.scorer import rescore
from agents.writer import rewrite
from logging_config import setup_logging
from api.auth import router as auth_router
from api.cv import router as cv_router
from api.analysis import router as analysis_router
from api.errors import friendly_error

setup_logging()
logger = logging.getLogger("applycheck.api")


# Simple in-memory cache for cv_text by trace_id (needed for rescore/rewrite)
_cv_text_cache: dict[str, str] = {}

app = FastAPI(
    title="Job Application Intelligence",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(cv_router)
app.include_router(analysis_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_application(request: AnalyzeRequest):
    trace_id = str(uuid.uuid4())
    start = time.perf_counter()
    try:
        logger.info("Request received", extra={"event_data": {
            "event": "request_start",
            "endpoint": "/analyze",
            "trace_id": trace_id,
        }})

        initial_state = {
            "job_description": request.job_description,
            "cv_text": request.cv_text,
            "trace_id": trace_id,
        }

        final_state = app_graph.invoke(initial_state)
        _cv_text_cache[trace_id] = request.cv_text

        logger.info("Request complete", extra={"event_data": {
            "event": "request_complete",
            "endpoint": "/analyze",
            "trace_id": trace_id,
        }})

        REQUEST_COUNT.labels(endpoint="/analyze", status="success").inc()
        return build_response(final_state)
    except Exception as e:
        REQUEST_COUNT.labels(endpoint="/analyze", status="error").inc()
        logger.error("Request failed", extra={"event_data": {
            "event": "request_error",
            "endpoint": "/analyze",
            "trace_id": trace_id,
            "error": str(e),
        }})
        status, msg = friendly_error(e)
        raise HTTPException(status_code=status, detail=msg)
    finally:
        REQUEST_LATENCY.labels(endpoint="/analyze").observe(time.perf_counter() - start)


@app.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_with_upload(
    job_description: str = Form(...),
    cv_file: UploadFile = File(...),
):
    trace_id = str(uuid.uuid4())
    start = time.perf_counter()

    try:
        cv_text = await extract_text_from_file(cv_file)

        if not cv_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the uploaded file.",
            )

        logger.info("Upload request received", extra={"event_data": {
            "event": "request_start",
            "endpoint": "/analyze/upload",
            "trace_id": trace_id,
            "filename": cv_file.filename,
        }})

        initial_state = {
            "job_description": job_description,
            "cv_text": cv_text,
            "trace_id": trace_id,
        }

        final_state = app_graph.invoke(initial_state)
        _cv_text_cache[trace_id] = cv_text

        logger.info("Upload request complete", extra={"event_data": {
            "event": "request_complete",
            "endpoint": "/analyze/upload",
            "trace_id": trace_id,
        }})

        REQUEST_COUNT.labels(endpoint="/analyze/upload", status="success").inc()
        return build_response(final_state)
    except HTTPException:
        REQUEST_COUNT.labels(endpoint="/analyze/upload", status="error").inc()
        raise
    except Exception as e:
        REQUEST_COUNT.labels(endpoint="/analyze/upload", status="error").inc()
        status, msg = friendly_error(e)
        raise HTTPException(status_code=status, detail=msg)
    finally:
        REQUEST_LATENCY.labels(endpoint="/analyze/upload").observe(time.perf_counter() - start)


@app.post("/rescore", response_model=AnalyzeResponse)
def rescore_application(request: RescoreRequest):
    start = time.perf_counter()
    try:
        # Reconstruct domain objects
        jp = JobProfile(
            title=request.job_profile.title,
            required_skills=request.job_profile.required_skills,
            preferred_skills=request.job_profile.preferred_skills,
            experience_level=request.job_profile.experience_level,
            responsibilities=request.job_profile.responsibilities,
        )

        # Build matched/missing lists, applying disputes
        disputed_names = {d.skill for d in request.disputed_skills}

        matched_skills = [
            SkillMatch(skill=s.skill, matched=True, evidence=s.evidence)
            for s in request.analysis.matched_skills
        ]
        missing_skills = []
        for skill in request.analysis.missing_skills:
            if skill in disputed_names:
                matched_skills.append(SkillMatch(skill=skill, matched=True, evidence="Confirmed by candidate"))
            else:
                missing_skills.append(skill)

        matched_preferred = [
            SkillMatch(skill=s.skill, matched=True, evidence=s.evidence)
            for s in request.analysis.matched_preferred
        ]
        missing_preferred = []
        for skill in request.analysis.missing_preferred:
            if skill in disputed_names:
                matched_preferred.append(SkillMatch(skill=skill, matched=True, evidence="Confirmed by candidate"))
            else:
                missing_preferred.append(skill)

        analysis = AlignmentAnalysis(
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            matched_preferred=matched_preferred,
            missing_preferred=missing_preferred,
            overall_fit=request.analysis.overall_fit,
        )

        # Re-run writer if we have cached cv_text, otherwise keep original cover letter
        cv_text = _cv_text_cache.get(request.trace_id)
        if cv_text:
            writer_output = rewrite(jp, analysis, cv_text)
            cover_letter = writer_output["cover_letter"]
            cv_suggestions = writer_output["cv_suggestions"]
        else:
            cover_letter = request.cover_letter
            cv_suggestions = []

        # Rescore
        scorer_output = rescore(jp, analysis, cover_letter)

        from api.schemas import (
            AnalysisResponse, SkillMatchResponse, ScoreResponse,
            DimensionScoreResponse, JobProfileResponse,
        )

        return AnalyzeResponse(
            job_title=jp.title,
            job_profile=JobProfileResponse(
                title=jp.title,
                required_skills=jp.required_skills,
                preferred_skills=jp.preferred_skills,
                experience_level=jp.experience_level,
                responsibilities=jp.responsibilities,
            ),
            analysis=AnalysisResponse(
                matched_skills=[
                    SkillMatchResponse(skill=m.skill, matched=m.matched, evidence=m.evidence)
                    for m in analysis.matched_skills
                ],
                missing_skills=analysis.missing_skills,
                matched_preferred=[
                    SkillMatchResponse(skill=m.skill, matched=m.matched, evidence=m.evidence)
                    for m in analysis.matched_preferred
                ],
                missing_preferred=analysis.missing_preferred,
                overall_fit=analysis.overall_fit,
            ),
            cv_suggestions=cv_suggestions,
            cover_letter=cover_letter,
            score=ScoreResponse(
                dimensions=[
                    DimensionScoreResponse(
                        dimension=d.dimension, score=d.score,
                        weight=d.weight, reasoning=d.reasoning,
                    )
                    for d in scorer_output.dimensions
                ],
                overall_score=scorer_output.overall_score,
                summary=scorer_output.summary,
            ),
            trace_id=request.trace_id,
        )
    except Exception as e:
        logger.error("Rescore failed", extra={"event_data": {
            "event": "request_error",
            "endpoint": "/rescore",
            "error": str(e),
        }})
        status, msg = friendly_error(e)
        raise HTTPException(status_code=status, detail=msg)
    finally:
        REQUEST_LATENCY.labels(endpoint="/rescore").observe(time.perf_counter() - start)


# Serve frontend static files (must be after API routes)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
