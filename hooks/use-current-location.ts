"use client";

import { useCallback, useEffect, useState } from "react";
import { weatherApi } from "@/lib/api";
import type { Location } from "@/lib/types";
import { useLocationStore } from "@/store/location-store";

export function useCurrentLocation() {
  const { location, setLocation, hasAttemptedDetection, markDetectionAttempted } = useLocationStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [needsManualInput, setNeedsManualInput] = useState(false);
  const [detectionError, setDetectionError] = useState("");

  const detectLocation = useCallback((applyImmediately = false): Promise<Location | null> => {
    markDetectionAttempted();
    setDetectionError("");
    if (!navigator.geolocation) {
      setDetectionError("이 브라우저에서는 현재 위치를 사용할 수 없어요.");
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
            setDetectionError("위치 서버에 연결하지 못했어요. 다시 시도하거나 동네를 검색해 주세요.");
            setNeedsManualInput(true);
            resolve(null);
          } finally {
            setIsDetecting(false);
          }
        },
        (error) => {
          setIsDetecting(false);
          setDetectionError(error.code === error.PERMISSION_DENIED
            ? "위치 권한이 없어 현재 동네를 찾지 못했어요. 동네를 직접 검색해 주세요."
            : "현재 위치를 확인하지 못했어요. 다시 시도하거나 동네를 검색해 주세요.");
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

  return { location, setLocation, isDetecting, detectionError, needsManualInput, setNeedsManualInput, detectLocation };
}
