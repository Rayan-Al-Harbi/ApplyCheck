import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.metrics import REQUEST_COUNT, REQUEST_LATENCY
from api.utils import build_response
from db.config import get_db
from db.models import User, CV, Analysis
from graph import app as app_graph

logger = logging.getLogger("applycheck.api.analysis")

router = APIRouter(tags=["analysis"])


# --- Schemas ---

class AuthAnalyzeRequest(BaseModel):
    job_description: str


class AnalysisSummary(BaseModel):
    id: str
    job_title: str
    overall_score: float
    matched_count: int
    missing_count: int
    cv_changed: bool
    created_at: str


class AnalysisListResponse(BaseModel):
    analyses: list[AnalysisSummary]
    total: int


# --- Helpers ---

def _save_analysis(db: Session, user_id, final_state: dict, job_description: str, cv_changed: bool) -> Analysis:
    job_profile = final_state["job_profile"]
    alignment = final_state["alignment_analysis"]
    scorer_output = final_state["scorer_output"]

    record = Analysis(
        user_id=user_id,
        job_description=job_description,
        job_profile=job_profile.model_dump(),
        alignment=alignment.model_dump(),
        cv_suggestions=final_state["cv_suggestions"],
        cover_letter=final_state["cover_letter"],
        scorer_output=scorer_output.model_dump(),
        cv_changed=cv_changed,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _determine_cv_changed(db: Session, user: User) -> bool:
    cv = db.query(CV).filter(CV.user_id == user.id).first()
    if not cv:
        return False

    last_analysis = (
        db.query(Analysis)
        .filter(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc())
        .first()
    )

    if not last_analysis:
        return False

    return cv.updated_at > last_analysis.created_at


# --- Endpoints ---

@router.post("/analyze/auth")
def analyze_authenticated(
    request: AuthAnalyzeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.user_id == user.id).first()
    if not cv:
        raise HTTPException(status_code=400, detail="Please upload your CV first")

    trace_id = str(uuid.uuid4())
    cv_changed = _determine_cv_changed(db, user)
    user_id = user.id
    cv_text = cv.raw_text
    job_description = request.job_description

    # Map LangGraph node names to frontend agent names
    NODE_TO_AGENT = {"analyzer": "analyzer", "writer": "writer", "scorer": "scorer"}

    def event_stream():
        start = time.perf_counter()
        try:
            initial_state = {
                "job_description": job_description,
                "cv_text": cv_text,
                "trace_id": trace_id,
            }

            # Stream collects partial state updates; merge them into full state
            accumulated = dict(initial_state)
            for event in app_graph.stream(initial_state):
                node_name = list(event.keys())[0]
                accumulated.update(event[node_name])
                if node_name in NODE_TO_AGENT:
                    yield f"data: {json.dumps({'type': 'agent_complete', 'agent': NODE_TO_AGENT[node_name]})}\n\n"

            # Persist to database
            from db.config import SessionLocal
            save_db = SessionLocal()
            try:
                record = _save_analysis(save_db, user_id, accumulated, job_description, cv_changed)
                analysis_id = str(record.id)
            finally:
                save_db.close()

            response_data = build_response(accumulated)
            resp = response_data.model_dump()
            resp["analysis_id"] = analysis_id
            yield f"data: {json.dumps({'type': 'result', 'data': resp})}\n\n"

            REQUEST_COUNT.labels(endpoint="/analyze/auth", status="success").inc()
        except Exception as e:
            from api.errors import friendly_error
            REQUEST_COUNT.labels(endpoint="/analyze/auth", status="error").inc()
            _status_code, msg = friendly_error(e)
            yield f"data: {json.dumps({'type': 'error', 'detail': msg})}\n\n"
        finally:
            REQUEST_LATENCY.labels(endpoint="/analyze/auth").observe(time.perf_counter() - start)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/analyses", response_model=AnalysisListResponse)
def list_analyses(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(Analysis).filter(Analysis.user_id == user.id).count()

    records = (
        db.query(Analysis)
        .filter(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    summaries = []
    for r in records:
        job_profile = r.job_profile
        alignment = r.alignment
        matched_count = len(alignment.get("matched_skills", []))
        missing_count = len(alignment.get("missing_skills", []))

        summaries.append(AnalysisSummary(
            id=str(r.id),
            job_title=job_profile.get("title", "Unknown"),
            overall_score=r.scorer_output.get("overall_score", 0),
            matched_count=matched_count,
            missing_count=missing_count,
            cv_changed=r.cv_changed,
            created_at=r.created_at.isoformat(),
        ))

    return AnalysisListResponse(analyses=summaries, total=total)


@router.get("/analyses/{analysis_id}")
def get_analysis(
    analysis_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == user.id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "id": str(record.id),
        "job_description": record.job_description,
        "job_profile": record.job_profile,
        "alignment": record.alignment,
        "cv_suggestions": record.cv_suggestions,
        "cover_letter": record.cover_letter,
        "scorer_output": record.scorer_output,
        "cv_changed": record.cv_changed,
        "created_at": record.created_at.isoformat(),
    }


@router.delete("/analyses/{analysis_id}")
def delete_analysis(
    analysis_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == user.id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(record)
    db.commit()
    return {"detail": "Analysis deleted"}


@router.delete("/analyses")
def delete_all_analyses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Analysis).filter(Analysis.user_id == user.id).delete()
    db.commit()
    return {"detail": f"Deleted {count} analyses"}
