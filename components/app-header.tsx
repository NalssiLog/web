"use client";

import { ChevronDown, MapPin, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export function AppHeader({ location, isDetecting, onLocationClick, onUserClick }: { location?: string; isDetecting?: boolean; onLocationClick: () => void; onUserClick: () => void }) {
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  return (
    <header className="safe-top sticky top-0 z-30 -mx-5 mb-5 flex items-center justify-between border-b border-[#dcecf4] bg-[#eef9ff] px-5 pb-3">
      <button type="button" onClick={onLocationClick} className="group flex items-center gap-2 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#45ace4] shadow-sm shadow-[#b8d6e6]/20">
          <MapPin size={19} />
        </span>
        {isDetecting ? <span className="skeleton h-5 w-40 rounded" aria-label="현재 위치 불러오는 중" /> : <span className="flex min-w-0 items-center gap-1 text-[19px] font-extrabold">
          <span className="truncate">{location || "동네를 선택해 주세요"}</span>
          <ChevronDown size={18} className="shrink-0 text-[#8ba0ae] transition group-hover:translate-y-0.5" />
        </span>}
      </button>
      {isMember ? <button type="button" onClick={onUserClick} className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#718594] shadow-sm shadow-[#b8d6e6]/20 transition hover:text-[#268fc7]" aria-label="사용자 메뉴"><UserRound size={23} /></button> : <button type="button" onClick={onUserClick} className="flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-extrabold text-[#268fc7] shadow-sm shadow-[#b8d6e6]/20 transition hover:bg-[#f8fcfe]" aria-label="로그인">로그인</button>}
    </header>
  );
}
