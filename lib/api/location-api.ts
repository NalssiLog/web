import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import type { Location } from "@/lib/types";

export interface LocationResponse {
  id: string;
  sido: string;
  sigungu: string;
  dong: string;
  label?: string;
}

const SIDO_SHORT_NAMES: Record<string, string> = {
  "서울특별시": "서울시",
  "부산광역시": "부산시",
  "대구광역시": "대구시",
  "인천광역시": "인천시",
  "광주광역시": "광주시",
  "대전광역시": "대전시",
  "울산광역시": "울산시",
  "세종특별자치시": "세종시",
  "강원특별자치도": "강원도",
  "전북특별자치도": "전북도",
  "제주특별자치도": "제주도",
};

export function normalizeLocation(location: LocationResponse): Location {
  const fullName = location.label?.trim() || [location.sido, location.sigungu, location.dong].filter(Boolean).join(" ");
  const shortName = [SIDO_SHORT_NAMES[location.sido] ?? location.sido, location.sigungu, location.dong].filter(Boolean).join(" ");
  return {
    id: String(location.id),
    label: shortName,
    shortName,
    fullName,
  };
}

const normalizeLocations = (locations: LocationResponse[]) => locations.map(normalizeLocation);

export const locationApi = {
  search: async (keyword: string) => normalizeLocations(await apiRequest<LocationResponse[]>(`/api/locations?keyword=${encodeURIComponent(keyword)}`)),
  get: async (id: string) => normalizeLocation(await apiRequest<LocationResponse>(`/api/locations/${encodeURIComponent(id)}`)),
  reverseGeocode: async (latitude: number, longitude: number) => normalizeLocation(await apiRequest<LocationResponse>(`/api/locations/reverse-geocode?lat=${latitude}&lng=${longitude}`)),
  popular: async () => normalizeLocations(await apiRequest<LocationResponse[]>("/api/locations/popular")),
  favorites: async () => normalizeLocations(await apiRequest<LocationResponse[]>("/api/locations/favorites")),
  addFavorite: (locationId: string) => jsonRequest<void>("/api/locations/favorites", "POST", { locationId }),
  removeFavorite: (locationId: string) => jsonRequest<void>(`/api/locations/favorites/${encodeURIComponent(locationId)}`, "DELETE"),
};
