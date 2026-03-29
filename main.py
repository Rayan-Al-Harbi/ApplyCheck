from dotenv import load_dotenv
load_dotenv()

import logging
import uuid
from logging_config import setup_logging
from extraction import extract_job_profile, extract_cv_profile
from chunking import chunk_cv
from rag import store_cv_chunks, retrieve_relevant_chunks, get_cv_context, keyword_search, TOKEN_THRESHOLD
from analysis import analyze_alignment, classify_skills

setup_logging()
logger = logging.getLogger("applycheck.main")


# --- Sample job description ---
sample_job = """As a Product Engineer Intern, you will contribute to real squads building products that millions of users rely on to shop, pay, and bank. This is not a traditional software engineering internship — you will be expected to develop across all five competency pillars of Tamara's Product Engineering career framework:

Impact & Scope — Individual tasks and learning-focused contributions within a squad

You will work on well-defined tasks and small features within a squad, paired with a mentor who provides clear requirements and established patterns. Your primary focus is learning how your work fits into the broader product and building the habits needed to operate as an independent contributor.

Technical Capabilities — Building Foundational Engineering Skills

You will begin developing core programming competencies, learn to write clean code with guidance, and start becoming familiar with the codebase, tools, and development workflows used at Tamara. You are not expected to be an expert — you are expected to be curious, ask questions, and grow quickly.

Product Thinking — Understanding the "why" behind your work

You will learn how Tamara's business model works and gain an understanding of your team's domain. For every ticket you pick up, you'll be encouraged to understand the user story behind it — not just what to build, but why it matters to the customer.

Delivery & Execution — Owning your tasks end-to-end

You will take ownership of your assigned tasks — making sure they meet acceptance criteria, are code-reviewed, well-tested, and merged. When you hit a blocker or a gap in understanding, you'll proactively ask for help rather than stay stuck.

Developing Self & Team — Growing fast and contributing to the team

You will focus on continuously enhancing your technical skills while embracing new knowledge and learning opportunities. You'll collaborate effectively with your team, ask good questions, and contribute to process improvements — influencing collective growth from day one.

Your Responsibilities

Deliver well-defined tasks and small features within a squad, following established patterns and guidance from your mentor.
Write clean, readable code and participate in code reviews to learn team standards and best practices.
Understand the user stories and product context behind the tickets you work on — connect your technical work to customer impact.
Take ownership of your tasks through the full lifecycle: development, testing, review, and merge.
Proactively flag blockers, ask clarifying questions, and seek feedback to accelerate your learning.
Contribute to a collaborative team environment by sharing learnings, offering constructive feedback, and staying open to input from others.
Stay curious about Tamara's business model, your team's domain, and emerging technologies.

Your Expertise

Currently undertaking a Bachelor's degree in Computer Science, Engineering, or a related field.
Basic understanding of programming concepts and willingness to learn languages and frameworks used at Tamara (Java or Golang).
Foundational understanding of databases and SQL.
Strong problem-solving abilities with attention to detail.
A product-minded approach: genuine curiosity about why things are built, not just how.
Effective communication skills and ability to collaborate within a team.
High motivation and commitment to continuous learning and development.
Proficiency in written and spoken English communication.

Growth Path

Role

This internship is designed as a launchpad into Tamara's Product Engineering Ladder. High-performing interns will automatically get the option to continue as an Associate Product Engineer role, where you will be expected to:

Independently deliver well-defined tasks within a squad.
Understand basic programming concepts and apply them with growing autonomy.
Grasp the overall Tamara business model and your team's domain.
Take full ownership of your tasks from development through merge.
Contribute to team growth by questioning, learning, and improving processes.

 """

# --- Sample CV ---
sample_cv = """
Name: Sarah Chen

Summary:
Experienced software engineer with 4 years of backend development, specializing in Python and cloud infrastructure.

Skills:
Python, Django, REST APIs, PostgreSQL, Docker, AWS, Git, Linux

Experience:
- Software Engineer at TechCorp (2021 - Present)
  Built and maintained microservices using Python and Django. Deployed services on AWS using Docker.

- Junior Developer at StartupXYZ (2020 - 2021)
  Developed internal REST APIs and managed PostgreSQL databases.

Education:
- B.Sc. Computer Science, University of Cityville, 2020
"""


# TODO: remove print_state and clean when deploying (debug only)
def clean(text: str) -> str:
    return " ".join(text.split())


def print_state(state: dict, label: str):
    logger.info(f"Node complete: {label}", extra={"event_data": {
        "event": "node_complete",
        "node": label,
    }})
    for key, value in state.items():
        if value is None or key in ("current_agent", "is_complete"):
            continue
        if key in ("job_description", "cv_text"):
            logger.debug(f"{key}: ({len(str(value).split())} words)")
        elif key == "cover_letter":
            logger.debug(f"{key}: {clean(str(value))[:200]}...")
        elif key == "cv_suggestions":
            logger.info(f"{key}: [{len(value)} suggestions]")
            for i, s in enumerate(value, 1):
                logger.debug(f"  {i}. {clean(s)}")
        elif key == "alignment_analysis":
            a = value
            matched = [m.skill for m in a.matched_skills] if hasattr(a, 'matched_skills') else [m["skill"] for m in a["matched_skills"]]
            missing = a.missing_skills if hasattr(a, 'missing_skills') else a["missing_skills"]
            logger.info(f"{key}: matched={matched}, missing={missing}")
        elif key == "job_profile":
            title = value.title if hasattr(value, 'title') else value["title"]
            skills = value.required_skills if hasattr(value, 'required_skills') else value["required_skills"]
            logger.info(f"{key}: {title} ({len(skills)} required skills)")
        elif key == "scorer_output":
            logger.info(f"Overall Score: {value.overall_score}/100")
            for d in value.dimensions:
                bar = "█" * int(d.score // 5) + "░" * (20 - int(d.score // 5))
                logger.info(f"  {d.dimension:<22} {bar} {d.score:5.1f}  (w={d.weight:.0%})")
                logger.debug(f"  {'':22} {clean(d.reasoning)}")
            logger.info(f"Summary: {clean(value.summary)}")
        else:
            logger.debug(f"{key}: {value}")


if __name__ == "__main__":
    from graph import app

    trace_id = str(uuid.uuid4())
    initial_state = {
        "job_description": sample_job,
        "cv_text": sample_cv,
        "trace_id": trace_id,
    }

    logger.info("Running LangGraph pipeline", extra={"event_data": {
        "event": "pipeline_start",
        "trace_id": trace_id,
    }})
    logger.info("supervisor -> analyzer -> supervisor -> writer -> supervisor -> scorer -> END")

    for event in app.stream(initial_state, stream_mode="updates"):
        for node_name, updates in event.items():
            if node_name == "supervisor":
                continue
            print_state(updates, node_name)
