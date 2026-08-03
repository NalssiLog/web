"use client";

import { Ban, LoaderCircle, X } from "lucide-react";
import { useModalNavigation } from "@/hooks/use-modal-navigation";

export function AuthorBlockConfirmModal({
  isSubmitting,
  onClose,
  onConfirm,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const closeModal = useModalNavigation({
    open: true,
    onBack: () => {
      if (!isSubmitting) onClose();
    },
    onDismiss: onClose,
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="author-block-title">
      <section className="w-full max-w-[340px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h2 id="author-block-title" className="text-center text-lg font-extrabold">작성자 차단</h2>
          <button type="button" disabled={isSubmitting} onClick={() => closeModal()} className="icon-button disabled:opacity-50" aria-label="차단 닫기"><X size={19} /></button>
        </header>
        <div className="mt-5 rounded-[20px] border-2 border-[#d2e3ec] px-5 py-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#e7f6ff] text-[#268fc7]"><Ban size={22} /></span>
          <p className="mt-3 text-sm font-extrabold">이 작성자를 차단하시겠어요?</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#718594]">이 작성자의 제보가 목록과 상세 화면에서 보이지 않아요.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" disabled={isSubmitting} onClick={() => closeModal()} className="rounded-2xl border-2 border-[#d2e3ec] py-3.5 text-sm font-extrabold text-[#526b7a] disabled:opacity-50">취소</button>
          <button type="button" disabled={isSubmitting} onClick={onConfirm} className="flex items-center justify-center gap-2 rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white disabled:bg-[#b9d5e4]">{isSubmitting && <LoaderCircle size={16} className="animate-spin" />}{isSubmitting ? "처리 중…" : "차단"}</button>
        </div>
      </section>
    </div>
  );
}
