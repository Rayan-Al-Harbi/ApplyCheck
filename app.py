import warnings
warnings.filterwarnings("ignore", message=".*Accessing.*__path__.*")

import logging
logging.getLogger("transformers").setLevel(logging.ERROR)

import os
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

from model import SkillMatch, AlignmentAnalysis
from agents.scorer import rescore


@st.cache_resource
def get_pipeline():
    from graph import app as langgraph_app
    return langgraph_app


langgraph_app = get_pipeline()

st.set_page_config(page_title="ApplyCheck", layout="wide")
st.title("ApplyCheck")
st.caption("AI-powered job application analysis")

# --- Inputs ---
col1, col2 = st.columns(2)

with col1:
    st.subheader("Job Description")
    job_description = st.text_area(
        "Paste the job description",
        height=300,
        placeholder="Paste the full job description here...",
    )

with col2:
    st.subheader("CV")
    input_method = st.radio("Input method", ["Paste text", "Upload file"], horizontal=True)

    if input_method == "Paste text":
        cv_text = st.text_area(
            "Paste your CV",
            height=300,
            placeholder="Paste your CV content here...",
        )
    else:
        uploaded_file = st.file_uploader("Upload CV", type=["pdf", "docx", "txt"])
        cv_text = ""
        if uploaded_file:
            if uploaded_file.name.endswith(".pdf"):
                import fitz
                doc = fitz.open(stream=uploaded_file.read(), filetype="pdf")
                cv_text = "\n".join(page.get_text() for page in doc)
            elif uploaded_file.name.endswith(".docx"):
                import docx
                from io import BytesIO
                doc = docx.Document(BytesIO(uploaded_file.read()))
                cv_text = "\n".join(p.text for p in doc.paragraphs)
            elif uploaded_file.name.endswith(".txt"):
                cv_text = uploaded_file.read().decode("utf-8")

            if cv_text:
                st.success(f"Extracted {len(cv_text.split())} words")

# --- Run Analysis ---
if st.button("Analyze Application", type="primary", disabled=not (job_description and cv_text)):
    with st.spinner("Running pipeline... (this takes 20-40 seconds)"):
        # Clear old CV chunks so previous runs don't contaminate retrieval
        from rag import qdrant, COLLECTION_NAME
        if qdrant.collection_exists(COLLECTION_NAME):
            qdrant.delete_collection(COLLECTION_NAME)

        initial_state = {
            "job_description": job_description,
            "cv_text": cv_text,
        }

        final_state = langgraph_app.invoke(initial_state)

    # Store results in session state for the dispute flow
    st.session_state["final_state"] = final_state
    st.session_state["disputed_skills"] = set()


# --- Display Results ---
if "final_state" not in st.session_state:
    st.stop()

final_state = st.session_state["final_state"]
scorer_output = final_state["scorer_output"]
analysis = final_state["alignment_analysis"]

# Score overview
st.divider()
st.header(f"Overall Score: {scorer_output.overall_score:.0f}/100")

# Dimension scores
cols = st.columns(len(scorer_output.dimensions))
for col, dim in zip(cols, scorer_output.dimensions):
    with col:
        st.metric(
            label=dim.dimension,
            value=f"{dim.score:.0f}",
        )
        st.caption(dim.reasoning)

st.divider()

# --- Skills Analysis with Dispute ---
all_matched = list(analysis.matched_skills) + list(analysis.matched_preferred)
all_missing_required = analysis.missing_skills
all_missing_preferred = analysis.missing_preferred
all_missing = all_missing_required + all_missing_preferred

col_match, col_miss = st.columns(2)

with col_match:
    st.subheader(f"Matched Skills ({len(all_matched)})")
    for m in all_matched:
        with st.expander(f"✅ {m.skill}"):
            st.write(m.evidence)

with col_miss:
    has_missing = bool(all_missing)

    if has_missing:
        st.subheader(f"Missing Skills ({len(all_missing)})")
        st.caption("Check the skills you actually have:")
        for skill in all_missing_required:
            st.checkbox(f"❌ {skill}", key=f"dispute_req_{skill}")
        for skill in all_missing_preferred:
            st.checkbox(f"❌ {skill}", key=f"dispute_pref_{skill}")

    # Recalculate button
    if has_missing:
        if st.button("Recalculate Score", type="secondary"):
            # Gather disputed skills
            disputed_required = [
                s for s in all_missing_required
                if st.session_state.get(f"dispute_req_{s}", False)
            ]
            disputed_preferred = [
                s for s in all_missing_preferred
                if st.session_state.get(f"dispute_pref_{s}", False)
            ]

            if not disputed_required and not disputed_preferred:
                st.warning("Check at least one skill to recalculate.")
            else:
                with st.spinner("Rescoring..."):
                    # Convert existing SkillMatch objects to dicts to avoid
                    # stale class references after Streamlit re-imports
                    def _to_dict(sm):
                        if hasattr(sm, "model_dump"):
                            return sm.model_dump()
                        return {"skill": sm.skill, "matched": sm.matched, "evidence": sm.evidence}

                    new_matched = [_to_dict(m) for m in analysis.matched_skills] + [
                        {"skill": s, "matched": True, "evidence": "Confirmed by candidate"}
                        for s in disputed_required
                    ]
                    new_missing = [s for s in all_missing_required if s not in disputed_required]

                    new_matched_pref = [_to_dict(m) for m in analysis.matched_preferred] + [
                        {"skill": s, "matched": True, "evidence": "Confirmed by candidate"}
                        for s in disputed_preferred
                    ]
                    new_missing_pref = [s for s in all_missing_preferred if s not in disputed_preferred]

                    updated_analysis = AlignmentAnalysis(
                        matched_skills=new_matched,
                        missing_skills=new_missing,
                        matched_preferred=new_matched_pref,
                        missing_preferred=new_missing_pref,
                        overall_fit=analysis.overall_fit,
                    )

                    # Re-run scorer only
                    new_score = rescore(
                        final_state["job_profile"],
                        updated_analysis,
                        final_state["cover_letter"],
                    )

                    # Update session state
                    final_state["scorer_output"] = new_score
                    final_state["alignment_analysis"] = updated_analysis
                    st.session_state["final_state"] = final_state
                    st.rerun()

st.divider()

# CV Suggestions
st.subheader("CV Improvement Suggestions")
for i, suggestion in enumerate(final_state["cv_suggestions"], 1):
    st.info(f"**{i}.** {suggestion}")

st.divider()

# Cover Letter
st.subheader("Generated Cover Letter")
st.text_area(
    "Cover letter (copy from here)",
    value=final_state["cover_letter"],
    height=300,
    label_visibility="collapsed",
)

# Summary
st.divider()
st.subheader("Summary")
st.write(scorer_output.summary)
