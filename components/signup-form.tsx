"use client";

import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SocialIcon } from "@/components/social-icon";
import { checkNicknameAvailability } from "@/lib/api/mock-user-api";
import { MOCK_SOCIAL_PROFILES } from "@/lib/constants";
import { getTextLength } from "@/lib/text";
import type { SocialProvider } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useLegalModalStore } from "@/store/legal-modal-store";
import { useToastStore } from "@/store/toast-store";

type CheckState = "IDLE" | "CHECKING" | "AVAILABLE" | "TAKEN";

const providerLabel: Record<SocialProvider, string> = {
  NAVER: "네이버",
  KAKAO: "카카오",
  GOOGLE: "구글",
};

const nicknamePattern = /^[가-힣a-zA-Z0-9]{2,10}$/;
const isNicknameValid = (value: string) => value === value.trim() && nicknamePattern.test(value);

export function SignupForm() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const provider = useAuthStore((state) => state.pendingSignupProvider);
  const signup = useAuthStore((state) => state.signup);
  const setPendingSignupProvider = useAuthStore((state) => state.setPendingSignupProvider);
  const openLegalDocument = useLegalModalStore((state) => state.openLegalDocument);
  const showToast = useToastStore((state) => state.showToast);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("IDLE");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkRequestRef = useRef(0);
  const isNameValid = getTextLength(name.trim()) > 0 && getTextLength(name.trim()) <= 30;
  const isValid = isNicknameValid(nickname);
  const canSubmit = Boolean(provider && isNameValid && checkState === "AVAILABLE" && privacyAgreed && termsAgreed);

  useEffect(() => {
    if (!provider) router.replace(user.type === "MEMBER" ? "/mypage" : "/");
  }, [provider, router, user.type]);

  useEffect(() => () => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
  }, []);

  const changeNickname = (value: string) => {
    if (getTextLength(value) > 10) return;
    setNickname(value);
    checkRequestRef.current += 1;
    const requestId = checkRequestRef.current;
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    if (!isNicknameValid(value)) {
      setCheckState("IDLE");
      return;
    }

    setCheckState("CHECKING");
    checkTimerRef.current = setTimeout(async () => {
      const available = await checkNicknameAvailability(value, "");
      if (requestId !== checkRequestRef.current) return;
      setCheckState(available ? "AVAILABLE" : "TAKEN");
    }, 350);
  };

  const cancel = () => {
    setPendingSignupProvider(undefined);
    router.replace("/");
  };

  const submit = () => {
    if (!provider || !canSubmit) return;
    signup(provider, name.trim(), nickname.trim());
    showToast("회원가입이 완료됐어요.", "SUCCESS");
    router.replace("/");
  };

  if (!provider) return null;

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
              <p className="mt-0.5 truncate text-xs font-semibold text-[#718594]">{MOCK_SOCIAL_PROFILES[provider].email}</p>
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-[22px] bg-white p-5 shadow-sm shadow-[#b8d6e6]/20">
          <label htmlFor="signup-name" className="text-sm font-extrabold">이름 <span className="text-[#45ace4]">*</span></label>
          <input
            id="signup-name"
            value={name}
            required
            maxLength={30}
            autoComplete="name"
            onChange={(event) => {
              if (getTextLength(event.currentTarget.value) <= 30) setName(event.currentTarget.value);
            }}
            placeholder="이름 입력"
            className="mt-3 w-full rounded-xl border border-[#dce8ee] px-3 py-3 text-sm font-bold outline-none transition focus:border-[#45ace4]"
          />
          <label htmlFor="signup-nickname" className="mt-5 block text-sm font-extrabold">닉네임 <span className="text-[#45ace4]">*</span></label>
          <div className="relative mt-3">
            <input
              id="signup-nickname"
              value={nickname}
              required
              maxLength={10}
              onBeforeInput={(event) => {
                const inputType = (event.nativeEvent as InputEvent).inputType;
                if (typeof inputType === "string" && inputType.startsWith("insert") && getTextLength(nickname) >= 10) event.preventDefault();
              }}
              onKeyDown={(event) => {
                const isCharacterKey = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
                if (isCharacterKey && getTextLength(nickname) >= 10) event.preventDefault();
              }}
              onPaste={(event) => {
                const selectionStart = event.currentTarget.selectionStart ?? 0;
                const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
                const selectedLength = getTextLength(nickname.slice(selectionStart, selectionEnd));
                const pastedLength = getTextLength(event.clipboardData.getData("text"));
                if (getTextLength(nickname) >= 10 || getTextLength(nickname) - selectedLength + pastedLength > 10) event.preventDefault();
              }}
              onChange={(event) => changeNickname(event.currentTarget.value)}
              placeholder="닉네임 입력"
              className="w-full rounded-xl border border-[#dce8ee] px-3 py-3 pr-10 text-sm font-bold outline-none transition focus:border-[#45ace4]"
            />
            {checkState === "CHECKING" && <LoaderCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#45ace4]" aria-label="닉네임 중복 확인 중" />}
          </div>
          <div className="mt-2 min-h-5 text-[11px] font-bold">
            {!isValid && nickname.length > 0 && <p className="whitespace-nowrap tracking-[-0.03em] text-[#c95e5e]">공백과 초성을 제외한 한글, 영문, 숫자 2~10자로 입력해주세요.</p>}
            {checkState === "AVAILABLE" && <p className="flex items-center gap-1 text-[#2d9b67]"><Check size={14} /> 사용할 수 있는 닉네임이에요.</p>}
            {checkState === "TAKEN" && <p className="text-[#c95e5e]">이미 사용 중인 닉네임이에요.</p>}
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

        <button type="submit" disabled={!canSubmit} className="mt-5 w-full rounded-2xl bg-[#45ace4] py-4 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">회원가입 완료</button>
      </form>
    </main>
  );
}
