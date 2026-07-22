import * as Sentry from "@sentry/nextjs";
import type { LogEntry, LogLevel, LogSink } from "@/lib/logging/types";

export class SentryLogSink implements LogSink {
  constructor(public readonly minimumLevel: LogLevel) {}

  write(entry: LogEntry) {
    Sentry.withScope((scope) => {
      scope.setLevel(entry.level === "warn" ? "warning" : entry.level);
      scope.setTag("app.environment", entry.environment);
      scope.setTag("logger.scope", entry.scope);
      if (entry.context) scope.setContext("log", entry.context);
      if (entry.error) {
        Sentry.captureException(entry.error);
      } else {
        Sentry.captureMessage(`[${entry.scope}] ${entry.message}`);
      }
    });
  }
}
