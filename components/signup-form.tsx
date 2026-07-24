"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SocialIcon } from "@/components/social-icon";
import { authApi } from "@/lib/api/auth-api";
import { ApiError } from "@/lib/api/http-client";
import type { SocialProvider } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useLegalModalStore } from "@/store/legal-modal-store";
import { useToastStore } from "@/store/toast-store";

const providerLabel: Record<SocialProvider, string> = {
  NAVER: "네이버",
  KAKAO: "카카오",
  GOOGLE: "구글",
};

export function SignupForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasCheckedServerSession = useAuthStore((state) => state.hasCheckedServerSession);
  const provider = useAuthStore((state) => state.pendingSignupProvider);
  const pendingEmail = useAuthStore((state) => state.pendingSignupEmail);
  const setServerUser = useAuthStore((state) => state.setServerUser);
  const setPendingSignupProvider = useAuthStore((state) => state.setPendingSignupProvider);
  const openLegalDocument = useLegalModalStore((state) => state.openLegalDocument);
  const showToast = useToastStore((state) => state.showToast);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingSignupSession, setIsVerifyingSignupSession] = useState(true);
  const canSubmit = Boolean(provider && !isVerifyingSignupSession && privacyAgreed && termsAgreed);

  const expireSignupSession = useCallback(() => {
    setPendingSignupProvider(undefined);
    showToast("인증 시간이 만료되었습니다. 다시 소셜 로그인해 주세요.", "INFO");
    router.replace("/");
  }, [router, setPendingSignupProvider, showToast]);

  useEffect(() => {
    if (hasCheckedServerSession && !provider) router.replace(user.type === "MEMBER" ? "/mypage" : "/");
  }, [hasCheckedServerSession, provider, router, user.type]);

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;

    void authApi.getMe().then((session) => {
      if (cancelled) return;
      queryClient.setQueryData(["auth", "me"], session);
      if (session.result === "SUCCESS" && session.authenticated && session.user) {
        setServerUser(session.user);
        setPendingSignupProvider(undefined);
        router.replace("/");
        return;
      }
      if (session.result !== "SIGNUP_REQUIRED" || !session.pendingAuth) {
        expireSignupSession();
        return;
      }
      setPendingSignupProvider(session.pendingAuth.provider, session.pendingAuth.email);
    }).catch(() => {
      // 네트워크 오류는 실제 가입 요청의 공통 오류 처리에 맡긴다.
    }).finally(() => {
      if (!cancelled) setIsVerifyingSignupSession(false);
    });

    return () => {
      cancelled = true;
    };
  }, [expireSignupSession, provider, queryClient, router, setPendingSignupProvider, setServerUser]);

  const cancel = () => {
    setPendingSignupProvider(undefined);
    router.replace("/");
  };

  const submit = async () => {
    if (!provider || !canSubmit) return;
    setIsSubmitting(true);
    try {
      await authApi.signup({
        agreedTerms: [
          { type: "SERVICE", version: "1.0" },
          { type: "PRIVACY", version: "1.0" },
        ],
      });
      const session = await authApi.getMe();
      if (!session.authenticated || !session.user) throw new Error("회원가입 후 로그인 상태가 없어요.");
      queryClient.setQueryData(["auth", "me"], session);
      setServerUser(session.user);
      setPendingSignupProvider(undefined);
      showToast("회원가입이 완료됐어요.", "SUCCESS");
      router.replace("/");
    } catch (error) {
      setIsSubmitting(false);
      if (error instanceof ApiError && error.code === "AUTH_SESSION_EXPIRED") {
        expireSignupSession();
        return;
      }
      showToast(error instanceof Error ? error.message : "회원가입을 완료하지 못했어요.", "ERROR");
    }
  };

  if (!provider) return !hasCheckedServerSession
    ? <main className="min-h-[75dvh] px-5 pt-24" aria-busy="true"><div className="skeleton mx-auto h-6 w-24 rounded" /><div className="skeleton mt-8 h-28 rounded-[22px]" /><div className="skeleton mt-3 h-64 rounded-[22px]" /></main>
    : null;

  return (
    <main className="min-h-screen pb-10">
      <header className="safe-top flex items-center justify-between px-5 pb-4">
        <button type="button" onClick={cancel} className="icon-button" aria-label="회원가입 취소"><ArrowLeft size={21} /></button>
        <h1 className="text-lg font-extrabold">회원가입</h1>
        <span className="w-[42px]" />
      </header>

      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="px-5 pt-4">
        <section className="rounded-[22px] bg-white p-5 shadow-sm shadow-[#b8d6e6]/20">
          <p className="text-xs font-bold text-[#718594]">가입 계정</p>
          <div className="mt-3 flex items-center gap-3">
            <SocialIcon provider={provider} className="size-11" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{providerLabel[provider]} 계정</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-[#718594]">{pendingEmail ?? "이메일 정보 없음"}</p>
            </div>
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-[22px] bg-white shadow-sm shadow-[#b8d6e6]/20">
          <div className="flex items-center gap-3 border-b border-[#edf2f5] px-5 py-4 text-sm font-bold">
            <label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={privacyAgreed} onChange={(event) => setPrivacyAgreed(event.target.checked)} className="peer sr-only" />
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#8dd3f7] peer-focus-visible:ring-offset-2 ${privacyAgreed ? "border-[#45ace4] bg-[#45ace4] text-white" : "border-[#c8d8e1] bg-[#f9fcfe] text-transparent group-hover:border-[#45ace4] group-hover:bg-[#eef9ff]"}`} aria-hidden="true">{privacyAgreed && <Check size={14} strokeWidth={3} />}</span>
              <span><span className="mr-1 text-[#238fc9]">[필수]</span>개인정보처리방침 동의</span>
            </label>
            <button type="button" onClick={() => openLegalDocument("PRIVACY")} className="shrink-0 cursor-pointer text-xs font-extrabold text-[#718594] underline underline-offset-2 transition-colors hover:text-[#238fc9]">보기</button>
          </div>
          <div className="flex items-center gap-3 px-5 py-4 text-sm font-bold">
            <label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={termsAgreed} onChange={(event) => setTermsAgreed(event.target.checked)} className="peer sr-only" />
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#8dd3f7] peer-focus-visible:ring-offset-2 ${termsAgreed ? "border-[#45ace4] bg-[#45ace4] text-white" : "border-[#c8d8e1] bg-[#f9fcfe] text-transparent group-hover:border-[#45ace4] group-hover:bg-[#eef9ff]"}`} aria-hidden="true">{termsAgreed && <Check size={14} strokeWidth={3} />}</span>
              <span><span className="mr-1 text-[#238fc9]">[필수]</span>서비스 이용약관 동의</span>
            </label>
            <button type="button" onClick={() => openLegalDocument("TERMS")} className="shrink-0 cursor-pointer text-xs font-extrabold text-[#718594] underline underline-offset-2 transition-colors hover:text-[#238fc9]">보기</button>
          </div>
        </section>

        <button type="submit" disabled={!canSubmit || isSubmitting} className="mt-5 w-full rounded-2xl bg-[#45ace4] py-4 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">{isSubmitting ? "가입하는 중…" : "회원가입 완료"}</button>
      </form>
    </main>
  );
}
