"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { findSupportedLocation } from "@/lib/constants";
import type { Location } from "@/lib/types";

interface LocationState {
  location: Location | null;
  hasAttemptedDetection: boolean;
  isDetecting: boolean;
  detectionError: string;
  setLocation: (location: Location) => void;
  markDetectionAttempted: () => void;
  startDetection: () => void;
  stopDetection: () => void;
  finishDetection: (error?: string) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      hasAttemptedDetection: false,
      isDetecting: false,
      detectionError: "",
      setLocation: (location) => set({ location }),
      markDetectionAttempted: () => set({ hasAttemptedDetection: true }),
      startDetection: () => set({ isDetecting: true, detectionError: "" }),
      stopDetection: () => set({ isDetecting: false }),
      finishDetection: (error = "") => set({ isDetecting: false, detectionError: error }),
    }),
    {
      name: "nalssilog-location",
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<LocationState>;
        const storedLocation = state.location ?? null;
        const hasAttemptedDetection = state.hasAttemptedDetection ?? Boolean(storedLocation);
        if (storedLocation?.label === "송파구 잠실동") {
          return {
            location: null,
            hasAttemptedDetection,
          };
        }
        if (storedLocation) {
          const supportedLocation = findSupportedLocation(storedLocation);
          if (supportedLocation) {
            return {
              location: {
                ...supportedLocation,
                latitude: storedLocation.latitude,
                longitude: storedLocation.longitude,
              },
              hasAttemptedDetection,
            };
          }
        }
        return {
          location: storedLocation,
          hasAttemptedDetection,
        };
      },
      partialize: (state) => ({
        location: state.location,
        hasAttemptedDetection: state.hasAttemptedDetection,
      }),
    },
  ),
);
