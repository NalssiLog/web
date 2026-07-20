"use client";

import { useCallback, useEffect, useState } from "react";
import { weatherApi } from "@/lib/api";
import type { Location } from "@/lib/types";
import { useLocationStore } from "@/store/location-store";

export function useCurrentLocation() {
  const { location, setLocation, hasAttemptedDetection, markDetectionAttempted } = useLocationStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [needsManualInput, setNeedsManualInput] = useState(false);

  const detectLocation = useCallback((applyImmediately = false): Promise<Location | null> => {
    markDetectionAttempted();
    if (!navigator.geolocation) {
      setNeedsManualInput(true);
      return Promise.resolve(null);
    }
    setIsDetecting(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const result = await weatherApi.reverseGeocode(coords.latitude, coords.longitude);
            if (applyImmediately) {
              setLocation(result);
              setNeedsManualInput(false);
            }
            resolve(result);
          } catch {
            setNeedsManualInput(true);
            resolve(null);
          } finally {
            setIsDetecting(false);
          }
        },
        () => {
          setIsDetecting(false);
          setNeedsManualInput(true);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
      );
    });
  }, [markDetectionAttempted, setLocation]);

  useEffect(() => {
    if (location || hasAttemptedDetection) return;
    const timeout = window.setTimeout(() => void detectLocation(true), 0);
    return () => window.clearTimeout(timeout);
  }, [detectLocation, hasAttemptedDetection, location]);

  return { location, setLocation, isDetecting, needsManualInput, setNeedsManualInput, detectLocation };
}
