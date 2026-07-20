"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Link2,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquareText,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { WithdrawalConfirmModal } from "@/components/withdrawal-confirm-modal";
import { getTextLength, truncateText } from "@/lib/text";
import type { SocialProvider } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useLocationPreferencesStore } from "@/store/location-preferences-store";
import { useToastStore } from "@/store/toast-store";

const providerLabel: Record<SocialProvider, string> = {
  NAVER: "네이버",
  KAKAO: "카카오",
  GOOGLE: "구글",
};

const socialProviders: SocialProvider[] = ["NAVER", "KAKAO", "GOOGLE"];

function SocialIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "NAVER") {
    return <span className="flex size-9 items-center justify-center rounded-full bg-[#03c75a] text-sm font-black text-white">N</span>;
  }
  if (provider === "KAKAO") {
    return <span className="flex size-9 items-center justify-center rounded-full bg-[#fee500] text-[#181600]"><MessageCircle size={17} fill="currentColor" /></span>;
  }
  return <span className="flex size-9 items-center justify-center rounded-full border border-[#e2e8ec] bg-white text-sm font-black"><span className="bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_42%,#fbbc05_0_67%,#ea4335_0_84%,#4285f4_0)] bg-clip-text text-transparent">G</span></span>;
}

export function UserPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user, login, logout, withdraw, setSocialProviderLinked } = useAuthStore();
  const clearFavorites = useLocationPreferencesStore((state) => state.clearFavorites);
  const showToast = useToastStore((state) => state.showToast);
  const [view, setView] = useState<"MAIN" | "ACCOUNT" | "FEEDBACK">("MAIN");
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!open) return null;
  const member = user.type === "MEMBER" ? user : null;

  const closePanel = () => {
    setView("MAIN");
    setIsWithdrawalOpen(false);
    onClose();
  };

  const loginWith = (provider: SocialProvider) => {
    login(provider);
    showToast(`${providerLabel[provider]} 계정으로 로그인했어요.`, "SUCCESS");
    closePanel();
  };

  const handleLogout = () => {
    closePanel();
    logout();
    showToast("로그아웃했어요.", "INFO");
    router.replace("/");
  };

  const handleWithdraw = () => {
    withdraw();
    clearFavorites();
    showToast("회원 탈퇴가 완료됐어요.", "SUCCESS");
    closePanel();
    router.replace("/");
  };

  const showPolicyNotice = (label: string) => {
    showToast(`${label} 페이지를 준비하고 있어요.`, "INFO");
  };

  const submitFeedback = () => {
    if (!feedback.trim()) return;
    setFeedback("");
    setView("MAIN");
    showToast("소중한 의견을 전달했어요.", "SUCCESS");
  };

  const handleSocialToggle = (provider: SocialProvider) => {
    if (!member || provider === member.provider) return;
    const linked = (member.linkedProviders ?? [member.provider]).includes(provider);
    setSocialProviderLinked(provider, !linked);
    showToast(`${providerLabel[provider]} 계정 연동을 ${linked ? "해제했어요" : "완료했어요"}.`, "SUCCESS");
  };

  const isAccountView = Boolean(member && view === "ACCOUNT");
  const isFeedbackView = Boolean(member && view === "FEEDBACK");
  const isSubView = isAccountView || isFeedbackView;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#173144]/30 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="user-panel-title">
      <div className={member ? "mb-4 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[380px] overflow-y-auto rounded-[24px] bg-[#eef9ff] p-5 pb-6 shadow-2xl sm:mb-0" : "mb-4 w-[calc(100%-32px)] max-w-[340px] rounded-[24px] bg-[#eef9ff] p-5 pb-6 shadow-2xl sm:mb-0"}>
        <div className={`${member ? "mb-4" : "mb-3"} grid grid-cols-[42px_1fr_42px] items-center`}>
          {isSubView ? (
            <button type="button" onClick={() => setView("MAIN")} className="icon-button" aria-label="설정으로 돌아가기"><ArrowLeft size={20} /></button>
          ) : <span />}
          <h2 id="user-panel-title" className="text-center text-xl font-extrabold">{member ? (isAccountView ? "계정 정보" : isFeedbackView ? "서비스 피드백" : "설정") : "로그인"}</h2>
          <button type="button" onClick={closePanel} className="icon-button" aria-label="닫기"><X size={20} /></button>
        </div>

        {member ? (isAccountView ? (
          <div className="space-y-2.5">
            <section className="overflow-hidden rounded-[20px] border border-[#e2ecf2] bg-white shadow-sm shadow-[#b8d6e6]/15">
              <div className="flex items-center gap-3 px-4 py-4">
                <Mail size={18} className="shrink-0 text-[#718594]" />
                <div className="min-w-0"><p className="text-xs font-bold text-[#718594]">이메일</p><p className="mt-1 truncate text-sm font-extrabold">{member.email}</p></div>
              </div>
            </section>

            <div className="overflow-hidden rounded-[20px] border border-[#e2ecf2] bg-white">
              <div className="flex items-center gap-2 border-b border-[#edf2f5] px-4 py-3 text-sm font-extrabold"><Link2 size={17} className="text-[#718594]" /> 소셜 연동</div>
              {socialProviders.map((provider, index) => {
                const isCurrent = provider === member.provider;
                const isLinked = isCurrent || (member.linkedProviders ?? [member.provider]).includes(provider);
                return (
                  <div key={provider} className={`flex items-center gap-3 px-4 py-3 ${index < socialProviders.length - 1 ? "border-b border-[#edf2f5]" : ""}`}>
                    <SocialIcon provider={provider} />
                    <div>
                      <p className="text-sm font-extrabold">{providerLabel[provider]}</p>
                      <p className={`mt-0.5 text-[11px] font-extrabold ${isCurrent ? "text-[#238fc9]" : "text-[#718594]"}`}>{isCurrent ? "현재 로그인" : isLinked ? "연동됨" : "연동 안 됨"}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      disabled={isCurrent}
                      aria-checked={isLinked}
                      aria-label={`${providerLabel[provider]} 계정 연동`}
                      onClick={() => handleSocialToggle(provider)}
                      className={`ml-auto flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${isLinked ? "bg-[#45ace4]" : "bg-[#cbd6dc]"} disabled:cursor-default`}
                    >
                      <span className={`size-6 rounded-full bg-white shadow-sm transition-transform ${isLinked ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => setIsWithdrawalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-[#c95e5e]"><Trash2 size={17} /> 회원 탈퇴</button>
          </div>
        ) : isFeedbackView ? (
          <div>
            <div className="rounded-[20px] border border-[#e2ecf2] bg-white p-4">
              <div className="flex items-center justify-between">
                <label htmlFor="service-feedback" className="text-sm font-extrabold">서비스에 대한 의견</label>
                <span className="text-xs font-bold text-[#8ba0ae]">{getTextLength(feedback)}/500</span>
              </div>
              <textarea
                id="service-feedback"
                value={feedback}
                maxLength={500}
                onChange={(event) => setFeedback(truncateText(event.target.value, 500))}
                placeholder="불편했던 점이나 바라는 점을 남겨주세요."
                className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-[#dce8ee] bg-[#f9fcfe] p-3.5 text-sm font-semibold leading-6 outline-none transition placeholder:text-[#9aabb5] focus:border-[#45ace4]"
              />
            </div>
            <button type="button" disabled={!feedback.trim()} onClick={submitFeedback} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]"><Send size={17} /> 제출하기</button>
          </div>
        ) : <>
          <div className="overflow-hidden rounded-[20px] border border-[#e2ecf2] bg-white">
            <button type="button" onClick={() => setView("ACCOUNT")} className="flex w-full items-center gap-3 border-b border-[#edf2f5] px-4 py-4 text-left text-sm font-extrabold"><UserRound size={18} className="text-[#718594]" /> 계정 정보 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => setView("FEEDBACK")} className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-extrabold"><MessageSquareText size={18} className="text-[#718594]" /> 서비스 피드백 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
          </div>
          <div className="mt-3 overflow-hidden rounded-[20px] border border-[#e2ecf2] bg-white">
            <button type="button" onClick={() => showPolicyNotice("개인정보처리방침")} className="flex w-full items-center gap-3 border-b border-[#edf2f5] px-4 py-4 text-left text-sm font-extrabold"><ShieldCheck size={18} className="text-[#718594]" /> 개인정보처리방침 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => showPolicyNotice("서비스 이용약관")} className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-extrabold"><FileText size={18} className="text-[#718594]" /> 서비스 이용약관 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
          </div>
          <button type="button" onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 rounded-[20px] border border-[#e2ecf2] bg-white px-4 py-4 text-left text-sm font-extrabold"><LogOut size={18} className="text-[#718594]" /> 로그아웃</button>
        </>) : <div className="flex min-h-24 items-center justify-center gap-3.5">
          <button type="button" onClick={() => loginWith("NAVER")} className="flex size-11 items-center justify-center rounded-full bg-[#03c75a] text-lg font-black text-white shadow-sm transition hover:-translate-y-0.5" aria-label="네이버 로그인">N</button>
          <button type="button" onClick={() => loginWith("KAKAO")} className="flex size-11 items-center justify-center rounded-full bg-[#fee500] text-[#181600] shadow-sm transition hover:-translate-y-0.5" aria-label="카카오 로그인"><MessageCircle size={21} fill="currentColor" /></button>
          <button type="button" onClick={() => loginWith("GOOGLE")} className="flex size-11 items-center justify-center rounded-full border border-[#e2e8ec] bg-white text-lg font-black shadow-sm transition hover:-translate-y-0.5" aria-label="구글 로그인"><span className="bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_42%,#fbbc05_0_67%,#ea4335_0_84%,#4285f4_0)] bg-clip-text text-transparent">G</span></button>
        </div>}
      </div>
      {member && isWithdrawalOpen && (
        <WithdrawalConfirmModal onClose={() => setIsWithdrawalOpen(false)} onConfirm={handleWithdraw} />
      )}
    </div>
  );
}
