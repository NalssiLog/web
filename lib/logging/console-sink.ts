import type { LogEntry, LogLevel, LogSink } from "@/lib/logging/types";

const consoleMethod: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

export class ConsoleLogSink implements LogSink {
  constructor(public readonly minimumLevel: LogLevel) {}

  write(entry: LogEntry) {
    const prefix = `[${entry.environment}] [${entry.scope}] ${entry.message}`;
    const details = {
      timestamp: entry.timestamp,
      ...entry.context,
      ...(entry.error ? { error: entry.error } : {}),
    };
    console[consoleMethod[entry.level]](prefix, details);
  }
}
