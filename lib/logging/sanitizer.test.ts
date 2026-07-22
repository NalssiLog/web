import { describe, expect, it } from "vitest";
import { sanitizeContext, sanitizeText, sanitizeUrl } from "@/lib/logging/sanitizer";

describe("logging sanitizer", () => {
  it("removes personal and authentication data recursively", () => {
    expect(sanitizeContext({
      email: "user@example.com",
      safe: "visible",
      nested: {
        nickname: "날씨러",
        latitude: 37.5,
        authorization: "Bearer secret-token",
      },
    })).toEqual({
      email: "[REDACTED]",
      safe: "visible",
      nested: {
        nickname: "[REDACTED]",
        latitude: "[REDACTED]",
        authorization: "[REDACTED]",
      },
    });
  });

  it("removes query strings and fragments from URLs", () => {
    expect(sanitizeUrl("https://api.nalssilog.com/api/locations?keyword=강남#result"))
      .toBe("https://api.nalssilog.com/api/locations");
    expect(sanitizeUrl("/api/reports?cursor=secret"))
      .toBe("/api/reports");
  });

  it("masks emails and bearer credentials embedded in messages", () => {
    expect(sanitizeText("user@example.com Bearer abc.def"))
      .toBe("[REDACTED_EMAIL] Bearer [REDACTED]");
  });
});
