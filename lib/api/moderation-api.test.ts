import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import { moderationApi } from "@/lib/api/moderation-api";

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

describe("moderationApi", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    jsonRequestMock.mockReset();
  });

  it("submits a trimmed report flag", async () => {
    jsonRequestMock.mockResolvedValueOnce({
      id: "101",
      reportId: "5001",
      reason: "SPAM",
      status: "PENDING",
      createdAt: "2026-08-02T09:10:11.123Z",
    });

    await moderationApi.flagReport("5001", {
      reason: "SPAM",
      detail: "  반복 게시물입니다.  ",
    });

    expect(jsonRequestMock).toHaveBeenCalledWith(
      "/api/reports/5001/flags",
      "POST",
      { reason: "SPAM", detail: "반복 게시물입니다." },
    );
  });

  it("uses member identifiers for block management", async () => {
    jsonRequestMock.mockResolvedValue(undefined);

    await moderationApi.blockMember("123456789");
    await moderationApi.unblockMember("123456789");

    expect(jsonRequestMock).toHaveBeenNthCalledWith(
      1,
      "/api/report-blocks/members/123456789",
      "POST",
    );
    expect(jsonRequestMock).toHaveBeenNthCalledWith(
      2,
      "/api/report-blocks/members/123456789",
      "DELETE",
    );
  });

  it("requests a bounded block list page", async () => {
    apiRequestMock.mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 50,
      totalElements: 0,
      totalPages: 0,
    });

    await moderationApi.getReportBlocks(-1, 100);

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/api/report-blocks?page=0&size=50",
      { cache: "no-store" },
    );
  });
});
