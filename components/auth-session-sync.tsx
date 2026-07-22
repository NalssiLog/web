"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { authApi } from "@/lib/api/auth-api";
import { ApiError } from "@/lib/api/http-client";
import { useAuthStore } from "@/store/auth-store";

export function AuthSessionSync() {
  const setServerUser = useAuthStore((state) => state.setServerUser);
  const setPendingSignupProvider = useAuthStore((state) => state.setPendingSignupProvider);
  const session = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!session.data) return;
    setServerUser(session.data.authenticated && session.data.user ? session.data.user : undefined);
    if (session.data.result === "SIGNUP_REQUIRED" && session.data.pendingAuth) {
      setPendingSignupProvider(session.data.pendingAuth.provider, session.data.pendingAuth.email);
    }
  }, [session.data, setPendingSignupProvider, setServerUser]);

  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) setServerUser(undefined);
  }, [session.error, setServerUser]);

  return null;
}
