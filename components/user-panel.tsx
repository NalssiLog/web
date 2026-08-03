"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  ChevronRight,
  FileText,
  Link2,
  LogOut,
  Mail,
  MessageSquareText,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { NameEditModal } from "@/components/name-edit-modal";
import { BlockedAuthorList } from "@/components/blocked-author-list";
import { WithdrawalConfirmModal } from "@/components/withdrawal-confirm-modal";
import { SocialIcon } from "@/components/social-icon";
import { useModalNavigation } from "@/hooks/use-modal-navigation";
import { authApi } from "@/lib/api/auth-api";
import { resolveApiUrl } from "@/lib/api/config";
import { memberApi } from "@/lib/api/member-api";
import { SERVICE_CONTACT_EMAIL } from "@/lib/constants";
import { socialProviderLabel, webSocialProviders } from "@/lib/social-providers";
import { getTextLength, truncateText } from "@/lib/text";
import type { SocialProvider } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useLegalModalStore, type LegalDocumentType } from "@/store/legal-modal-store";
import { useToastStore } from "@/store/toast-store";

export type UserPanelView = "MAIN" | "ACCOUNT" | "BLOCKS" | "FEEDBACK";

export function UserPanel({
  open,
  onClose,
  initialView = "MAIN",
}: {
  open: boolean;
  onClose: () => void;
  initialView?: UserPanelView;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.logout);
  const showToast = useToastStore((state) => state.showToast);
  const openLegalDocument = useLegalModalStore((state) => state.openLegalDocument);
  const [view, setView] = useState<UserPanelView>(initialView);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isNameEditOpen, setIsNameEditOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState<SocialProvider | null>(null);
  const socialNavigationRequestRef = useRef(0);
  const isOpenRef = useRef(open);
  const member = user.type === "MEMBER" ? user : null;
  const closePanelState = () => {
    socialNavigationRequestRef.current += 1;
    setView("MAIN");
    setIsWithdrawalOpen(false);
    setIsNameEditOpen(false);
    setCheckingProvider(null);
    onClose();
  };
  const closePanel = useModalNavigation({
    open,
    onBack: () => {
      if (isSubmittingFeedback || isWithdrawing) return;
      if (view !== "MAIN") {
        setView("MAIN");
        return;
      }
      closePanelState();
    },
    onDismiss: closePanelState,
  });
  const account = useQuery({
    queryKey: ["members", "me"],
    queryFn: memberApi.getMe,
    enabled: open && Boolean(member),
    retry: false,
  });

  useEffect(() => {
    isOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    const resetSocialNavigationState = () => setCheckingProvider(null);
    const resetWhenVisible = () => {
      if (document.visibilityState === "visible") resetSocialNavigationState();
    };

    window.addEventListener("pageshow", resetSocialNavigationState);
    window.addEventListener("focus", resetSocialNavigationState);
    window.addEventListener("popstate", resetSocialNavigationState);
    document.addEventListener("visibilitychange", resetWhenVisible);
    return () => {
      window.removeEventListener("pageshow", resetSocialNavigationState);
      window.removeEventListener("focus", resetSocialNavigationState);
      window.removeEventListener("popstate", resetSocialNavigationState);
      document.removeEventListener("visibilitychange", resetWhenVisible);
    };
  }, []);

  if (!open) return null;

  const navigateToSocialAuth = (url: string, requestId: number) => {
    if (!isOpenRef.current || socialNavigationRequestRef.current !== requestId) return;
    flushSync(() => setCheckingProvider(null));
    closePanel(() => window.location.assign(url));
  };

  const openServerLogin = async (provider: SocialProvider) => {
    const requestId = ++socialNavigationRequestRef.current;
    setCheckingProvider(provider);
    try {
      await authApi.checkHealth();
      navigateToSocialAuth(authApi.getLoginUrl(provider), requestId);
    } catch {
      if (socialNavigationRequestRef.current !== requestId) return;
      setCheckingProvider(null);
      showToast("로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.", "ERROR");
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      showToast("로그아웃했어요.", "INFO");
      closePanel(() => {
        queryClient.clear();
        clearUser();
        router.replace("/");
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "로그아웃하지 못했어요.", "ERROR");
    }
  };

  const openPolicy = (document: LegalDocumentType) => {
    openLegalDocument(document, "SETTINGS");
  };

  const submitFeedback = async () => {
    const content = feedback.trim();
    if (!content || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      await memberApi.submitFeedback(content);
      setFeedback("");
      setView("MAIN");
      showToast("소중한 의견을 전달했어요.", "SUCCESS");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "피드백을 전달하지 못했어요.", "ERROR");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSocialToggle = async (provider: SocialProvider) => {
    const memberAccount = account.data;
    if (!memberAccount) return;
    const requestId = ++socialNavigationRequestRef.current;
    const linked = memberAccount.connectedProviders.includes(provider);
    if (linked && memberAccount.connectedProviders.length === 1) {
      showToast("로그인 수단을 하나 이상 유지해야 해요. 다른 소셜 계정을 연동한 뒤 해제해 주세요.", "INFO");
      return;
    }
    setCheckingProvider(provider);
    try {
      if (linked) {
        await memberApi.disconnectSocialAccount(provider);
        await queryClient.invalidateQueries({ queryKey: ["members", "me"] });
        showToast(`${socialProviderLabel[provider]} 계정 연동을 해제했어요.`, "SUCCESS");
      } else {
        const { authorizationUrl } = await authApi.linkSocial(provider);
        navigateToSocialAuth(resolveApiUrl(authorizationUrl), requestId);
      }
    } catch (error) {
      if (socialNavigationRequestRef.current !== requestId) return;
      showToast(error instanceof Error ? error.message : `소셜 계정 ${linked ? "연동을 해제" : "연동을 시작"}하지 못했어요.`, "ERROR");
    } finally {
      if (socialNavigationRequestRef.current === requestId) setCheckingProvider(null);
    }
  };

  const handleNameSave = async (name: string) => {
    try {
      const updatedAccount = await memberApi.updateName(name);
      queryClient.setQueryData(["members", "me"], updatedAccount);
      setIsNameEditOpen(false);
      showToast("이름을 변경했어요.", "SUCCESS");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "이름을 변경하지 못했어요.", "ERROR");
      throw error;
    }
  };

  const handleWithdrawal = async () => {
    if (isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      await authApi.withdraw();
      showToast("회원 탈퇴가 완료됐어요.", "SUCCESS");
      closePanel(() => {
        queryClient.clear();
        clearUser();
        router.replace("/");
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "회원 탈퇴를 완료하지 못했어요.", "ERROR");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const isAccountView = Boolean(member && view === "ACCOUNT");
  const isBlocksView = view === "BLOCKS";
  const isFeedbackView = view === "FEEDBACK";
  const isSubView = isAccountView || isBlocksView || isFeedbackView;
  const memberAccount = account.data;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#173144]/30 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="user-panel-title">
      <div className="mb-4 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[380px] overflow-y-auto rounded-[24px] bg-[#eef9ff] p-5 pb-6 shadow-2xl sm:mb-0">
        <div className="mb-4 grid grid-cols-[42px_1fr_42px] items-center">
          {isSubView ? <button type="button" onClick={() => setView("MAIN")} className="header-back-button" aria-label="설정으로 돌아가기"><ArrowLeft size={18} /></button> : <span />}
          <h2 id="user-panel-title" className="text-center text-xl font-extrabold">{isAccountView ? "계정 정보" : isBlocksView ? "차단 목록" : isFeedbackView ? "서비스 피드백" : member ? "설정" : "로그인"}</h2>
          <button type="button" onClick={() => closePanel()} className="icon-button" aria-label="닫기"><X size={20} /></button>
        </div>

        {isAccountView ? (
          <div className="space-y-2.5">
            <section className="overflow-hidden rounded-[20px] border-2 border-[#d2e3ec]">
              {account.isLoading ? <div className="space-y-4 p-4"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-10 rounded-xl" /></div> : <>
                <div className="flex items-center gap-3 border-b-2 border-[#d2e3ec] px-4 py-4">
                  <UserRound size={18} className="shrink-0 text-[#718594]" />
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#718594]">이름</p><p className="mt-1 truncate text-sm font-extrabold">{memberAccount?.name || "정보 없음"}</p></div>
                  <button type="button" onClick={() => setIsNameEditOpen(true)} className="flex w-fit shrink-0 items-center gap-1 text-[11px] font-extrabold text-[#526a7a] transition-colors hover:text-[#238fc9]"><Pencil size={13} /> 수정</button>
                </div>
                <div className="flex items-center gap-3 px-4 py-4">
                  <Mail size={18} className="shrink-0 text-[#718594]" />
                  <div className="min-w-0"><p className="text-xs font-bold text-[#718594]">이메일</p><p className="mt-1 truncate text-sm font-extrabold">{memberAccount?.email || "정보 없음"}</p></div>
                </div>
              </>}
            </section>

            <div className="overflow-hidden rounded-[20px] border-2 border-[#d2e3ec]">
              <div className="flex items-center gap-2 border-b-2 border-[#d2e3ec] px-4 py-3 text-sm font-extrabold"><Link2 size={17} className="text-[#718594]" /> 소셜 연동</div>
              {webSocialProviders.map((provider, index) => {
                const isCurrent = memberAccount?.currentProvider === provider;
                const isLinked = memberAccount?.connectedProviders.includes(provider) ?? false;
                const isLastLinked = isLinked && memberAccount?.connectedProviders.length === 1;
                return <div key={provider} className={`flex items-center gap-3 px-4 py-3 ${index < webSocialProviders.length - 1 ? "border-b-2 border-[#d2e3ec]" : ""}`}>
                  <SocialIcon provider={provider} />
                  <div><p className="text-sm font-extrabold">{socialProviderLabel[provider]}</p><p className={`mt-0.5 text-[11px] font-extrabold ${isCurrent ? "text-[#238fc9]" : "text-[#718594]"}`}>{isCurrent ? "현재 로그인" : isLinked ? "연동됨" : "연동 안 됨"}</p></div>
                  <button type="button" role="switch" disabled={!memberAccount || checkingProvider !== null} aria-checked={isLinked} aria-label={isLastLinked ? `${socialProviderLabel[provider]} 계정은 유일한 로그인 수단이라 연동을 해제할 수 없음` : `${socialProviderLabel[provider]} 계정 연동`} onClick={() => void handleSocialToggle(provider)} className={`ml-auto flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${isLinked ? "bg-[#45ace4]" : "bg-[#cbd6dc]"} disabled:cursor-wait disabled:opacity-60`}><span className={`size-6 rounded-full bg-white shadow-sm transition-transform ${isLinked ? "translate-x-5" : "translate-x-0"}`} /></button>
                </div>;
              })}
            </div>

            <button type="button" onClick={() => setIsWithdrawalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-[#c95e5e]"><Trash2 size={17} /> 회원 탈퇴</button>
          </div>
        ) : isBlocksView ? (
          <BlockedAuthorList />
        ) : isFeedbackView ? (
          <div>
            <div className="rounded-[20px] border-2 border-[#d2e3ec] p-4">
              <div className="flex items-center justify-between"><label htmlFor="service-feedback" className="text-sm font-extrabold">서비스에 대한 의견</label><span className="text-xs font-bold text-[#8ba0ae]">{getTextLength(feedback)}/1000</span></div>
              <textarea id="service-feedback" value={feedback} maxLength={1000} onChange={(event) => setFeedback(truncateText(event.target.value, 1000))} placeholder="불편했던 점이나 바라는 점을 남겨주세요." className="mt-3 min-h-36 w-full resize-none rounded-2xl border-2 border-[#d2e3ec] bg-transparent p-3.5 text-sm font-semibold leading-6 outline-none transition placeholder:text-[#9aabb5] focus:border-[#45ace4]" />
              <p className="mt-3 text-center text-[11px] font-semibold text-[#718594]">이메일 문의 <a href={`mailto:${SERVICE_CONTACT_EMAIL}`} className="ml-1 font-bold text-[#238fc9] hover:underline">{SERVICE_CONTACT_EMAIL}</a></p>
            </div>
            <button type="button" disabled={!feedback.trim() || isSubmittingFeedback} onClick={() => void submitFeedback()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]"><Send size={17} /> {isSubmittingFeedback ? "제출하는 중…" : "제출하기"}</button>
          </div>
        ) : member ? <>
          <div className="overflow-hidden rounded-[20px] border-2 border-[#d2e3ec]">
            <button type="button" onClick={() => setView("ACCOUNT")} className="flex w-full items-center gap-3 border-b-2 border-[#d2e3ec] px-4 py-4 text-left text-sm font-extrabold"><UserRound size={18} className="text-[#718594]" /> 계정 정보 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => setView("BLOCKS")} className="flex w-full items-center gap-3 border-b-2 border-[#d2e3ec] px-4 py-4 text-left text-sm font-extrabold"><Ban size={18} className="text-[#718594]" /> 차단 목록 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => setView("FEEDBACK")} className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-extrabold"><MessageSquareText size={18} className="text-[#718594]" /> 서비스 피드백 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
          </div>
          <div className="mt-3 overflow-hidden rounded-[20px] border-2 border-[#d2e3ec]">
            <button type="button" onClick={() => openPolicy("PRIVACY")} className="flex w-full items-center gap-3 border-b-2 border-[#d2e3ec] px-4 py-4 text-left text-sm font-extrabold"><ShieldCheck size={18} className="text-[#718594]" /> 개인정보처리방침 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => openPolicy("TERMS")} className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-extrabold"><FileText size={18} className="text-[#718594]" /> 서비스 이용약관 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
          </div>
          <button type="button" onClick={() => void handleLogout()} className="mt-3 flex w-full items-center gap-3 rounded-[20px] border-2 border-[#d2e3ec] px-4 py-4 text-left text-sm font-extrabold"><LogOut size={18} className="text-[#718594]" /> 로그아웃</button>
          <p className="mt-4 text-center text-[10px] font-medium text-[#8ba0ae]">© 2026 날씨로그. All rights reserved.</p>
        </> : <>
          <div className="flex items-center justify-center gap-3.5 py-2">
            {webSocialProviders.map((provider) => (
              <button key={provider} type="button" disabled={checkingProvider !== null} onClick={() => void openServerLogin(provider)} className="flex size-11 items-center justify-center rounded-full shadow-sm transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" aria-label={`${socialProviderLabel[provider]} 로그인`}><SocialIcon provider={provider} className="size-11" /></button>
            ))}
          </div>
          <div className="mt-3 overflow-hidden rounded-[20px] border-2 border-[#d2e3ec]">
            <button type="button" onClick={() => setView("FEEDBACK")} className="flex w-full items-center gap-3 border-b-2 border-[#d2e3ec] px-4 py-4 text-left text-sm font-extrabold"><MessageSquareText size={18} className="text-[#718594]" /> 서비스 피드백 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => openPolicy("PRIVACY")} className="flex w-full items-center gap-3 border-b-2 border-[#d2e3ec] px-4 py-4 text-left text-sm font-extrabold"><ShieldCheck size={18} className="text-[#718594]" /> 개인정보처리방침 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
            <button type="button" onClick={() => openPolicy("TERMS")} className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-extrabold"><FileText size={18} className="text-[#718594]" /> 서비스 이용약관 <ChevronRight size={17} className="ml-auto text-[#9aabb5]" /></button>
          </div>
          <p className="mt-4 text-center text-[10px] font-medium text-[#8ba0ae]">© 2026 날씨로그. All rights reserved.</p>
        </>}
      </div>
      {member && isNameEditOpen && <NameEditModal currentName={memberAccount?.name ?? ""} onClose={() => setIsNameEditOpen(false)} onSave={handleNameSave} />}
      {member && isWithdrawalOpen && <WithdrawalConfirmModal isSubmitting={isWithdrawing} onClose={() => setIsWithdrawalOpen(false)} onConfirm={() => void handleWithdrawal()} />}
    </div>
  );
}
