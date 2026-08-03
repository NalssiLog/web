"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { authApi, type AuthMeResponse } from "@/lib/api/auth-api";
import { ApiError } from "@/lib/api/http-client";
import { hasAuthSessionHint, useAuthStore } from "@/store/auth-store";

async function restoreExpectedSession(): Promise<AuthMeResponse> {
  const session = await authApi.getMe();
  if (session.result !== "NONE" || !hasAuthSessionHint()) return session;

  try {
    await authApi.refresh();
    return await authApi.getMe();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return session;
    }
    throw error;
  }
}

export function AuthSessionSync() {
  const setServerUser = useAuthStore((state) => state.setServerUser);
  const setPendingSignupProvider = useAuthStore((state) => state.setPendingSignupProvider);
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: restoreExpectedSession,
    retry: false,
    staleTime: 30_000,
  });
  const refetchSession = session.refetch;

  useEffect(() => {
    if (!session.data) return;
    setServerUser(session.data.authenticated && session.data.user ? session.data.user : undefined);
    if (session.data.result === "SIGNUP_REQUIRED" && session.data.pendingAuth) {
      setPendingSignupProvider(session.data.pendingAuth.provider, session.data.pendingAuth.email);
    } else {
      setPendingSignupProvider(undefined);
    }
  }, [session.data, setPendingSignupProvider, setServerUser]);

  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) setServerUser(undefined);
  }, [session.error, setServerUser]);

  useEffect(() => {
    let lastSyncAt = 0;
    const syncSession = () => {
      const now = Date.now();
      if (now - lastSyncAt < 1_000) return;
      lastSyncAt = now;
      void refetchSession();
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncSession();
    };

    window.addEventListener("pageshow", syncSession);
    window.addEventListener("online", syncSession);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.removeEventListener("pageshow", syncSession);
      window.removeEventListener("online", syncSession);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [refetchSession]);

  return null;
}
