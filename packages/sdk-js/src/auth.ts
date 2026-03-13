export interface AuthState {
  token: string | null;
}

export interface AuthManagerOptions {
  initialToken?: string | null;
  tokenType?: string;
}

export interface AuthManager {
  clearToken(): void;
  getAuthHeaders(extraHeaders?: HeadersInit): Headers;
  getState(): AuthState;
  getToken(): string | null;
  setToken(token: string | null): void;
  subscribe(listener: (state: AuthState) => void): () => void;
}

export function createAuthManager(options: AuthManagerOptions = {}): AuthManager {
  const tokenType = options.tokenType ?? "Bearer";
  let token = options.initialToken ?? null;
  const listeners = new Set<(state: AuthState) => void>();

  const emit = () => {
    const state = { token };
    for (const listener of listeners) {
      listener(state);
    }
  };

  return {
    clearToken() {
      token = null;
      emit();
    },
    getAuthHeaders(extraHeaders?: HeadersInit) {
      const headers = new Headers(extraHeaders);
      if (token) {
        headers.set("authorization", `${tokenType} ${token}`);
      }
      return headers;
    },
    getState() {
      return { token };
    },
    getToken() {
      return token;
    },
    setToken(nextToken) {
      token = nextToken;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
