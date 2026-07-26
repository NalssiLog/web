"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { weatherApi } from "@/lib/api";
import { locationApi } from "@/lib/api/location-api";
import { logger } from "@/lib/logging";
import type { Location } from "@/lib/types";
import { useLocationStore } from "@/store/location-store";

const locationLogger = logger.child("location.detection");
const refreshedLocationIds = new Set<string>();

export function useCurrentLocation() {
  const { location, setLocation, hasAttemptedDetection, markDetectionAttempted } = useLocationStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [needsManualInput, setNeedsManualInputState] = useState(false);
  const [detectionError, setDetectionError] = useState("");
  const detectionPromiseRef = useRef<Promise<Location | null> | null>(null);
  const manualInputDismissedRef = useRef(false);

  const setNeedsManualInput = useCallback((next: boolean) => {
    manualInputDismissedRef.current = !next;
    setNeedsManualInputState(next);
  }, []);

  const requestManualInput = useCallback(() => {
    if (!location && !manualInputDismissedRef.current) setNeedsManualInputState(true);
  }, [location]);

  const detectLocation = useCallback((applyImmediately = false): Promise<Location | null> => {
    if (detectionPromiseRef.current) return detectionPromiseRef.current;
    markDetectionAttempted();
    setDetectionError("");
    if (!navigator.geolocation) {
      locationLogger.warn("geolocation_unavailable", { reason: "unsupported_browser" });
      setDetectionError("이 브라우저에서는 현재 위치를 사용할 수 없어요.");
      requestManualInput();
      return Promise.resolve(null);
    }
    setIsDetecting(true);
    const detectionPromise = new Promise<Location | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            locationLogger.debug("geolocation_resolved", {
              accuracy: Math.round(coords.accuracy),
            });
            const result = await weatherApi.reverseGeocode(coords.latitude, coords.longitude);
            if (applyImmediately) {
              setLocation(result);
              setNeedsManualInputState(false);
            }
            resolve(result);
          } catch (error) {
            locationLogger.warn("reverse_geocode_failed", {
              reason: error instanceof Error ? error.name : "unknown",
            });
            setDetectionError("위치 서버에 연결하지 못했어요. 다시 시도하거나 동네를 검색해 주세요.");
            requestManualInput();
            resolve(null);
          } finally {
            setIsDetecting(false);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            locationLogger.info("geolocation_permission_denied");
          } else {
            locationLogger.warn("geolocation_failed", { code: error.code });
          }
          setIsDetecting(false);
          setDetectionError(error.code === error.PERMISSION_DENIED
            ? "위치 권한이 없어 현재 동네를 찾지 못했어요. 동네를 직접 검색해 주세요."
            : "현재 위치를 확인하지 못했어요. 다시 시도하거나 동네를 검색해 주세요.");
          requestManualInput();
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
      );
    });
    const trackedPromise = detectionPromise.finally(() => {
      detectionPromiseRef.current = null;
    });
    detectionPromiseRef.current = trackedPromise;
    return trackedPromise;
  }, [markDetectionAttempted, requestManualInput, setLocation]);

  useEffect(() => {
    if (hasAttemptedDetection || location) return;
    const timeout = window.setTimeout(() => {
      void detectLocation(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [detectLocation, hasAttemptedDetection, location]);

  useEffect(() => {
    if (location || !hasAttemptedDetection || isDetecting) return;
    requestManualInput();
  }, [hasAttemptedDetection, isDetecting, location, requestManualInput]);

  useEffect(() => {
    const locationId = location?.id;
    if (!locationId || !/^\d+$/.test(locationId) || refreshedLocationIds.has(locationId)) return;
    refreshedLocationIds.add(locationId);
    void locationApi.get(locationId).then(setLocation).catch(() => {
      refreshedLocationIds.delete(locationId);
    });
  }, [location?.id, setLocation]);

  return { location, setLocation, isDetecting, detectionError, needsManualInput, setNeedsManualInput, detectLocation };
}
