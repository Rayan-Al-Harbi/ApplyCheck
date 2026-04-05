# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ApplyCheck** uses the Groq API (llama-3.3-70b-versatile) to extract structured data from job descriptions and CVs, then match candidates to jobs.

## Setup & Running

```bash
# Backend
pip install -r requirements.txt
# add GROQ_API_KEY=your_key_here to a .env file
# add LANGCHAIN_TRACING_V2=true, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT, LANGCHAIN_ENDPOINT to .env for LangSmith
uvicorn api.main:app --port 8000

# Frontend (dev)
cd frontend && npm install && npm run dev  # proxies API to localhost:8000

# Docker (full stack)
docker compose up --build  # app + Qdrant + Prometheus + Grafana

# CLI entry point (testing only)
python main.py

# Monitoring stack (local only)
docker compose -f docker-compose.monitoring.yml up -d
```

## Architecture

Extraction + RAG + alignment analysis pipeline:

1. **`model.py`** — Pydantic models: `JobProfile`, `CandidateProfile` (with nested `Experience` and `Education`), `SkillMatch` (skill, matched, evidence), `AlignmentAnalysis` (matched_skills, missing_skills, overall_fit), `DimensionScore` (dimension, score, weight, reasoning), and `ScorerOutput` (dimensions, overall_score, summary). `ScorerOutput` has a `@model_validator` that corrects `overall_score` to the weighted average if the LLM drifts by more than 2 points.

2. **`prompt.py`** — Prompt templates: `JOB_EXTRACTION_PROMPT`, `CV_EXTRACTION_PROMPT`, `SKILL_EVAL_PROMPT` (placeholders: `{skill}`, `{context}`, `{rules}`), `OVERALL_FIT_PROMPT` (placeholders: `{title}`, `{matched_list}`, `{missing_list}`), `SKILL_CLASSIFIER_PROMPT`, `WRITER_PROMPT` (placeholders: `{title}`, `{responsibilities}`, `{analysis}`, `{overall_fit}`, `{cv_text}` — analysis includes per-skill evidence inline), and `SCORER_PROMPT` (placeholders: `{job_profile}`, `{analysis}`, `{cover_letter}` — hardcodes three weighted dimensions: Skill Match 35%, Experience Relevance 35%, Overall Presentation 30%). Three rule blocks injected per skill type: `HARD_SKILL_EVAL_RULES` (explicit mention or direct technical synonym), `SOFT_SKILL_EVAL_RULES` (behavioral inference from work history — does not require exact skill name in CV), `LANGUAGE_EVAL_RULES` (CV language or explicit mention). Use double-braces `{{}}` for literal JSON and single-brace for `.format()` injection.

3. **`extraction.py`** — LLM calls via `tracked_llm_call(agent="analyzer")` at temperature 0. Imports directly from `model.py` and `prompt.py`. `extract_job_profile` and `extract_cv_profile` are decorated with `@traceable` for LangSmith tracing. Each function logs latency and key output fields via structured logging.

4. **`analysis.py`** — Phase 3 alignment logic. `classify_skills(skills)` calls LLM via `tracked_llm_call(agent="analyzer")` with `SKILL_CLASSIFIER_PROMPT` and returns `dict[str, SkillType]`. `evaluate_skill_match(skill, context, skill_type)` selects rules via `_RULES_BY_TYPE` dict and calls LLM with `SKILL_EVAL_PROMPT`, returns a `SkillMatch` — decorated with `@traceable` for LangSmith. `generate_overall_fit(job_profile, matched, missing)` returns a narrative string. `analyze_alignment(job_profile, cv_text, chunks_stored, skill_types)` accepts an optional pre-computed `skill_types` to avoid redundant `classify_skills` calls — iterates required skills, retrieves context, evaluates each, returns `AlignmentAnalysis`. All LLM calls go through `tracked_llm_call` for Prometheus metrics.

5. **`main.py`** — CLI entry point with hardcoded sample job and CV strings. Calls `setup_logging()` at startup and generates a `trace_id` for the run. Streams the LangGraph pipeline and logs state updates per node via structured logger. Scorer output is displayed as a formatted bar chart with per-dimension scores. Run with `PYTHONIOENCODING=utf-8` on Windows when CV contains non-ASCII characters.

6. **`chunking.py`** — Semantic section-based CV chunking. Splits on ~60 known CV section headers (Summary, Skills, Experience, Education, Projects, Certifications, etc.) covering most CV formats. Headers are normalized — strips `#`, `-`, `=`, `:`, and handles any casing. Exposes `chunk_cv(cv_text: str) -> list[str]`.

7. **`rag.py`** — Vector storage and retrieval using Qdrant and `sentence-transformers` (`all-MiniLM-L6-v2`, 384-dim, cosine similarity). Configurable connection: `QDRANT_URL` (managed/cloud), `QDRANT_HOST`/`QDRANT_PORT` (Docker), or `QDRANT_MEMORY=true` (in-process, for Railway). `TOKEN_THRESHOLD` is a module-level constant (default `200`) — single source of truth for short-CV detection. Key functions: `store_cv_chunks(chunks)`, `retrieve_relevant_chunks(query, top_k=3)` (semantic, returns `{"text", "score"}` dicts), `keyword_search(skill)` (scroll + substring match, exact keyword hits), `get_cv_context(cv_text, skill, chunks_stored)` (hybrid: keyword hits first + semantic fallback, merged and deduplicated, keyword results take priority).

8. **`graph.py`** — LangGraph `StateGraph` over `ApplicationState`. Four nodes: `supervisor` (routes based on which fields are still `None`), `analyzer`, `writer`, `scorer`. Flow: supervisor → analyzer → supervisor → writer → supervisor → scorer → END. Conditional edges from supervisor dispatch to the correct agent node.

9. **`agents/analyzer.py`** — Extracts job profile, chunks and stores CV, classifies skills, runs alignment analysis. Logs `agent_start`/`agent_complete` events with `trace_id` and `latency_ms`. Records `AGENT_LATENCY` and `PIPELINE_ERROR_COUNT` via Prometheus. Returns `job_profile` and `alignment_analysis`.

10. **`agents/writer.py`** — Generates CV suggestions and a cover letter via `tracked_llm_call(agent="writer")`. `_format_analysis()` renders matched skills with evidence inline so the LLM can ground suggestions in actual CV content. `rewrite(job_profile, analysis, cv_text)` is a standalone function for the `/rescore` endpoint — same logic as `writer_node` but callable without LangGraph state. Records `AGENT_LATENCY` and `PIPELINE_ERROR_COUNT`. Returns `cv_suggestions` and `cover_letter`.

11. **`agents/scorer.py`** — Scores the application across four weighted dimensions via `tracked_llm_call(agent="scorer")`. `_format_job_profile()` and `_format_analysis()` build rich context for the prompt. Parses response into `ScorerOutput` via Pydantic. `rescore(job_profile, analysis, cover_letter)` is a standalone function for the `/rescore` endpoint. Records `AGENT_LATENCY`, `PIPELINE_ERROR_COUNT`, `SCORE_DISTRIBUTION`, and `SKILLS_MATCHED` ratio. Returns `scorer_output`.

12. **`state.py`** — `ApplicationState` (Pydantic BaseModel) used as LangGraph shared state. Fields: inputs (`job_description`, `cv_text`), Phase 1 outputs (`job_profile`, `candidate_profile`), analyzer output (`alignment_analysis`), writer outputs (`cv_suggestions`, `cover_letter`), scorer output (`scorer_output: ScorerOutput`), control (`current_agent`, `is_complete`, `trace_id`). `trace_id` is a correlation ID generated at request entry and propagated through all agent nodes via shared state.

13. **`utils.py`** — Shared LLM utilities. `tracked_llm_call(*, agent, messages, temperature=0, model=MODEL)` wraps all Groq API calls — records `LLM_CALL_COUNT`, `LLM_LATENCY`, and `LLM_ERROR_COUNT` via Prometheus. Every LLM call in the codebase goes through this function. `retry_llm_call(raw, error, agent="retry")` sends a broken response back to the LLM to self-correct. `parse_llm_json(raw, model_class, max_retries=2, agent="retry")` strips markdown code fences, parses JSON, validates via Pydantic, and retries up to `max_retries` times. `MODEL` constant (`llama-3.3-70b-versatile`) is the single source of truth for model name.

14. **`logging_config.py`** — `JSONFormatter` (custom `logging.Formatter` that outputs structured JSON with timestamp, level, logger name, message, and any extra `event_data` fields) and `setup_logging(level="INFO")` (configures root logger with JSON handler to stdout). Called at startup in both `api/main.py` and `main.py`.

15. **`api/main.py`** — FastAPI application. Registers routers: `auth_router`, `cv_router`, `analysis_router`. Guest endpoints: `GET /health`, `GET /metrics` (Prometheus), `POST /analyze` (JSON), `POST /analyze/upload` (multipart file upload), `POST /rescore` (skill dispute + rescore). CORS middleware enabled. Caches `cv_text` by `trace_id` in-memory for rescore/rewrite. Serves the React frontend as static files from `/static` (built into Docker image via multi-stage build). Catch-all route serves `index.html` for client-side routing.

16. **`api/schemas.py`** — Request/response Pydantic models. `AnalyzeRequest`, `AnalyzeResponse` (includes `job_profile: JobProfileResponse`, `analysis: AnalysisResponse`, `cv_suggestions`, `cover_letter`, `score: ScoreResponse`, `trace_id`). `RescoreRequest` (accepts `trace_id`, `job_profile`, `analysis`, `cover_letter`, `disputed_skills: list[DisputedSkill]`). `DisputedSkill` has `skill` and `category` ("required" or "preferred").

17. **`api/utils.py`** — `build_response(state)` maps internal domain models to API response schemas. `extract_text_from_file(file)` extracts text from PDF (PyMuPDF), DOCX (python-docx), or TXT uploads.

18. **`api/errors.py`** — Shared `friendly_error(e)` maps known exceptions (rate limit, auth, timeout) to user-friendly `(status_code, message)` tuples.

19. **`api/auth.py`** — JWT-based authentication. `POST /auth/register` (email + password → hashed via bcrypt → JWT returned), `POST /auth/login` (verify password → JWT returned). `get_current_user` FastAPI dependency validates JWT from `Authorization: Bearer` header. Config: `JWT_SECRET_KEY`, `JWT_EXPIRATION_DAYS` (default 7) from env.

20. **`api/cv.py`** — CV persistence endpoints. `POST /cv/upload` (extract text from file, run `extract_cv_profile()` via LLM, store/update in DB). `GET /cv` (retrieve stored CV with profile, timestamps). One CV per user — update overwrites.

21. **`api/analysis.py`** — Authenticated analysis + history endpoints. `POST /analyze/auth` returns an SSE stream (`text/event-stream`) — emits `agent_complete` events as each LangGraph node finishes (analyzer, writer, scorer), then a final `result` event with the full response. Uses `app_graph.stream()` to get real-time node completions. `GET /analyses` (paginated summary list). `GET /analyses/{id}` (full detail). `DELETE /analyses/{id}` (delete single). `DELETE /analyses` (clear all). `_determine_cv_changed()` compares `cv.updated_at` vs last analysis timestamp.

22. **`db/config.py`** — SQLAlchemy engine, `SessionLocal` session factory, `get_db` dependency. `DATABASE_URL` from env (default: `postgresql://applycheck:applycheck@localhost:5432/applycheck`).

23. **`db/models.py`** — SQLAlchemy ORM models: `User` (id, email, password_hash, created_at), `CV` (id, user_id UNIQUE, raw_text, profile JSONB, uploaded_at, updated_at), `Analysis` (id, user_id, job_description, job_profile JSONB, alignment JSONB, cv_suggestions JSONB, cover_letter, scorer_output JSONB, cv_changed, created_at). CASCADE deletes. Descending index on `(user_id, created_at)`.

18. **`api/metrics.py`** — Prometheus metric definitions (all prefixed `applycheck_`). RED counters: `REQUEST_COUNT` (endpoint/status), `LLM_CALL_COUNT` (agent/model), `LLM_ERROR_COUNT` (agent/error_type), `PIPELINE_ERROR_COUNT` (agent). Latency histograms: `REQUEST_LATENCY` (endpoint, 1–120s buckets), `AGENT_LATENCY` (agent, 0.5–30s), `LLM_LATENCY` (agent/model, 0.5–15s). AI-specific histograms: `SCORE_DISTRIBUTION` (10–100), `SKILLS_MATCHED` ratio (0.0–1.0). Imported lazily in `tracked_llm_call` and directly in agent nodes and `api/main.py`.

24. **`frontend/`** — React + Vite + TypeScript + Tailwind CSS SPA with React Router. Key structure:
    - `src/App.tsx` — `BrowserRouter` with `AuthProvider`. Routes: `/` (guest), `/login` (auth page), `/dashboard` (protected), `/analyze` (protected, JD-only input), `/history` (protected), `/history/:id` (protected detail). `ProtectedRoute` wrapper redirects to `/login` if unauthenticated.
    - `src/contexts/AuthContext.tsx` — `AuthProvider` + `useAuth()` hook. JWT stored in `localStorage`. Exposes `login()`, `register()`, `logout()`. Hydrates token on mount.
    - `src/api/types.ts` — TypeScript interfaces mirroring backend schemas (`AnalyzeResponse`, `AuthResponse`, `CVResponse`, `AnalysisSummary`, `AnalysisDetail`, etc.)
    - `src/api/client.ts` — `register()`, `login()`, `uploadCV()`, `getCV()`, `analyzeAuth()`, `getAnalyses()`, `getAnalysis()`, `analyzeUpload()`, `rescoreAnalysis()`. Auto-attaches `Authorization: Bearer` header via `authHeaders()`.
    - `src/hooks/useAnalysis.ts` — State machine hook managing phases, dispute selection, rescore flow, and `setExternalResult()` for authenticated analysis.
    - `src/components/auth/AuthPage.tsx` — Login/register form with toggle between modes. Glass-card styling, "Continue as guest" link.
    - `src/components/dashboard/Dashboard.tsx` — CV status card (upload/update), quick action card, recent analyses list (last 5).
    - `src/components/analyze/AnalyzePage.tsx` — Authenticated analysis: JD-only textarea (CV loaded from DB), uses existing results components.
    - `src/components/guest/GuestPage.tsx` — Original guest flow (JD + CV upload) with "Sign in for persistent history" link.
    - `src/components/loading/AnalysisProgress.tsx` — Agentic thinking UI: 3 agent cards (Analyzer, Writer, Scorer) with typewriter reasoning text, thought log, completion states. Replaces old 5-step progress indicator.
    - `src/components/history/HistoryPage.tsx` — Timeline of past analyses with CV change dividers, score circles, pagination.
    - `src/components/history/AnalysisDetailPage.tsx` — Full analysis detail: score overview, dimension bars, skills badges, cover letter with copy, CV suggestions.
    - `src/components/results/` — ResultsDashboard, ScoreOverview, SkillsPanel, DisputeBar, CollapsibleSection (unchanged).
    - `vite.config.ts` — Dev proxy routes `/auth`, `/cv`, `/analyze`, `/analyses`, `/rescore`, `/health` to `localhost:8000`.

25. **`Dockerfile`** — Multi-stage build. Stage 1: Node 20 builds the React frontend (`npm run build`). Stage 2: Python 3.11-slim installs requirements, copies app code + built frontend into `/app/static`. Uses shell-form CMD to read Railway's `$PORT` env var: `CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}`.

26. **`docker-compose.yml`** — Local full-stack: app (FastAPI + frontend), PostgreSQL 16 (with health check, persistent volume), Qdrant (with health check), Prometheus, Grafana. App depends on both postgres and qdrant being healthy. `DATABASE_URL` passed to app via environment.

27. **`docker-compose.monitoring.yml`** — Docker Compose for local monitoring stack only. Prometheus (port 9090) scrapes `host.docker.internal:8000/metrics` every 15s. Grafana (port 3000, admin/admin) with persistent volume.

28. **`monitoring/prometheus.yml`** — Prometheus scrape config targeting `app:8000` (Docker network).

29. **`monitoring/grafana-dashboard.json`** — Importable Grafana dashboard with 10 panels: request rate, request latency percentiles, error rate, agent latency, LLM latency, LLM call/error totals, score distribution, skills-match ratio, and LLM error vs call rate.

30. **`tests/`** — Phase 6 edge case test suite (not pushed to GitHub). Six test files covering: short/minimal CVs (`test_short_cv.py`), missing CV sections (`test_missing_sections.py`), vague job descriptions (`test_vague_jd.py`), malformed LLM output (`test_llm_output.py`), score consistency across runs (`test_score_consistency.py`), and Arabic/mixed-language CVs (`test_encoding.py`), plus a long well-structured CV (`test_long_cv.py`). Run with `pytest tests/ -m "not slow" -v`. Consistency tests are marked `@pytest.mark.slow` and make real API calls (3 runs per case).


## Skill Dispute Flow

Users can dispute missing skills after analysis:
1. Frontend shows missing skills with checkboxes
2. User checks skills they actually have → clicks "Recalculate Score"
3. `POST /rescore` receives disputed skills, moves them from missing → matched (evidence: "Confirmed by candidate")
4. Backend re-runs writer (new cover letter reflecting disputes) + scorer (new scores)
5. Frontend animates to updated scores; disputed skills show as purple badges


## Progress

- [x] Phase 1 — Foundation: Data Models & Simple Extraction
- [x] Phase 2 — RAG Pipeline: Embedding & Retrieving CV Content
- [x] Phase 3 — Single-Agent Analysis with RAG
- [x] Phase 4 — Multi-Agent Design with LangGraph
- [x] Phase 5 — FastAPI Integration
- [x] Phase 6 — Evaluation & Hardening
- [x] Phase 7 — Structured Logging & Tracing
- [x] Phase 8 — Monitoring & Observability Dashboard
- [x] Phase 9 — Containerization & Deployment
- [x] Phase 10 — Frontend
- [x] Phase 11 — Cloud Deployment (Railway)
- [x] Phase 12 — Authentication, CV Persistence & Analysis History

## Phase Overview

| # | Phase | Core Concept |
|---|-------|--------------|
| 1 | Foundation: Data Models & Simple Extraction | Structured outputs with Pydantic, basic prompt engineering |
| 2 | RAG Pipeline: Embedding & Retrieving CV Content | Embeddings, chunking strategies, similarity search |
| 3 | Single-Agent Analysis with RAG | RAG-augmented generation, context window management |
| 4 | Multi-Agent Design with LangGraph | Agent decomposition, state machines, LangGraph mechanics |
| 5 | FastAPI Integration | Request/response lifecycle, API design, async execution |
| 6 | Evaluation & Hardening | System evaluation, failure analysis, prompt iteration |
| 7 | Structured Logging & Tracing | LangSmith integration, correlation IDs, end-to-end request traceability |
| 8 | Monitoring & Observability Dashboard | Prometheus metrics, Grafana dashboard, latency/error/score visibility |
| 9 | Containerization & Deployment | Multi-stage Docker build, docker-compose, Railway-ready config |
| 10 | Frontend | React + Vite + Tailwind SPA with skill dispute flow, served by FastAPI |
| 11 | Cloud Deployment | Railway (free tier), in-memory Qdrant, monitoring stays local-only |
| 12 | Authentication, CV Persistence & Analysis History | JWT auth, PostgreSQL persistence, SSE streaming progress, multi-page SPA |

### Phase 1 — Foundation: Data Models & Simple Extraction
Define core data structures (Pydantic models) and build a single LLM call that extracts structured information from a job description and a CV. No agents, no RAG, no database — just clean inputs, a prompt, and validated outputs.

### Phase 2 — RAG Pipeline: Embedding & Retrieving CV Content
Chunk the CV, embed it into Qdrant, and retrieve relevant sections given a query. Understand why naively stuffing the whole CV into the prompt breaks down and how retrieval solves it.

### Phase 3 — Single-Agent Analysis with RAG
Combine Phase 1's extraction with Phase 2's retrieval into one agent that analyzes alignment between a job description and retrieved CV sections. First working end-to-end loop.

### Phase 4 — Multi-Agent Design with LangGraph
Split the monolithic agent into Analyzer, Writer, and Scorer agents orchestrated by a Supervisor. Wire them using LangGraph's graph primitives — nodes, edges, shared state, conditional routing.

### Phase 5 — FastAPI Integration
Wrap the agent graph behind a clean API. Handle file uploads, validation, async execution, and structured responses.

### Phase 6 — Evaluation & Hardening
Test with real CVs and job descriptions. Handle edge cases — short CVs, vague job descriptions, retrieval misses. Add scoring calibration and output quality checks.

### Phase 7 — Structured Logging & Tracing
Add LangSmith integration so every agent call is traceable. Add correlation IDs so a single API request can be debugged across all agent calls. Demonstrates observability thinking critical for production AI systems.

### Phase 8 — Monitoring & Observability Dashboard
Prometheus metrics (latency per agent, LLM error rates, score distributions) with a Grafana dashboard. Shows operational thinking beyond just development. Implemented locally and via Docker Compose — not included in the hosted deployment but visible in the repo.

### Phase 9 — Containerization & Deployment
Multi-stage Dockerfile (Node frontend build + Python runtime). `docker-compose.yml` with FastAPI, Qdrant, Prometheus, and Grafana for local development. Railway-ready: dynamic `$PORT`, health endpoint, configurable Qdrant (`QDRANT_URL`, `QDRANT_MEMORY`).

### Phase 10 — Frontend
React + Vite + TypeScript + Tailwind CSS SPA in `/frontend`. Upload form (drag-and-drop CV + job description), animated loading progress, results dashboard (score circle, dimension bars, skills panel, cover letter, suggestions). Skill dispute flow: checkboxes on missing skills, floating recalculate bar, `/rescore` endpoint re-runs writer + scorer.

### Phase 11 — Cloud Deployment
Deploy to Railway (free tier) for a shareable public URL. Stack:
- **FastAPI + Frontend** → Single Railway service (Dockerfile, static files served by FastAPI)
- **Qdrant** → In-memory (`QDRANT_MEMORY=true`) — no persistent vector DB needed (per-request processing)
- **Secrets** → Railway environment variables (GROQ_API_KEY, LangSmith keys)
- Prometheus/Grafana remain local-only (Docker Compose) — not deployed to Railway

### Phase 12 — Authentication, CV Persistence & Analysis History
JWT authentication with bcrypt password hashing, PostgreSQL with SQLAlchemy ORM and Alembic migrations. CV upload persisted to DB (one per user, update overwrites). Analysis results stored as JSONB — full history with pagination. SSE streaming from `/analyze/auth` emits real-time `agent_complete` events as LangGraph nodes finish, driving the agentic progress UI. Frontend rewritten as multi-page SPA: login/register, dashboard (CV status, recent analyses), JD-only analysis (CV from DB), history timeline, analysis detail view. Progress animation shows 3 agent cards with typewriter reasoning text, minimum display times for smooth transitions, and timer-based fallback for guest mode.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `QDRANT_MEMORY` | No | `false` | Set `true` for in-memory Qdrant (Railway) |
| `QDRANT_URL` | No | — | Managed Qdrant URL (overrides host/port) |
| `QDRANT_HOST` | No | `localhost` | Qdrant host |
| `QDRANT_PORT` | No | `6333` | Qdrant port |
| `PORT` | No | `8000` | Server port (set by Railway) |
| `LANGCHAIN_TRACING_V2` | No | — | Enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | No | — | LangSmith API key |
| `LANGCHAIN_PROJECT` | No | — | LangSmith project name |
| `DATABASE_URL` | No | `postgresql://applycheck:applycheck@localhost:5432/applycheck` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | No | `dev-secret-change-in-production` | Secret key for JWT signing |
| `JWT_EXPIRATION_DAYS` | No | `7` | JWT token expiration in days |
| `VITE_API_URL` | No | `""` | Frontend API base URL (for separate deployments) |
