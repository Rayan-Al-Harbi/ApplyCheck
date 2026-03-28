import json
import os
from groq import Groq
from pydantic import ValidationError
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def retry_llm_call(raw: str, error: str) -> str:
    """Ask the LLM to fix its own malformed JSON output."""
    prompt = (
        "Your previous JSON response could not be parsed. "
        "Fix it and return only valid JSON with no markdown fences and no explanation.\n\n"
        f"Parse error: {error}\n\n"
        f"Your previous response:\n{raw}"
    )
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return response.choices[0].message.content


def parse_llm_json(raw: str, model_class, max_retries: int = 2):
    for attempt in range(max_retries + 1):
        try:
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = json.loads(clean)
            return model_class(**parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise
            raw = retry_llm_call(raw, str(e))
