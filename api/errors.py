import re


def friendly_error(e: Exception) -> tuple[int, str]:
    """Map known exceptions to user-friendly messages. Returns (status_code, message)."""
    msg = str(e)
    if "rate_limit" in msg or "429" in msg:
        match = re.search(r"try again in ([^.]+\.\d+s)", msg, re.IGNORECASE)
        wait = f" Please wait {match.group(1)} and try again." if match else " Please wait a moment and try again."
        return 429, f"The AI service is temporarily busy.{wait}"
    if "401" in msg or "auth" in msg.lower():
        return 502, "AI service authentication error. Please contact support."
    if "timeout" in msg.lower() or "timed out" in msg.lower():
        return 504, "The analysis took too long. Please try again with a shorter job description or CV."
    return 500, "Something went wrong during analysis. Please try again."
