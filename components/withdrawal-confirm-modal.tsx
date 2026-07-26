"use client";

import { AlertTriangle, X } from "lucide-react";

export function WithdrawalConfirmModal({
  onClose,
  onConfirm,
  isSubmitting = false,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="withdrawal-modal-title">
      <div className="w-full max-w-[340px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h3 id="withdrawal-modal-title" className="text-center text-lg font-extrabold">회원 탈퇴</h3>
          <button type="button" disabled={isSubmitting} onClick={onClose} className="icon-button disabled:opacity-50" aria-label="닫기"><X size={19} /></button>
        </div>
        <div className="mt-5 rounded-[20px] border-2 border-[#d2e3ec] px-5 py-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff0ed] text-[#c95e5e]"><AlertTriangle size={23} /></span>
          <p className="mt-3 text-sm font-extrabold">정말 탈퇴하시겠어요?</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#718594]">회원 정보와 즐겨찾기는 복구할 수 없고,<br />작성한 제보는 익명으로 유지돼요.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" disabled={isSubmitting} onClick={onClose} className="rounded-2xl border-2 border-[#d2e3ec] py-3.5 text-sm font-extrabold text-[#526b7a] disabled:opacity-50">취소</button>
          <button type="button" disabled={isSubmitting} onClick={onConfirm} className="rounded-2xl bg-[#c95e5e] py-3.5 text-sm font-extrabold text-white disabled:opacity-60">{isSubmitting ? "탈퇴하는 중…" : "탈퇴하기"}</button>
        </div>
      </div>
    </div>
  );
}
