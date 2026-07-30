"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SocialIcon } from "@/components/social-icon";
import { authApi, type OAuthCallbackResult } from "@/lib/api/auth-api";
import { markAccountPanelReturn } from "@/lib/account-panel-return";
import { resolveApiUrl } from "@/lib/api/config";
import { logger } from "@/lib/logging";
import type { SocialProvider } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

const authLogger = logger.child("auth.callback");

const providerLabel: Record<SocialProvider, string> = {
  NAVER: "네이버",
  KAKAO: "카카오",
  GOOGLE: "구글",
};

function isOAuthCallbackResult(value: string | null): value is OAuthCallbackResult {
  return ["SUCCESS", "SIGNUP_REQUIRED", "LINK_REQUIRED", "LINK_SUCCESS", "LINK_FAILED", "FAILED"].includes(value ?? "");
}

function getOAuthFailureMessage(code: string | null) {
  if (code === "OAUTH_CANCELLED") return "소셜 로그인을 취소했어요.";
  if (code === "OAUTH_EMAIL_REQUIRED") return "가입하려면 소셜 계정의 이메일 제공 동의가 필요해요.";
  if (code === "ACCOUNT_ALREADY_LINKED") return "이미 다른 계정에 연동된 소셜 계정이에요.";
  return "소셜 로그인을 완료하지 못했어요.";
}

export function AuthCallbackScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const setServerUser = useAuthStore((state) => state.setServerUser);
  const setPendingSignupProvider = useAuthStore((state) => state.setPendingSignupProvider);
  const showToast = useToastStore((state) => state.showToast);
  const startedRef = useRef(false);
  const [pendingLink, setPendingLink] = useState<{ provider: SocialProvider; email: string; existingProviders?: SocialProvider[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const callbackResult = searchParams.get("result");
    const result: OAuthCallbackResult = isOAuthCallbackResult(callbackResult) ? callbackResult : "FAILED";

    void authApi.getMe().then((session) => {
      queryClient.setQueryData(["auth", "me"], session);
      if (session.result === "SUCCESS" && session.authenticated && session.user) {
        setServerUser(session.user);
        const code = searchParams.get("code");
        if (result === "LINK_SUCCESS") {
          authLogger.info("authentication_completed", { result });
          queryClient.removeQueries({ queryKey: ["members", "me"], exact: true });
          markAccountPanelReturn();
          showToast("소셜 계정을 연동했어요.", "SUCCESS");
          router.replace("/mypage");
          return;
        }
        if (result === "LINK_FAILED" || result === "FAILED") {
          authLogger.warn("authentication_failed", { result, code: code ?? "UNKNOWN" });
          showToast(getOAuthFailureMessage(code), code === "OAUTH_CANCELLED" ? "INFO" : "ERROR");
          router.replace(result === "LINK_FAILED" ? "/mypage" : "/");
          return;
        }
        authLogger.info("authentication_completed", { result });
        showToast("로그인했어요.", "SUCCESS");
        router.replace("/");
        return;
      }
      if (session.result === "SIGNUP_REQUIRED" && session.pendingAuth) {
        authLogger.info("signup_required", { provider: session.pendingAuth.provider });
        setPendingSignupProvider(session.pendingAuth.provider, session.pendingAuth.email);
        router.replace("/signup");
        return;
      }
      if (session.result === "LINK_REQUIRED" && session.pendingAuth) {
        authLogger.info("account_link_required", { provider: session.pendingAuth.provider });
        setPendingLink(session.pendingAuth);
        return;
      }

      const code = searchParams.get("code");
      if (code === "OAUTH_CANCELLED") {
        authLogger.info("authentication_cancelled", { result });
      } else {
        authLogger.warn("authentication_failed", { result, code: code ?? "UNKNOWN" });
      }
      showToast(getOAuthFailureMessage(code), code === "OAUTH_CANCELLED" ? "INFO" : "ERROR");
      router.replace("/");
    }).catch((error) => {
      authLogger.error("session_confirmation_failed", error, { result });
      showToast("로그인 상태를 확인하지 못했어요.", "ERROR");
      router.replace("/");
    });
  }, [queryClient, router, searchParams, setPendingSignupProvider, setServerUser, showToast]);

  const consent = async () => {
    setIsSubmitting(true);
    try {
      const { authorizationUrl } = await authApi.consentToLink();
      window.location.assign(resolveApiUrl(authorizationUrl));
    } catch (error) {
      authLogger.error("link_consent_failed", error);
      setIsSubmitting(false);
      showToast("계정 연동을 시작하지 못했어요.", "ERROR");
    }
  };

  const cancel = async () => {
    setIsSubmitting(true);
    try {
      await authApi.cancelLink();
    } catch (error) {
      authLogger.warn("link_cancel_failed", { reason: error instanceof Error ? error.name : "unknown" });
      showToast("계정 연동 취소 상태를 반영하지 못했어요.", "ERROR");
    } finally {
      router.replace("/");
    }
  };

  if (!pendingLink) {
    return <main className="flex min-h-[75dvh] items-center justify-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-[#45ace4]" /><p className="mt-3 text-sm font-bold text-[#718594]">로그인 정보를 확인하고 있어요.</p></div></main>;
  }
  const existingProvider = pendingLink.existingProviders?.[0];

  return (
    <main className="flex min-h-[75dvh] items-center justify-center px-5">
      <section className="w-full max-w-[340px] rounded-[24px] border-2 border-[#d2e3ec] bg-[#eef9ff] p-5">
        <h1 className="text-center text-xl font-extrabold">계정 연동</h1>
        <div className="mt-4 rounded-[20px] border-2 border-[#d2e3ec] px-4 py-5 text-center">
          <div className="mx-auto w-fit"><SocialIcon provider={pendingLink.provider} /></div>
          <p className="mt-4 text-xs font-extrabold text-[#238fc9]">{pendingLink.email}</p>
          <p className="mt-3 text-sm font-extrabold">{existingProvider ? `이미 ${providerLabel[existingProvider]} 계정이 있어요.` : "이미 가입된 회원 정보가 있어요."}</p>
          <p className="mt-2 text-sm font-semibold text-[#526a7a]">{providerLabel[pendingLink.provider]} 계정을 연동할까요?</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" disabled={isSubmitting} onClick={() => void cancel()} className="rounded-2xl border-2 border-[#d2e3ec] py-3.5 text-sm font-extrabold text-[#526a7a] disabled:opacity-50">취소</button>
          <button type="button" disabled={isSubmitting} onClick={() => void consent()} className="rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white disabled:opacity-50">{isSubmitting ? "처리 중…" : "연동하기"}</button>
        </div>
      </section>
    </main>
  );
}
