import type { LogContext } from "@/lib/logging/types";

const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 5;
const MAX_ARRAY_LENGTH = 20;
const SENSITIVE_EXACT_KEYS = new Set([
  "name",
  "fullname",
  "nickname",
  "email",
  "comment",
  "content",
  "body",
  "headers",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "uploadurl",
  "authorizationurl",
  "presignedurl",
  "profileimageurl",
  "imageurl",
  "imageurls",
]);
const SENSITIVE_KEY_PARTS = ["authorization", "cookie", "password", "secret", "token"];
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const URL_PATTERN = /https?:\/\/[^\s)\]}]+/gi;

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isSensitiveKey(key: string) {
  const normalized = normalizeKey(key);
  return SENSITIVE_EXACT_KEYS.has(normalized)
    || SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeUrl(value: string) {
  try {
    const url = new URL(value, "https://nalssilog.invalid");
    const path = url.pathname || "/";
    return url.origin === "https://nalssilog.invalid" ? path : `${url.origin}${path}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function sanitizeText(value: string, maximumLength = MAX_STRING_LENGTH) {
  const sanitized = value
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(URL_PATTERN, (url) => sanitizeUrl(url));
  return sanitized.length > maximumLength ? `${sanitized.slice(0, maximumLength)}…` : sanitized;
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return `[${typeof value}]`;
  if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return sanitizeUrl(value.toString());
  if (value instanceof Error) return sanitizeError(value);
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitizeValue(item, depth + 1, seen),
    ]),
  );
}

export function sanitizeContext(context?: LogContext) {
  if (!context) return undefined;
  return sanitizeValue(context, 0, new WeakSet()) as LogContext;
}

export function sanitizeError(reason: unknown) {
  const source = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : "Unknown error");
  const error = new Error(sanitizeText(source.message));
  error.name = sanitizeText(source.name, 100);
  if (source.stack) error.stack = sanitizeText(source.stack, 5_000);
  return error;
}
