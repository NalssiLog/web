"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useModalNavigation } from "@/hooks/use-modal-navigation";
import { moderationApi } from "@/lib/api/moderation-api";
import { getTextLength, truncateText } from "@/lib/text";
import type { ReportFlagReason } from "@/lib/types";
import { useToastStore } from "@/store/toast-store";

const FLAG_REASONS: ReadonlyArray<{ value: ReportFlagReason; label: string }> = [
  { value: "SPAM", label: "스팸/도배" },
  { value: "ABUSE", label: "욕설/괴롭힘" },
  { value: "HATE", label: "혐오 표현" },
  { value: "SEXUAL", label: "선정적 콘텐츠" },
  { value: "PRIVACY", label: "개인정보 노출" },
  { value: "FALSE_INFORMATION", label: "거짓 정보" },
  { value: "OTHER", label: "기타" },
];

export function ReportFlagModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const showToast = useToastStore((state) => state.showToast);
  const [reason, setReason] = useState<ReportFlagReason | null>(null);
  const [detail, setDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeModal = useModalNavigation({
    open: true,
    onBack: () => {
      if (!isSubmitting) onClose();
    },
    onDismiss: onClose,
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await moderationApi.flagReport(reportId, {
        reason,
        detail: detail.trim() || undefined,
      });
      showToast("제보를 신고했어요.", "SUCCESS");
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "제보를 신고하지 못했어요.", "ERROR");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="report-flag-title">
      <form onSubmit={(event) => void submit(event)} className="flex max-h-[calc(100dvh-32px)] w-full max-w-[380px] flex-col overflow-hidden rounded-[24px] bg-[#eef9ff] shadow-2xl">
        <header className="grid shrink-0 grid-cols-[40px_1fr_40px] items-center px-5 py-4">
          <span />
          <h2 id="report-flag-title" className="text-center text-lg font-extrabold">제보 신고</h2>
          <button type="button" disabled={isSubmitting} onClick={() => closeModal()} className="icon-button disabled:opacity-50" aria-label="신고 닫기"><X size={19} /></button>
        </header>
        <div className="overflow-y-auto border-t-2 border-[#d2e3ec] px-5 py-4">
          <p className="text-sm font-extrabold">신고 사유를 선택해 주세요.</p>
          <div className="mt-3 overflow-hidden rounded-[18px] border-2 border-[#d2e3ec]">
            {FLAG_REASONS.map((option, index) => <label key={option.value} className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm font-bold ${index < FLAG_REASONS.length - 1 ? "border-b-2 border-[#dcecf4]" : ""}`}>
              <input type="radio" name="flag-reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} className="size-4 accent-[#45ace4]" />
              {option.label}
            </label>)}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between"><label htmlFor="flag-detail" className="text-sm font-extrabold">상세 내용 <span className="text-xs font-semibold text-[#718594]">선택</span></label><span className="text-xs font-bold text-[#8ba0ae]">{getTextLength(detail)}/500</span></div>
            <textarea id="flag-detail" value={detail} maxLength={500} onChange={(event) => setDetail(truncateText(event.target.value, 500))} placeholder="필요한 경우 자세한 내용을 적어주세요." className="mt-2 min-h-28 w-full resize-none rounded-[18px] border-2 border-[#d2e3ec] bg-transparent p-3.5 text-sm font-semibold leading-6 outline-none placeholder:text-[#9aabb5] focus:border-[#45ace4]" />
          </div>
        </div>
        <div className="shrink-0 border-t-2 border-[#d2e3ec] p-4">
          <button type="submit" disabled={!reason || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">{isSubmitting && <LoaderCircle size={17} className="animate-spin" />}{isSubmitting ? "신고하는 중…" : "신고"}</button>
        </div>
      </form>
    </div>
  );
}
