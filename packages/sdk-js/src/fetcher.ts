import type { AuthManager } from "./auth";

export interface JsonFetcherOptions {
  auth?: AuthManager;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
}

export interface JsonRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: BodyInit | object | null;
  headers?: HeadersInit;
}

export interface JsonFetcher {
  delete<T>(path: string, init?: JsonRequestOptions): Promise<T>;
  get<T>(path: string, init?: JsonRequestOptions): Promise<T>;
  post<T>(path: string, init?: JsonRequestOptions): Promise<T>;
  put<T>(path: string, init?: JsonRequestOptions): Promise<T>;
  request<T>(path: string, init?: JsonRequestOptions): Promise<T>;
}

function normalizeBody(body: JsonRequestOptions["body"], headers: Headers) {
  if (body == null || body instanceof ArrayBuffer || body instanceof Blob || body instanceof FormData || typeof body === "string" || body instanceof URLSearchParams) {
    return body;
  }

  if (ArrayBuffer.isView(body)) {
    return body as unknown as BodyInit;
  }

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return JSON.stringify(body);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`ILLUVRSE SDK request failed with ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function createJsonFetcher(options: JsonFetcherOptions): JsonFetcher {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("createJsonFetcher requires a fetch implementation");
  }

  const request = async <T>(path: string, init: JsonRequestOptions = {}): Promise<T> => {
    const headers = options.auth?.getAuthHeaders(options.headers) ?? new Headers(options.headers);
    const requestHeaders = new Headers(headers);

    if (init.headers) {
      new Headers(init.headers).forEach((value, key) => requestHeaders.set(key, value));
    }

    const response = await fetchImpl(new URL(path, options.baseUrl), {
      ...init,
      body: normalizeBody(init.body, requestHeaders),
      headers: requestHeaders
    });

    return parseJsonResponse<T>(response);
  };

  const withMethod = <T>(method: string, path: string, init?: JsonRequestOptions) => request<T>(path, { ...init, method });

  return {
    delete: (path, init) => withMethod("DELETE", path, init),
    get: (path, init) => withMethod("GET", path, init),
    post: (path, init) => withMethod("POST", path, init),
    put: (path, init) => withMethod("PUT", path, init),
    request
  };
}
