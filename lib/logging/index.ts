import { loggingConfig, isRemoteLoggingEnabled } from "@/lib/logging/config";
import { ConsoleLogSink } from "@/lib/logging/console-sink";
import { Logger } from "@/lib/logging/logger";
import { SentryLogSink } from "@/lib/logging/sentry-sink";
import type { LogSink } from "@/lib/logging/types";

const sinks: LogSink[] = [new ConsoleLogSink(loggingConfig.consoleLevel)];
if (isRemoteLoggingEnabled()) sinks.push(new SentryLogSink("warn"));

export const logger = new Logger(loggingConfig.environment, "nalssilog", sinks);

export { Logger } from "@/lib/logging/logger";
export { sanitizeContext, sanitizeError, sanitizeText, sanitizeUrl } from "@/lib/logging/sanitizer";
export type { AppEnvironment, LogContext, LogEntry, LogLevel, LogSink } from "@/lib/logging/types";
