import type { ErrorEvent } from "@sentry/nextjs";
import { loggingConfig, isRemoteLoggingEnabled } from "@/lib/logging/config";
import { sanitizeContext, sanitizeText, sanitizeUrl } from "@/lib/logging/sanitizer";

function sanitizeEvent(event: ErrorEvent) {
  event.user = undefined;
  if (event.request) {
    event.request = {
      method: event.request.method,
      url: event.request.url ? sanitizeUrl(event.request.url) : undefined,
    };
  }
  if (event.message) event.message = sanitizeText(event.message);
  if (event.extra) event.extra = sanitizeContext(event.extra);
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value ? sanitizeText(exception.value) : exception.value,
    }));
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      message: breadcrumb.message ? sanitizeText(breadcrumb.message) : breadcrumb.message,
      data: breadcrumb.data ? sanitizeContext(breadcrumb.data) : breadcrumb.data,
    }));
  }
  return event;
}

export function getSentryOptions() {
  return {
    dsn: loggingConfig.sentryDsn,
    enabled: isRemoteLoggingEnabled(),
    environment: loggingConfig.environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeEvent,
  };
}
