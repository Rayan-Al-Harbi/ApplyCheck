import type {
  AnalyzeResponse,
  RescoreRequest,
  AuthResponse,
  CVUploadResponse,
  CVResponse,
  AnalysisListResponse,
  AnalysisDetail,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

// --- Auth ---

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

// --- OAuth ---

export async function googleAuth(code: string, redirectUri: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function linkedinAuth(code: string, redirectUri: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/linkedin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  return handleResponse<AuthResponse>(res);
}

// --- CV ---

export async function uploadCV(cvFile: File): Promise<CVUploadResponse> {
  const form = new FormData();
  form.append("cv_file", cvFile);
  const res = await fetch(`${BASE_URL}/cv/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<CVUploadResponse>(res);
}

export async function getCV(): Promise<CVResponse> {
  const res = await fetch(`${BASE_URL}/cv`, {
    headers: authHeaders(),
  });
  return handleResponse<CVResponse>(res);
}

// --- Analysis (authenticated) ---

export type AnalyzeEvent =
  | { type: "agent_complete"; agent: string }
  | { type: "result"; data: AnalyzeResponse }
  | { type: "error"; detail: string };

export async function analyzeAuthStream(
  jobDescription: string,
  onEvent: (event: AnalyzeEvent) => void,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/analyze/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ job_description: jobDescription }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6).trim();
        if (payload) {
          onEvent(JSON.parse(payload));
        }
      }
    }
  }
}

export async function getAnalyses(limit = 20, offset = 0): Promise<AnalysisListResponse> {
  const res = await fetch(`${BASE_URL}/analyses?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(),
  });
  return handleResponse<AnalysisListResponse>(res);
}

export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  const res = await fetch(`${BASE_URL}/analyses/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<AnalysisDetail>(res);
}

export async function deleteAnalysis(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/analyses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse<{ detail: string }>(res);
}

export async function deleteAllAnalyses(): Promise<void> {
  const res = await fetch(`${BASE_URL}/analyses`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse<{ detail: string }>(res);
}

// --- Guest (unauthenticated, existing) ---

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
  return handleResponse<AnalyzeResponse>(res);
}

export async function rescoreAnalysis(
  request: RescoreRequest
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/rescore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<AnalyzeResponse>(res);
}
