import { describe, expect, it } from "vitest";
import {
  LOCATION_AUTO_REFRESH_COOLDOWN_MS,
  LOCATION_RESUME_MIN_HIDDEN_MS,
  shouldRefreshLocationAfterResume,
} from "@/lib/location-auto-refresh";

describe("shouldRefreshLocationAfterResume", () => {
  it("ignores short visibility round trips", () => {
    expect(shouldRefreshLocationAfterResume({
      hiddenAt: 1_000,
      now: 1_000 + LOCATION_RESUME_MIN_HIDDEN_MS - 1,
      lastRefreshAt: 0,
    })).toBe(false);
  });

  it("refreshes after the minimum background duration", () => {
    const now = LOCATION_RESUME_MIN_HIDDEN_MS + LOCATION_AUTO_REFRESH_COOLDOWN_MS;
    expect(shouldRefreshLocationAfterResume({
      hiddenAt: now - LOCATION_RESUME_MIN_HIDDEN_MS,
      now,
      lastRefreshAt: 0,
    })).toBe(true);
  });

  it("deduplicates pageshow and visibility resume events", () => {
    const now = 1_000_000;
    expect(shouldRefreshLocationAfterResume({
      hiddenAt: now - LOCATION_RESUME_MIN_HIDDEN_MS,
      now,
      lastRefreshAt: now - LOCATION_AUTO_REFRESH_COOLDOWN_MS + 1,
    })).toBe(false);
  });
});
