import { sanitizeContext, sanitizeError, sanitizeText } from "@/lib/logging/sanitizer";
import type { AppEnvironment, LogContext, LogEntry, LogLevel, LogSink } from "@/lib/logging/types";
import { acceptsLogLevel } from "@/lib/logging/types";

export class Logger {
  constructor(
    private readonly environment: AppEnvironment,
    private readonly scope: string,
    private readonly sinks: readonly LogSink[],
    private readonly baseContext: LogContext = {},
  ) {}

  child(scope: string, context: LogContext = {}) {
    return new Logger(
      this.environment,
      `${this.scope}.${scope}`,
      this.sinks,
      { ...this.baseContext, ...context },
    );
  }

  debug(message: string, context?: LogContext) {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.write("warn", message, context);
  }

  error(message: string, reason?: unknown, context?: LogContext) {
    this.write("error", message, context, reason);
  }

  private write(level: LogLevel, message: string, context?: LogContext, reason?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      level,
      scope: this.scope,
      message: sanitizeText(message),
      context: sanitizeContext({ ...this.baseContext, ...context }),
      error: reason === undefined ? undefined : sanitizeError(reason),
    };
    for (const sink of this.sinks) {
      if (acceptsLogLevel(sink.minimumLevel, level)) sink.write(entry);
    }
  }
}
