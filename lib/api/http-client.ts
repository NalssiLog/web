import { getApiUrl } from "@/lib/api/config";

export interface ApiErrorBody {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function fetchApi(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "서버에 연결하지 못했어요.");
  }
}

function getCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  if (!cookie) return undefined;
  return decodeURIComponent(cookie.slice(prefix.length));
}

async function readErrorBody(response: Response) {
  try {
    return await response.clone().json() as ApiErrorBody;
  } catch {
    return undefined;
  }
}

async function refreshCsrfToken() {
  await fetchApi(getApiUrl("/api/auth/me"), {
    method: "GET",
    credentials: "include",
  });
}

async function refreshSession() {
  const execute = () => {
    const headers = new Headers();
    const csrfToken = getCookie("XSRF-TOKEN");
    if (csrfToken) headers.set("X-XSRF-TOKEN", csrfToken);
    return fetchApi(getApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers,
      credentials: "include",
    });
  };

  let response = await execute();
  if (response.status === 403) {
    const body = await readErrorBody(response);
    if (body?.code === "CSRF_TOKEN_MISSING" || body?.code === "CSRF_TOKEN_INVALID") {
      await refreshCsrfToken();
      response = await execute();
    }
  }
  return response;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const execute = () => {
    const headers = new Headers(init.headers);
    if (STATE_CHANGING_METHODS.has(method)) {
      const csrfToken = getCookie("XSRF-TOKEN");
      if (csrfToken) headers.set("X-XSRF-TOKEN", csrfToken);
    }
    return fetchApi(getApiUrl(path), {
      ...init,
      method,
      headers,
      credentials: "include",
    });
  };

  let response = await execute();
  if (response.status === 403 && path !== "/api/auth/me") {
    const body = await readErrorBody(response);
    if (body?.code === "CSRF_TOKEN_MISSING" || body?.code === "CSRF_TOKEN_INVALID") {
      await refreshCsrfToken();
      response = await execute();
    }
  }

  if (response.status === 401 && path !== "/api/auth/refresh") {
    const refreshResponse = await refreshSession();
    if (refreshResponse.ok) response = await execute();
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(
      response.status,
      body?.code ?? `HTTP_${response.status}`,
      body?.message ?? "요청을 처리하지 못했어요.",
    );
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return await response.text() as T;
  return await response.json() as T;
}

export function jsonRequest<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return apiRequest<T>(path, {
    ...init,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
