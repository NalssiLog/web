"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCATION_DATA, findSupportedLocation } from "@/lib/constants";
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
      name: "nalssilog-location",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as LocationState;
        if (state.location?.label === "송파구 잠실동") {
          return {
            ...state,
            location: { ...DEFAULT_LOCATION_DATA, latitude: 37.4979, longitude: 127.0276 },
          };
        }
        if (state.location) {
          const supportedLocation = findSupportedLocation(state.location);
          if (supportedLocation) {
            return {
              ...state,
              location: {
                ...supportedLocation,
                latitude: state.location.latitude,
                longitude: state.location.longitude,
              },
            };
          }
        }
        return state;
      },
      partialize: (state) => ({ location: state.location }),
    },
  ),
);
