import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpWeatherApi } from "@/lib/api/http-weather-api";
import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import { createRequiredReportAgreements } from "@/lib/legal";
import type { CreateReportInput } from "@/lib/types";

vi.mock("@/lib/api/http-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/http-client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
    jsonRequest: vi.fn(),
  };
});

const apiRequestMock = vi.mocked(apiRequest);
const jsonRequestMock = vi.mocked(jsonRequest);
const backendReport = {
  id: "987654321098765432",
  isMine: true,
  location: {
    id: "123456789012345678",
    sido: "서울특별시",
    sigungu: "강서구",
    dong: "가양동",
    label: "서울특별시 강서구 가양동",
    shortLabel: "강서구 가양동",
  },
  author: {
    type: "ANONYMOUS" as const,
    id: null,
    nickname: "익명의 이웃",
  },
  temperature: "FRESH" as const,
  precipitation: "NONE" as const,
  sunlight: "MODERATE" as const,
  comment: "바람이 조금 불어요",
  imageUrls: [],
  thanksCount: 0,
  isThanked: false,
  createdAt: "2026-08-02T08:00:00Z",
};

function createInput(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    location: {
      id: backendReport.location.id,
      label: backendReport.location.label,
    },
    images: [],
    content: backendReport.comment,
    temperature: "FRESH",
    precipitation: "NONE",
    sunlight: "MODERATE",
    ...overrides,
  };
}

describe("httpWeatherApi.createReport", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    jsonRequestMock.mockReset();
    jsonRequestMock.mockResolvedValue(backendReport);
  });

  it("includes each required agreement in an anonymous report", async () => {
    const agreedTerms = createRequiredReportAgreements();

    await httpWeatherApi.createReport(createInput({ agreedTerms }));

    expect(jsonRequestMock).toHaveBeenCalledWith(
      "/api/reports",
      "POST",
      expect.objectContaining({ agreedTerms }),
      { signal: undefined },
    );
  });

  it("omits agreements from a member report", async () => {
    await httpWeatherApi.createReport(createInput());

    const body = jsonRequestMock.mock.calls[0]?.[2];
    expect(body).not.toHaveProperty("agreedTerms");
  });
});

describe("httpWeatherApi.getNationwideLive", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("keeps the backend ticker message and normalizes its location", async () => {
    apiRequestMock.mockResolvedValueOnce({
      items: [{
        reportId: backendReport.id,
        location: backendReport.location,
        message: " 비가 많이 와요 ",
        createdAt: backendReport.createdAt,
      }],
    });

    const feed = await httpWeatherApi.getNationwideLive();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/reports/live");
    expect(feed.items[0]).toEqual({
      reportId: backendReport.id,
      location: {
        id: backendReport.location.id,
        label: backendReport.location.label,
        fullName: backendReport.location.label,
        shortName: backendReport.location.shortLabel,
      },
      message: "비가 많이 와요",
      createdAt: backendReport.createdAt,
    });
  });
});
