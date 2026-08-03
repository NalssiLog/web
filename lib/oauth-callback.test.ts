import { describe, expect, it } from "vitest";
import { isOAuthCallbackFailure } from "@/lib/oauth-callback";

describe("isOAuthCallbackFailure", () => {
  it("treats provider cancellation as failure even with a stale signup hint", () => {
    expect(isOAuthCallbackFailure("SIGNUP_REQUIRED", "OAUTH_CANCELLED")).toBe(
      true,
    );
  });

  it("accepts an actual signup-required callback", () => {
    expect(isOAuthCallbackFailure("SIGNUP_REQUIRED", null)).toBe(false);
  });

  it("rejects explicit login and link failures", () => {
    expect(isOAuthCallbackFailure("FAILED", null)).toBe(true);
    expect(isOAuthCallbackFailure("LINK_FAILED", null)).toBe(true);
  });
});
