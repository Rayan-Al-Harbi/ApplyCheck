# ApplyCheck

> Multi-agent AI system that analyzes job applications by comparing structured CV data with job requirements.

## What It Does

ApplyCheck takes a CV and a job posting, then runs them through a pipeline of specialized AI agents to produce a detailed compatibility analysis. Instead of a single monolithic prompt, it breaks the problem into focused subtasks — extraction, analysis, scoring — each handled by a dedicated agent.

## Architecture

```
                                       ┌──────────────────┐
                                       │ Supervisor Agent │
                                       └─────────┬────────┘
                                                 │
                                ┌────────────────┼─────────────────┐
                                ▼                ▼                 ▼
                        ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
                        │ Analyzer Agent │ │ Writer Agent │ │ Scorer Agent │
                        └─────────┬──────┘ └───────┬──────┘ └───────┬──────┘
                                  │                │                │
                                  ▼                ▼                ▼
                                 ┌──────────────────────────────────┐
                                 │         RAG Pipeline             │
                                 │   (CV Extraction + Chunking)     │
                                 └──────────────────────────────────┘
```

**Supervisor** delegates tasks to three subagents:
- **Analyzer**  Parses CV structure and maps skills/experience to job requirements
- **Writer**  Generates narrative feedback and improvement suggestions  
- **Scorer**  Produces a quantified compatibility score with breakdowns

## Tech Stack

- **Orchestration:** LangGraph (multi-agent state graph)
- **LLM:** llama-3.3-70b-versatile
- **RAG:** Document chunking + structured extraction
- **Language:** Python

## Project Structure

```
├── agents/          # Subagent definitions (analyzer, writer, scorer)
│   ├── analyzer.py
│   ├── scorer.py
│   └── writer.py
├── main.py          # Entry point
├── graph.py         # LangGraph workflow definition
├── state.py         # Shared state schema
├── rag.py           # Retrieval-augmented generation logic
├── chunking.py      # Document chunking utilities
├── extraction.py    # CV/job posting data extraction
├── model.py         # LLM configuration
├── prompt.py        # Prompt templates
└── analysis.py      # Analysis orchestration
```
## Status

This is an active project exploring multi-agent architectures with LangGraph and RAG pipelines.
