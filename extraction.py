import os
from groq import Groq
from dotenv import load_dotenv
from model import JobProfile, CandidateProfile
from prompt import JOB_EXTRACTION_PROMPT, CV_EXTRACTION_PROMPT
from utils import parse_llm_json

load_dotenv()

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def extract_job_profile(job_description_text: str) -> JobProfile:
    prompt = JOB_EXTRACTION_PROMPT.format(
        job_description_text=job_description_text
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    return parse_llm_json(response.choices[0].message.content, JobProfile)


def extract_cv_profile(cv_description_text: str) -> CandidateProfile:
    prompt = CV_EXTRACTION_PROMPT.format(
        cv_description_text=cv_description_text
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    return parse_llm_json(response.choices[0].message.content, CandidateProfile)
