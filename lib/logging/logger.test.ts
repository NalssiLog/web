import { describe, expect, it } from "vitest";
import { Logger } from "@/lib/logging/logger";
import type { LogEntry, LogSink } from "@/lib/logging/types";

class MemoryLogSink implements LogSink {
  readonly minimumLevel = "info" as const;
  readonly entries: LogEntry[] = [];

  write(entry: LogEntry) {
    this.entries.push(entry);
  }
}

describe("Logger", () => {
  it("applies sink levels and sanitizes context", () => {
    const sink = new MemoryLogSink();
    const logger = new Logger("development", "test", [sink]);

    logger.debug("hidden");
    logger.info("visible", { email: "user@example.com", status: 500 });

    expect(sink.entries).toHaveLength(1);
    expect(sink.entries[0]).toMatchObject({
      environment: "development",
      level: "info",
      scope: "test",
      message: "visible",
      context: { email: "[REDACTED]", status: 500 },
    });
  });

  it("composes child scopes and sanitizes errors", () => {
    const sink = new MemoryLogSink();
    const logger = new Logger("production", "app", [sink]).child("upload");

    logger.error("failed", new Error("user@example.com failed"));

    expect(sink.entries[0].scope).toBe("app.upload");
    expect(sink.entries[0].error?.message).toBe("[REDACTED_EMAIL] failed");
  });
});
