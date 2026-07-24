"use client";

import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { memberApi } from "@/lib/api/member-api";
import { SERVICE_CONTACT_EMAIL } from "@/lib/constants";
import { getTextLength, truncateText } from "@/lib/text";
import { useToastStore } from "@/store/toast-store";

export function ServiceFeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSubmitting, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const submit = async () => {
    const content = feedback.trim();
    if (!content || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await memberApi.submitFeedback(content);
      setFeedback("");
      onClose();
      showToast("소중한 의견을 전달했어요.", "SUCCESS");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "피드백을 전달하지 못했어요.", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#173144]/30 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="service-feedback-title" onClick={() => { if (!isSubmitting) onClose(); }}>
      <div className="mb-4 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[380px] overflow-y-auto rounded-[24px] bg-[#eef9ff] p-5 pb-6 shadow-2xl sm:mb-0" onClick={(event) => event.stopPropagation()}>
        <div className="grid grid-cols-[42px_1fr_42px] items-center">
          <span />
          <h2 id="service-feedback-title" className="text-center text-xl font-extrabold">서비스 피드백</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="icon-button disabled:opacity-50" aria-label="닫기"><X size={20} /></button>
        </div>
        <div className="mt-4 rounded-[20px] border border-[#e2ecf2] bg-white p-4">
          <div className="flex items-center justify-between"><label htmlFor="footer-service-feedback" className="text-sm font-extrabold">서비스에 대한 의견</label><span className="text-xs font-bold text-[#8ba0ae]">{getTextLength(feedback)}/1000</span></div>
          <textarea id="footer-service-feedback" value={feedback} maxLength={1000} onChange={(event) => setFeedback(truncateText(event.target.value, 1000))} placeholder="불편했던 점이나 바라는 점을 남겨주세요." className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-[#dce8ee] bg-[#f9fcfe] p-3.5 text-sm font-semibold leading-6 outline-none transition placeholder:text-[#9aabb5] focus:border-[#45ace4]" />
          <p className="mt-3 text-center text-[11px] font-semibold text-[#718594]">이메일 문의 <a href={`mailto:${SERVICE_CONTACT_EMAIL}`} className="ml-1 font-bold text-[#238fc9] hover:underline">{SERVICE_CONTACT_EMAIL}</a></p>
        </div>
        <button type="button" disabled={!feedback.trim() || isSubmitting} onClick={() => void submit()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]"><Send size={17} /> {isSubmitting ? "제출하는 중…" : "제출하기"}</button>
      </div>
    </div>,
    document.body,
  );
}
