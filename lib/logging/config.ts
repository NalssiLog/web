import type { AppEnvironment, LogLevel } from "@/lib/logging/types";

const ENVIRONMENTS: AppEnvironment[] = ["local", "development", "production"];
const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

function resolveEnvironment(): AppEnvironment {
  const configured = process.env.NEXT_PUBLIC_APP_ENV as AppEnvironment | undefined;
  if (configured && ENVIRONMENTS.includes(configured)) return configured;
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

function resolveConsoleLevel(environment: AppEnvironment): LogLevel {
  const configured = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined;
  if (configured && LOG_LEVELS.includes(configured)) return configured;
  if (environment === "local") return "debug";
  if (environment === "development") return "info";
  return "warn";
}

const environment = resolveEnvironment();

export const loggingConfig = {
  environment,
  consoleLevel: resolveConsoleLevel(environment),
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? "",
};

export function isRemoteLoggingEnabled() {
  return loggingConfig.environment !== "local" && Boolean(loggingConfig.sentryDsn);
}
