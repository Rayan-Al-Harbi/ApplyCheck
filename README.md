# ApplyCheck

> Multi-agent AI system that analyzes job applications by comparing structured CV data with job requirements.

## What It Does

ApplyCheck takes a CV and a job posting, then runs them through a pipeline of specialized AI agents to produce a detailed compatibility analysis. Instead of a single monolithic prompt, it breaks the problem into focused subtasks — extraction, alignment, writing, scoring — each handled by a dedicated agent.

**Key features:**
- Skill-by-skill alignment with evidence from CV content
- Separate evaluation rules for hard skills, soft skills
- Cover letter generation tailored to matched strengths
- Actionable CV improvement suggestions
- Skill dispute flow — users can verify skills the AI missed, triggering a rescore
- Experience level gap detection in scoring
- JWT authentication with persistent CV storage and analysis history
-

## Architecture

```
                                       ┌──────────────────┐
                                       │ Supervisor Agent  │
                                       └─────────┬────────┘
                                                 │
                                ┌────────────────┼─────────────────┐
                                ▼                ▼                 ▼
                        ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
                        │ Analyzer Agent │ │ Writer Agent  │ │ Scorer Agent │
                        └─────────┬──────┘ └───────┬──────┘ └───────┬──────┘
                                  │                │                │
                                  ▼                ▼                ▼
                         ┌──────────────────────────────────────────────┐
                         │              RAG Pipeline                    │
                         │  Qdrant + sentence-transformers (384-dim)    │
                         └──────────────────────────────────────────────┘
```

**Supervisor** orchestrates three subagents via LangGraph:
- **Analyzer** — Extracts job profile, chunks and embeds CV into Qdrant, classifies skills by type, evaluates each skill with type-specific rules, returns alignment analysis
- **Writer** — Generates CV suggestions and a tailored cover letter grounded in matched skill evidence
- **Scorer** — Scores across three weighted dimensions (Skill Match, Experience Relevance, Overall Presentation) with experience level gap awareness

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Orchestration** | LangGraph (multi-agent state graph) |
| **LLM** | Groq API — gpt-oss-120b | llama-3.3-70b-versatile (Writer agent)
| **RAG** | Qdrant + sentence-transformers (all-MiniLM-L6-v2) |
| **Backend** | FastAPI, SQLAlchemy, PostgreSQL |
| **Frontend** | React + Vite + TypeScript + Tailwind CSS |
| **Auth** | JWT + bcrypt |
| **Monitoring** | Prometheus + Grafana |
| **Deployment** | Docker, Railway |

## Setup & Running

```bash
# Backend
pip install -r requirements.txt
# add GROQ_API_KEY=your_key_here to a .env file
uvicorn api.main:app --port 8000

# Frontend (dev)
cd frontend && npm install && npm run dev  # proxies API to localhost:8000

# Docker (full stack)
docker compose up --build  # app + PostgreSQL + Qdrant + Prometheus + Grafana
```

## Project Structure

```
├── agents/              # Subagent definitions (analyzer, writer, scorer)
├── api/                 # FastAPI layer
│   ├── main.py          # App entrypoint, guest endpoints, /rescore
│   ├── auth.py          # JWT registration/login
│   ├── cv.py            # CV upload/retrieval
│   ├── analysis.py      # Authenticated analysis + history (SSE streaming)
│   ├── schemas.py       # Request/response Pydantic models
│   ├── metrics.py       # Prometheus metric definitions
│   ├── errors.py        # User-friendly error mapping
│   └── utils.py         # Response building, file extraction
├── db/                  # SQLAlchemy models + config
├── frontend/            # React SPA
│   └── src/
│       ├── components/  # Auth, dashboard, analyze, history, results, loading
│       ├── contexts/    # AuthContext (JWT)
│       ├── hooks/       # useAnalysis (dispute + rescore state machine)
│       └── api/         # Client functions + TypeScript types
├── monitoring/          # Prometheus + Grafana configs
├── graph.py             # LangGraph workflow definition
├── state.py             # Shared state schema
├── model.py             # Pydantic domain models
├── prompt.py            # All prompt templates
├── extraction.py        # LLM-based CV/job extraction
├── analysis.py          # Skill classification + alignment logic
├── rag.py               # Qdrant vector storage + hybrid retrieval
├── chunking.py          # Section-based CV chunking
├── utils.py             # Shared LLM call wrapper + JSON parsing
├── Dockerfile           # Multi-stage build (Node + Python)
└── docker-compose.yml   # Full local stack
```

## Skill Dispute Flow

1. User reviews missing skills after analysis
2. Checks skills they actually have → clicks "Recalculate Score"
3. Backend moves disputed skills from missing → matched, re-runs writer + scorer
4. Updated results persist to database for authenticated users
5. Cover letter and scores reflect the corrected skill set

## Status

This is an active project exploring multi-agent architectures with LangGraph and RAG pipelines.

