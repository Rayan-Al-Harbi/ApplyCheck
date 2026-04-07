import json
import os
import time
from groq import Groq
from pydantic import ValidationError
from dotenv import load_dotenv

load_dotenv(override=True)

client = Groq(api_key=os.environ["GROQ_API_KEY"])

MODEL = "openai/gpt-oss-120b"
WRITER_MODEL = "llama-3.3-70b-versatile"


def tracked_llm_call(
    *,
    agent: str,
    messages: list[dict],
    temperature: float = 0,
    model: str = MODEL,
) -> str:
    """Wrapper around Groq chat completions that records Prometheus metrics."""
    from api.metrics import LLM_CALL_COUNT, LLM_LATENCY, LLM_ERROR_COUNT

    LLM_CALL_COUNT.labels(agent=agent, model=model).inc()
    start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content
    except Exception as e:
        error_type = type(e).__name__
        LLM_ERROR_COUNT.labels(agent=agent, error_type=error_type).inc()
        raise
    finally:
        elapsed = time.perf_counter() - start
        LLM_LATENCY.labels(agent=agent, model=model).observe(elapsed)


def retry_llm_call(raw: str, error: str, agent: str = "retry") -> str:
    """Ask the LLM to fix its own malformed JSON output."""
    prompt = (
        "Your previous JSON response could not be parsed. "
        "Fix it and return only valid JSON with no markdown fences and no explanation.\n\n"
        f"Parse error: {error}\n\n"
        f"Your previous response:\n{raw}"
    )
    return tracked_llm_call(
        agent=agent,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )


def _extract_json(text: str) -> str:
    """Strip markdown fences and extract the JSON object from LLM output."""
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    # If the LLM added text before/after the JSON, extract just the object
    start = clean.find("{")
    end = clean.rfind("}")
    if start != -1 and end != -1:
        clean = clean[start : end + 1]
    return clean


def parse_llm_json(raw: str, model_class, max_retries: int = 2, agent: str = "retry"):
    for attempt in range(max_retries + 1):
        try:
            clean = _extract_json(raw)
            parsed = json.loads(clean)
            return model_class(**parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise
            raw = retry_llm_call(raw, str(e), agent=agent)
