"use client";

import { Camera, Images, X } from "lucide-react";
import { createPortal } from "react-dom";

export function PhotoSourceSheet({
  open,
  onClose,
  onSelectGallery,
  onTakePhoto,
}: {
  open: boolean;
  onClose: () => void;
  onSelectGallery: () => void;
  onTakePhoto: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="photo-source-title" onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-[28px] bg-[#eef9ff] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-[28px] sm:pb-6" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto h-1 w-10 rounded-full bg-[#bfd5e0]" aria-hidden="true" />
        <div className="mt-3 grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h2 id="photo-source-title" className="text-center text-lg font-extrabold">사진 추가</h2>
          <button type="button" onClick={onClose} className="icon-button" aria-label="닫기"><X size={19} /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onSelectGallery} className="flex min-h-28 flex-col items-center justify-center rounded-[20px] border-2 border-[#d2e3ec] text-[#386177] transition hover:border-[#9fd4ee]">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#eef9ff] text-[#45ace4]"><Images size={23} /></span>
            <span className="mt-2.5 text-sm font-extrabold">앨범에서 선택</span>
          </button>
          <button type="button" onClick={onTakePhoto} className="flex min-h-28 flex-col items-center justify-center rounded-[20px] border-2 border-[#d2e3ec] text-[#386177] transition hover:border-[#9fd4ee]">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#eef9ff] text-[#45ace4]"><Camera size={23} /></span>
            <span className="mt-2.5 text-sm font-extrabold">사진 촬영</span>
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-2xl border-2 border-[#d2e3ec] py-3.5 text-sm font-extrabold text-[#718594]">취소</button>
      </div>
    </div>,
    document.body,
  );
}
