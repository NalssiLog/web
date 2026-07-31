import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/http-client";
import { locationApi, normalizeLocation } from "@/lib/api/location-api";

vi.mock("@/lib/api/http-client", () => ({
  apiRequest: vi.fn(),
  jsonRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

describe("normalizeLocation", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

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

  it("requests a zero-based search page and normalizes its items", async () => {
    apiRequestMock.mockResolvedValueOnce({
      items: [{
        id: "101",
        sido: "경기도",
        sigungu: "수원시 영통구",
        dong: "이의동",
        label: "경기도 수원시 영통구 이의동",
        shortLabel: "수원시 영통구 이의동",
      }],
      page: 2,
      size: 5,
      totalElements: 18,
      totalPages: 4,
      hasPrevious: true,
      hasNext: true,
    });

    const page = await locationApi.search("서", 2);

    expect(apiRequestMock).toHaveBeenCalledWith("/api/locations?keyword=%EC%84%9C&page=2");
    expect(page.items[0]?.label).toBe("경기도 수원시 영통구 이의동");
    expect(page.page).toBe(2);
    expect(page.totalPages).toBe(4);
  });

  it("requests a zero-based favorites page", async () => {
    apiRequestMock.mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 5,
      totalElements: 0,
      totalPages: 0,
      hasPrevious: false,
      hasNext: false,
    });

    const page = await locationApi.favorites(0);

    expect(apiRequestMock).toHaveBeenCalledWith("/api/locations/favorites?page=0");
    expect(page.items).toEqual([]);
    expect(page.totalPages).toBe(0);
  });

  it("loads and deduplicates every favorites page for exact star state", async () => {
    const firstLocation = {
      id: "101",
      sido: "경기도",
      sigungu: "수원시 영통구",
      dong: "이의동",
      label: "경기도 수원시 영통구 이의동",
      shortLabel: "수원시 영통구 이의동",
    };
    const secondLocation = {
      id: "202",
      sido: "서울특별시",
      sigungu: "강남구",
      dong: "역삼동",
      label: "서울특별시 강남구 역삼동",
      shortLabel: "강남구 역삼동",
    };
    apiRequestMock
      .mockResolvedValueOnce({
        items: [firstLocation],
        page: 0,
        size: 5,
        totalElements: 2,
        totalPages: 2,
        hasPrevious: false,
        hasNext: true,
      })
      .mockResolvedValueOnce({
        items: [firstLocation, secondLocation],
        page: 1,
        size: 5,
        totalElements: 2,
        totalPages: 2,
        hasPrevious: true,
        hasNext: false,
      });

    const favorites = await locationApi.favoriteCatalog();

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "/api/locations/favorites?page=0");
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "/api/locations/favorites?page=1");
    expect(favorites.map((location) => location.id)).toEqual(["101", "202"]);
  });

  it("normalizes the atomic popular snapshot without query parameters", async () => {
    apiRequestMock.mockResolvedValueOnce({
      snapshotId: "31",
      calculatedAt: "2026-07-30T08:30:00Z",
      windowStartedAt: "2026-07-23T08:30:00Z",
      windowEndedAt: "2026-07-30T08:30:00Z",
      algorithmVersion: "UNIQUE_REPORTERS_V1",
      pageSize: 5,
      totalElements: 1,
      totalPages: 1,
      items: [{
        rank: 1,
        previousRank: 3,
        rankChange: 2,
        movement: "UP",
        uniqueReporterCount: 4,
        reportCount: 7,
        latestReportAt: "2026-07-30T08:20:00Z",
        location: {
          id: "101",
          sido: "경기도",
          sigungu: "수원시 영통구",
          dong: "이의동",
          label: "경기도 수원시 영통구 이의동",
          shortLabel: "수원시 영통구 이의동",
        },
      }],
    });

    const snapshot = await locationApi.popular();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/locations/popular");
    expect(snapshot.calculatedAt).toBe("2026-07-30T08:30:00Z");
    expect(snapshot.items[0]).toMatchObject({
      rank: 1,
      movement: "UP",
      rankChange: 2,
      location: {
        id: "101",
        shortName: "수원시 영통구 이의동",
      },
    });
  });
});
