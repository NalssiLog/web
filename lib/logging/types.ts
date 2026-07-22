export type AppEnvironment = "local" | "development" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  timestamp: string;
  environment: AppEnvironment;
  level: LogLevel;
  scope: string;
  message: string;
  context?: LogContext;
  error?: Error;
}

export interface LogSink {
  readonly minimumLevel: LogLevel;
  write(entry: LogEntry): void;
}

export const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function acceptsLogLevel(minimumLevel: LogLevel, level: LogLevel) {
  return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[minimumLevel];
}
