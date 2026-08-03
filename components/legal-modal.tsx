"use client";

import { useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { PrivacyPolicyContent, TermsContent } from "@/components/legal-content";
import { useModalNavigation } from "@/hooks/use-modal-navigation";
import { CURRENT_PRIVACY_TERMS_VERSION, CURRENT_SERVICE_TERMS_VERSION } from "@/lib/legal";
import { useLegalModalStore } from "@/store/legal-modal-store";

export function LegalModal() {
  const document = useLegalModalStore((state) => state.document);
  const origin = useLegalModalStore((state) => state.origin);
  const close = useLegalModalStore((state) => state.closeLegalDocument);
  const closeModal = useModalNavigation({
    open: Boolean(document),
    onBack: close,
  });

  useEffect(() => {
    if (!document) return;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeModal, document]);

  if (!document) return null;
  const isPrivacy = document === "PRIVACY";
  const title = isPrivacy ? "개인정보처리방침" : "서비스 이용약관";
  const version = isPrivacy ? CURRENT_PRIVACY_TERMS_VERSION : CURRENT_SERVICE_TERMS_VERSION;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <section className="flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-[24px] bg-[#eef9ff] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
        <header className="grid shrink-0 grid-cols-[42px_1fr_42px] items-center border-b-2 border-[#dcecf4] px-5 py-4">
          {origin === "SETTINGS" ? <button type="button" autoFocus onClick={() => closeModal()} className="header-back-button" aria-label="설정으로 돌아가기"><ArrowLeft size={18} /></button> : <span />}
          <h2 id="legal-modal-title" className="text-center text-lg font-extrabold">{title}</h2>
          <button type="button" autoFocus={origin !== "SETTINGS"} onClick={() => closeModal()} className="icon-button" aria-label={`${title} 닫기`}><X size={20} /></button>
        </header>
        <div className="overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          <p className="text-xs font-bold text-[#718594]">버전 {version} / 시행일 2026년 7월 21일</p>
          <div className="legal-content mt-5">{isPrivacy ? <PrivacyPolicyContent /> : <TermsContent />}</div>
        </div>
      </section>
    </div>
  );
}
