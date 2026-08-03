"use client";

import { Ban, Flag, X } from "lucide-react";
import { useModalNavigation } from "@/hooks/use-modal-navigation";

export function ReportActionsModal({
  onBlock,
  onClose,
  onFlag,
}: {
  onBlock?: () => void;
  onClose: () => void;
  onFlag?: () => void;
}) {
  const closeModal = useModalNavigation({
    open: true,
    onBack: onClose,
    onDismiss: onClose,
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="report-actions-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <section className="w-full max-w-[340px] overflow-hidden rounded-[24px] bg-[#eef9ff] shadow-2xl">
        <header className="grid grid-cols-[40px_1fr_40px] items-center px-5 py-4">
          <span />
          <h2 id="report-actions-title" className="text-center text-lg font-extrabold">작업 메뉴</h2>
          <button type="button" onClick={() => closeModal()} className="icon-button" aria-label="작업 메뉴 닫기"><X size={19} /></button>
        </header>
        <div className="border-t-2 border-[#d2e3ec]">
          {onFlag && <button type="button" onClick={() => closeModal(onFlag)} className={`flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-extrabold text-[#c95e5e] ${onBlock ? "border-b-2 border-[#d2e3ec]" : ""}`}><Flag size={18} /> 신고</button>}
          {onBlock && <button type="button" onClick={() => closeModal(onBlock)} className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-extrabold text-[#173144]"><Ban size={18} /> 차단</button>}
        </div>
      </section>
    </div>
  );
}
