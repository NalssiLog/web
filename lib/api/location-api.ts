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
