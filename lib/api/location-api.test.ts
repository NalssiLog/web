import { describe, expect, it } from "vitest";
import { normalizeLocation } from "@/lib/api/location-api";

describe("normalizeLocation", () => {
  it("uses backend labels without composing administrative fields", () => {
    const location = normalizeLocation({
      id: "101",
      sido: "경기도",
      sigungu: "수원시 영통구",
      dong: "이의동",
      label: "경기도 수원시 영통구 이의동",
      shortLabel: "수원시 영통구 이의동",
    });

    expect(location.label).toBe("경기도 수원시 영통구 이의동");
    expect(location.fullName).toBe("경기도 수원시 영통구 이의동");
    expect(location.shortName).toBe("수원시 영통구 이의동");
  });
});
