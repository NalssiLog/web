"use client";

import { UserRound, X } from "lucide-react";

export function ProfilePreviewModal({ avatarUrl, onClose }: { avatarUrl?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#173144]/40 p-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="프로필 사진 크게 보기" onClick={onClose}>
      <div className="relative w-full max-w-[330px] rounded-[28px] bg-[#eef9ff] px-6 pb-8 pt-14 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="icon-button absolute right-4 top-4" aria-label="닫기"><X size={19} /></button>
        <span
          className="mx-auto flex size-52 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
        >
          {!avatarUrl && <UserRound size={76} />}
        </span>
      </div>
    </div>
  );
}
