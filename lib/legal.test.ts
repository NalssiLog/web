import { describe, expect, it } from "vitest";
import {
  CURRENT_PRIVACY_TERMS_VERSION,
  CURRENT_SERVICE_TERMS_VERSION,
  createRequiredReportAgreements,
} from "@/lib/legal";

describe("required report agreements", () => {
  it("creates each required agreement exactly once with the displayed versions", () => {
    const agreements = createRequiredReportAgreements();

    expect(agreements).toEqual([
      { type: "SERVICE", version: CURRENT_SERVICE_TERMS_VERSION },
      { type: "PRIVACY", version: CURRENT_PRIVACY_TERMS_VERSION },
    ]);
    expect(new Set(agreements.map(({ type }) => type)).size).toBe(2);
    expect(
      agreements.every(
        ({ version }) => version.trim().length > 0 && version.length <= 20,
      ),
    ).toBe(true);
  });
});
