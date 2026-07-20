"use client";

import { AlertTriangle, X } from "lucide-react";

export function WithdrawalConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="withdrawal-modal-title">
      <div className="w-full max-w-[340px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h3 id="withdrawal-modal-title" className="text-center text-lg font-extrabold">회원 탈퇴</h3>
          <button type="button" onClick={onClose} className="icon-button" aria-label="닫기"><X size={19} /></button>
        </div>
        <div className="mt-5 rounded-[20px] bg-white px-5 py-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff0ed] text-[#c95e5e]"><AlertTriangle size={23} /></span>
          <p className="mt-3 text-sm font-extrabold">정말 탈퇴하시겠어요?</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#718594]">작성한 제보와 즐겨찾기 등<br />회원 정보는 복구할 수 없어요.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className="rounded-2xl bg-white py-3.5 text-sm font-extrabold text-[#526b7a]">취소</button>
          <button type="button" onClick={onConfirm} className="rounded-2xl bg-[#c95e5e] py-3.5 text-sm font-extrabold text-white">탈퇴하기</button>
        </div>
      </div>
    </div>
  );
}
