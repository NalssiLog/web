import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import type { Location } from "@/lib/types";

export interface LocationResponse {
  id: string;
  sido: string;
  sigungu: string;
  dong: string;
  label: string;
  shortLabel: string;
}

export interface LocationPageResponse {
  items: LocationResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface LocationPage {
  items: Location[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export type PopularLocationMovement = "UP" | "DOWN" | "SAME" | "NEW" | "UNKNOWN";

export interface PopularLocationItemResponse {
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  movement: PopularLocationMovement;
  uniqueReporterCount: number;
  reportCount: number;
  latestReportAt: string;
  location: LocationResponse;
}

export interface PopularLocationItem extends Omit<PopularLocationItemResponse, "location"> {
  location: Location;
}

export interface PopularLocationSnapshotResponse {
  snapshotId: string;
  calculatedAt: string;
  windowStartedAt: string;
  windowEndedAt: string;
  algorithmVersion: string;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  items: PopularLocationItemResponse[];
}

export interface PopularLocationSnapshot extends Omit<PopularLocationSnapshotResponse, "items"> {
  items: PopularLocationItem[];
}

export function normalizeLocation(location: LocationResponse): Location {
  const fullName = location.label.trim();
  const shortName = location.shortLabel.trim();
  return {
    id: String(location.id),
    label: fullName,
    shortName,
    fullName,
  };
}

function normalizeLocationPage(page: LocationPageResponse): LocationPage {
  return {
    ...page,
    items: page.items.map(normalizeLocation),
  };
}

function normalizePopularLocationSnapshot(
  snapshot: PopularLocationSnapshotResponse,
): PopularLocationSnapshot {
  return {
    ...snapshot,
    items: snapshot.items.map((item) => ({
      ...item,
      location: normalizeLocation(item.location),
    })),
  };
}

async function getFavoritePage(page: number) {
  return normalizeLocationPage(
    await apiRequest<LocationPageResponse>(
      `/api/locations/favorites?page=${encodeURIComponent(page)}`,
    ),
  );
}

async function getFavoriteCatalog() {
  const firstPage = await getFavoritePage(0);
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.totalPages - 1) },
      (_, index) => getFavoritePage(index + 1),
    ),
  );
  const locations = [firstPage, ...remainingPages].flatMap((page) => page.items);
  return Array.from(
    new Map(
      locations.map((location) => [location.id ?? location.label, location]),
    ).values(),
  );
}

export const locationApi = {
  search: async (keyword: string, page = 0) => normalizeLocationPage(
    await apiRequest<LocationPageResponse>(
      `/api/locations?keyword=${encodeURIComponent(keyword)}&page=${encodeURIComponent(page)}`,
    ),
  ),
  get: async (id: string) => normalizeLocation(await apiRequest<LocationResponse>(`/api/locations/${encodeURIComponent(id)}`)),
  reverseGeocode: async (latitude: number, longitude: number) => normalizeLocation(await apiRequest<LocationResponse>(`/api/locations/reverse-geocode?lat=${latitude}&lng=${longitude}`)),
  popular: async () => normalizePopularLocationSnapshot(
    await apiRequest<PopularLocationSnapshotResponse>("/api/locations/popular"),
  ),
  favorites: getFavoritePage,
  favoriteCatalog: getFavoriteCatalog,
  addFavorite: (locationId: string) => jsonRequest<void>("/api/locations/favorites", "POST", { locationId }),
  removeFavorite: (locationId: string) => jsonRequest<void>(`/api/locations/favorites/${encodeURIComponent(locationId)}`, "DELETE"),
};
