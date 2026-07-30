"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { weatherApi } from "@/lib/api";
import { locationApi } from "@/lib/api/location-api";
import { shouldRefreshLocationAfterResume } from "@/lib/location-auto-refresh";
import { logger } from "@/lib/logging";
import type { Location } from "@/lib/types";
import { useLocationStore } from "@/store/location-store";

const locationLogger = logger.child("location.detection");
const refreshedLocationIds = new Set<string>();
interface LocationDetectionResult {
  location: Location | null;
  error: string | null;
}

let activeDetectionPromise: Promise<LocationDetectionResult> | null = null;
let activeDetectionMode: "automatic" | "manual" | null = null;
let manualDetectionGeneration = 0;
let hasRequestedColdDetection = false;
let lastAutomaticDetectionAt = 0;

const unsupportedMessage = "이 브라우저에서는 현재 위치를 사용할 수 없어요.";
const permissionDeniedMessage = "위치 권한이 없어 현재 동네를 찾지 못했어요. 동네를 직접 검색해 주세요.";
const locationFailureMessage = "현재 위치를 확인하지 못했어요. 다시 시도하거나 동네를 검색해 주세요.";
const reverseGeocodeFailureMessage = "위치 서버에 연결하지 못했어요. 다시 시도하거나 동네를 검색해 주세요.";

interface AutomaticDetectionOptions {
  automatic?: boolean;
  allowPermissionPrompt?: boolean;
  silentError?: boolean;
}

function getLocationIdentity(location: Location | null) {
  if (!location) return null;
  return location.id || `${location.latitude}:${location.longitude}:${location.label}`;
}

async function getGeolocationPermissionState(): Promise<PermissionState | "unsupported"> {
  if (!navigator.permissions?.query) return "unsupported";
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch {
    return "unsupported";
  }
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 0,
    });
  });
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && typeof (error as { code?: unknown }).code === "number";
}

async function detectCurrentLocation(
  applyImmediately = false,
  {
    automatic = false,
    allowPermissionPrompt = false,
    silentError = false,
  }: AutomaticDetectionOptions = {},
): Promise<Location | null> {
  const startingLocationIdentity = getLocationIdentity(useLocationStore.getState().location);
  const manualGenerationAtRequest = manualDetectionGeneration;
  if (!automatic) manualDetectionGeneration += 1;

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    if (!silentError) useLocationStore.getState().finishDetection(unsupportedMessage);
    locationLogger.warn("geolocation_unavailable", { reason: "unsupported_browser" });
    return null;
  }

  if (automatic) {
    const permissionState = await getGeolocationPermissionState();
    if (permissionState !== "granted" && !allowPermissionPrompt) {
      locationLogger.debug("automatic_geolocation_skipped", { permissionState });
      return null;
    }
  }

  const canApplyAutomaticResult = !activeDetectionPromise || activeDetectionMode === "automatic";
  const applyResult = async (detectionPromise: Promise<LocationDetectionResult>) => {
    const result = await detectionPromise;
    if (result.error) {
      if (silentError) {
        useLocationStore.getState().stopDetection();
      } else {
        useLocationStore.getState().finishDetection(result.error);
      }
      return null;
    }

    useLocationStore.getState().finishDetection();
    if (!applyImmediately || !result.location) return result.location;

    const currentLocationIdentity = getLocationIdentity(useLocationStore.getState().location);
    if (automatic && (
      !canApplyAutomaticResult
      || manualDetectionGeneration !== manualGenerationAtRequest
      || currentLocationIdentity !== startingLocationIdentity
    )) {
      locationLogger.debug("automatic_geolocation_apply_skipped", {
        reason: "manual_detection_or_location_change",
      });
      return result.location;
    }

    useLocationStore.getState().setLocation(result.location);
    return result.location;
  };

  if (activeDetectionPromise) return applyResult(activeDetectionPromise);

  const store = useLocationStore.getState();
  store.markDetectionAttempted();
  store.startDetection();

  const detectionPromise = (async () => {
    let position: GeolocationPosition;
    try {
      position = await getCurrentPosition();
      locationLogger.debug("geolocation_resolved", {
        accuracy: Math.round(position.coords.accuracy),
      });
    } catch (error) {
      if (isGeolocationError(error) && error.code === error.PERMISSION_DENIED) {
        locationLogger.info("geolocation_permission_denied");
      } else {
        locationLogger.warn("geolocation_failed", {
          code: isGeolocationError(error) ? error.code : "unknown",
        });
      }
      return {
        location: null,
        error: isGeolocationError(error) && error.code === error.PERMISSION_DENIED
          ? permissionDeniedMessage
          : locationFailureMessage,
      };
    }

    try {
      const location = await weatherApi.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );
      return { location, error: null };
    } catch (error) {
      locationLogger.warn("reverse_geocode_failed", {
        reason: error instanceof Error ? error.name : "unknown",
      });
      return { location: null, error: reverseGeocodeFailureMessage };
    }
  })();

  activeDetectionPromise = detectionPromise;
  activeDetectionMode = automatic ? "automatic" : "manual";
  void detectionPromise.finally(() => {
    if (activeDetectionPromise === detectionPromise) {
      activeDetectionPromise = null;
      activeDetectionMode = null;
    }
  });
  return applyResult(detectionPromise);
}

export function useCurrentLocation({ refreshOnHomeResume = false } = {}) {
  const {
    location,
    setLocation,
    isDetecting,
    detectionError,
  } = useLocationStore();
  const [needsManualInput, setNeedsManualInputState] = useState(false);
  const hiddenAtRef = useRef<number | null>(null);
  const needsManualInputRef = useRef(false);

  const setNeedsManualInput = useCallback((next: boolean) => {
    needsManualInputRef.current = next;
    setNeedsManualInputState(next);
  }, []);

  const detectLocation = useCallback((applyImmediately = false) => (
    detectCurrentLocation(applyImmediately)
  ), []);

  useEffect(() => {
    if (!refreshOnHomeResume || hasRequestedColdDetection) return;

    const timeout = window.setTimeout(() => {
      if (hasRequestedColdDetection) return;
      hasRequestedColdDetection = true;
      const currentState = useLocationStore.getState();
      lastAutomaticDetectionAt = Date.now();
      void detectCurrentLocation(true, {
        automatic: true,
        allowPermissionPrompt: !currentState.location && !currentState.hasAttemptedDetection,
        silentError: Boolean(currentState.location),
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshOnHomeResume]);

  useEffect(() => {
    if (!refreshOnHomeResume) return;

    const markHidden = () => {
      if (hiddenAtRef.current === null) hiddenAtRef.current = Date.now();
    };
    const refreshAfterResume = () => {
      const now = Date.now();
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (needsManualInputRef.current) return;
      if (!shouldRefreshLocationAfterResume({
        hiddenAt,
        now,
        lastRefreshAt: lastAutomaticDetectionAt,
      })) return;

      lastAutomaticDetectionAt = now;
      void detectCurrentLocation(true, {
        automatic: true,
        allowPermissionPrompt: false,
        silentError: true,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") markHidden();
      if (document.visibilityState === "visible") refreshAfterResume();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshAfterResume();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", markHidden);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", markHidden);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refreshOnHomeResume]);

  useEffect(() => {
    const locationId = location?.id;
    if (!locationId || !/^\d+$/.test(locationId) || refreshedLocationIds.has(locationId)) return;
    refreshedLocationIds.add(locationId);
    void locationApi.get(locationId).then(setLocation).catch(() => {
      refreshedLocationIds.delete(locationId);
    });
  }, [location?.id, setLocation]);

  return {
    location,
    setLocation,
    isDetecting,
    detectionError,
    needsManualInput,
    setNeedsManualInput,
    detectLocation,
  };
}
