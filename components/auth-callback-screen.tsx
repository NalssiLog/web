"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SocialIcon } from "@/components/social-icon";
import { authApi, type AuthResult } from "@/lib/api/auth-api";
import { getApiUrl } from "@/lib/api/config";
import type { SocialProvider } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

const providerLabel: Record<SocialProvider, string> = {
  NAVER: "네이버",
  KAKAO: "카카오",
  GOOGLE: "구글",
};

function isAuthResult(value: string | null): value is AuthResult {
  return ["SUCCESS", "SIGNUP_REQUIRED", "LINK_REQUIRED", "LINK_SUCCESS", "LINK_FAILED", "FAILED"].includes(value ?? "");
}

function resolveAuthorizationUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return getApiUrl(url);
}

export function AuthCallbackScreen() {
  const router = useRouter();
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
    const result: AuthResult = isAuthResult(callbackResult) ? callbackResult : "FAILED";

    void authApi.getMe().then((session) => {
      if ((result === "SUCCESS" || result === "LINK_SUCCESS") && session.authenticated && session.user) {
        setServerUser(session.user);
        showToast(result === "LINK_SUCCESS" ? "소셜 계정을 연동했어요." : "로그인했어요.", "SUCCESS");
        router.replace("/");
        return;
      }
      if (result === "SIGNUP_REQUIRED" && session.pendingAuth) {
        setPendingSignupProvider(session.pendingAuth.provider, session.pendingAuth.email);
        router.replace("/signup");
        return;
      }
      if (result === "LINK_REQUIRED" && session.pendingAuth) {
        setPendingLink(session.pendingAuth);
        return;
      }

      const code = searchParams.get("code");
      showToast(code === "OAUTH_CANCELLED" ? "소셜 로그인을 취소했어요." : "소셜 로그인을 완료하지 못했어요.", result === "LINK_FAILED" ? "ERROR" : "INFO");
      router.replace("/");
    }).catch(() => {
      showToast("로그인 상태를 확인하지 못했어요.", "ERROR");
      router.replace("/");
    });
  }, [router, searchParams, setPendingSignupProvider, setServerUser, showToast]);

  const consent = async () => {
    setIsSubmitting(true);
    try {
      const { authorizationUrl } = await authApi.consentToLink();
      window.location.assign(resolveAuthorizationUrl(authorizationUrl));
    } catch {
      setIsSubmitting(false);
      showToast("계정 연동을 시작하지 못했어요.", "ERROR");
    }
  };

  const cancel = async () => {
    setIsSubmitting(true);
    try {
      await authApi.cancelLink();
    } catch {
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
      <section className="w-full max-w-[340px] rounded-[24px] bg-[#eef9ff] p-5 shadow-xl">
        <h1 className="text-center text-xl font-extrabold">계정 연동</h1>
        <div className="mt-4 rounded-[20px] bg-white px-4 py-5 text-center">
          <div className="mx-auto w-fit"><SocialIcon provider={pendingLink.provider} /></div>
          <p className="mt-4 text-xs font-extrabold text-[#238fc9]">{pendingLink.email}</p>
          <p className="mt-3 text-sm font-extrabold">{existingProvider ? `이미 ${providerLabel[existingProvider]} 계정이 있어요.` : "이미 가입된 회원 정보가 있어요."}</p>
          <p className="mt-2 text-sm font-semibold text-[#526a7a]">{providerLabel[pendingLink.provider]} 계정을 연동할까요?</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" disabled={isSubmitting} onClick={() => void cancel()} className="rounded-2xl border border-[#dce8ef] bg-white py-3.5 text-sm font-extrabold text-[#526a7a] disabled:opacity-50">취소</button>
          <button type="button" disabled={isSubmitting} onClick={() => void consent()} className="rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white disabled:opacity-50">{isSubmitting ? "처리 중…" : "연동하기"}</button>
        </div>
      </section>
    </main>
  );
}
