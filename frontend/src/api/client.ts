import type { AnalyzeResponse, RescoreRequest } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function analyzeUpload(
  jobDescription: string,
  cvFile: File
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("job_description", jobDescription);
  form.append("cv_file", cvFile);

  const res = await fetch(`${BASE_URL}/analyze/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }

  return res.json();
}

export async function rescoreAnalysis(
  request: RescoreRequest
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/rescore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Rescore failed" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }

  return res.json();
}
