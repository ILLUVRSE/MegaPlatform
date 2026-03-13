/**
 * Studio API client helpers.
 * Request/response: wraps fetch calls for studio endpoints.
 * Guard: client-side usage only.
 */
export type StudioProject = {
  id: string;
  type: "SHORT" | "MEME" | "REMIX" | "SHOW" | "GAME" | "PARTY_GAME";
  title: string;
  description?: string | null;
  status: string;
};

export type AgentJob = {
  id: string;
  type: string;
  status: string;
  attempts?: number;
  maxAttempts?: number;
  retryable?: boolean;
  lastError?: string | null;
  dedupeKey?: string | null;
  inputJson: Record<string, unknown>;
  outputJson?: Record<string, unknown> | null;
  error?: string | null;
};

export type StudioAsset = {
  id: string;
  kind: string;
  url: string;
  metaJson?: Record<string, unknown> | null;
};

export class StudioApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // ignore parse errors and keep fallback message
    }
    throw new StudioApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export async function createProject(payload: {
  type: StudioProject["type"];
  title: string;
  description?: string;
}) {
  return requestJson<{ project: StudioProject }>("/api/studio/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getProject(id: string) {
  return requestJson<{
    project: StudioProject;
    jobs: AgentJob[];
    assets: StudioAsset[];
  }>(`/api/studio/projects/${id}`, { cache: "no-store" });
}

export async function createJob(projectId: string, payload: { type: string; input?: Record<string, unknown> }) {
  return requestJson<{ job: AgentJob }>(`/api/studio/projects/${projectId}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getJob(jobId: string) {
  return requestJson<{ job: AgentJob }>(`/api/studio/jobs/${jobId}`, { cache: "no-store" });
}

export async function publishProject(projectId: string, payload: { title?: string; caption?: string }) {
  return requestJson<{ post: { id: string } }>(`/api/studio/projects/${projectId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
