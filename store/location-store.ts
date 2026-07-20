"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCATION } from "@/lib/constants";
import type { Location } from "@/lib/types";

interface LocationState {
  location: Location | null;
  hasAttemptedDetection: boolean;
  setLocation: (location: Location) => void;
  markDetectionAttempted: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      hasAttemptedDetection: false,
      setLocation: (location) => set({ location }),
      markDetectionAttempted: () => set({ hasAttemptedDetection: true }),
    }),
    {
      name: "your-weather-location",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as LocationState;
        if (state.location?.label === "송파구 잠실동") {
          return {
            ...state,
            location: { label: DEFAULT_LOCATION, latitude: 37.4979, longitude: 127.0276 },
          };
        }
        return state;
      },
      partialize: (state) => ({ location: state.location }),
    },
  ),
);
