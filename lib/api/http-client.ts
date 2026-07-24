import { getApiUrl } from "@/lib/api/config";
import { logger, sanitizeUrl } from "@/lib/logging";

const httpLogger = logger.child("api.http");

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
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_APP_ENV === "development"
  ? "DEV-XSRF-TOKEN"
  : "XSRF-TOKEN";
let sessionRefreshPromise: Promise<Response> | null = null;

async function fetchApi(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const requestUrl = input instanceof Request ? input.url : input.toString();
    httpLogger.error("network_request_failed", error, {
      method: init?.method ?? (input instanceof Request ? input.method : "GET"),
      path: sanitizeUrl(requestUrl),
    });
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
    cache: "no-store",
    credentials: "include",
  });
}

async function executeSessionRefresh() {
  const execute = () => {
    const headers = new Headers();
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
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
      httpLogger.debug("csrf_token_refreshed", { path: "/api/auth/refresh" });
      response = await execute();
    }
  }
  return response;
}

function refreshSession() {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = executeSessionRefresh().finally(() => {
      sessionRefreshPromise = null;
    });
  }
  return sessionRefreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const execute = () => {
    const headers = new Headers(init.headers);
    if (STATE_CHANGING_METHODS.has(method)) {
      const csrfToken = getCookie(CSRF_COOKIE_NAME);
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
      httpLogger.debug("csrf_token_refreshed", { path: sanitizeUrl(getApiUrl(path)) });
      response = await execute();
    }
  }

  if (response.status === 401 && path !== "/api/auth/refresh") {
    const refreshResponse = await refreshSession();
    if (refreshResponse.ok) {
      httpLogger.debug("auth_session_refreshed", { path: sanitizeUrl(getApiUrl(path)) });
      response = await execute();
    } else {
      const refreshError = await readErrorBody(refreshResponse);
      httpLogger.warn("auth_session_refresh_failed", {
        path: sanitizeUrl(getApiUrl(path)),
        status: refreshResponse.status,
        code: refreshError?.code ?? `HTTP_${refreshResponse.status}`,
      });
    }
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      body = undefined;
    }
    const apiError = new ApiError(
      response.status,
      body?.code ?? `HTTP_${response.status}`,
      body?.message ?? "요청을 처리하지 못했어요.",
    );
    const context = {
      method,
      path: sanitizeUrl(getApiUrl(path)),
      status: response.status,
      code: apiError.code,
    };
    if (response.status >= 500) {
      httpLogger.error("api_server_error", new Error(`API request failed with status ${response.status}`), context);
    } else if (response.status === 401 || response.status === 403) {
      httpLogger.warn("api_authorization_failed", context);
    } else {
      httpLogger.debug("api_request_rejected", context);
    }
    throw apiError;
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
