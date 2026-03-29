from dotenv import load_dotenv
load_dotenv()

import logging
import uuid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from api.schemas import AnalyzeRequest, AnalyzeResponse
from api.utils import build_response, extract_text_from_file
from graph import app as app_graph
from logging_config import setup_logging

setup_logging()
logger = logging.getLogger("applycheck.api")

app = FastAPI(
    title="Job Application Intelligence",
    version="0.1.0",
)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_application(request: AnalyzeRequest):
    trace_id = str(uuid.uuid4())
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

        logger.info("Request complete", extra={"event_data": {
            "event": "request_complete",
            "endpoint": "/analyze",
            "trace_id": trace_id,
        }})

        return build_response(final_state)
    except Exception as e:
        logger.error("Request failed", extra={"event_data": {
            "event": "request_error",
            "endpoint": "/analyze",
            "trace_id": trace_id,
            "error": str(e),
        }})
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_with_upload(
    job_description: str = Form(...),
    cv_file: UploadFile = File(...),
):
    trace_id = str(uuid.uuid4())

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

    logger.info("Upload request complete", extra={"event_data": {
        "event": "request_complete",
        "endpoint": "/analyze/upload",
        "trace_id": trace_id,
    }})

    return build_response(final_state)
