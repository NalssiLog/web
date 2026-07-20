"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Location } from "@/lib/types";

interface LocationPreferencesState {
  favorites: Location[];
  toggleFavorite: (location: Location) => void;
  clearFavorites: () => void;
}

const locationKey = (location: Location) => location.id ?? location.label;

export const useLocationPreferencesStore = create<LocationPreferencesState>()(
  persist(
    (set) => ({
      favorites: [],
      toggleFavorite: (location) =>
        set((state) => {
          const key = locationKey(location);
          const exists = state.favorites.some((item) => locationKey(item) === key);
          return {
            favorites: exists
              ? state.favorites.filter((item) => locationKey(item) !== key)
              : [...state.favorites, location].slice(-5),
          };
        }),
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: "your-weather-location-preferences",
      partialize: (state) => ({
        favorites: state.favorites,
      }),
    },
  ),
);
