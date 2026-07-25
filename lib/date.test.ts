import { describe, expect, it } from "vitest";
import { formatReportDateTime } from "@/lib/date";

describe("formatReportDateTime", () => {
  it("올해 작성한 제보는 연도 없이 표시한다", () => {
    const createdAt = new Date(2026, 6, 24, 9, 30);
    const referenceDate = new Date(2026, 11, 31);

    expect(formatReportDateTime(createdAt, referenceDate)).toBe("7월 24일 오전 9:30");
  });

  it("다른 해에 작성한 제보는 연도까지 표시한다", () => {
    const createdAt = new Date(2025, 11, 31, 21, 5);
    const referenceDate = new Date(2026, 0, 1);

    expect(formatReportDateTime(createdAt, referenceDate)).toBe("2025년 12월 31일 오후 9:05");
  });
});
