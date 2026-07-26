"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToastStore } from "@/store/toast-store";

export function AppHeader() {
  const showToast = useToastStore((state) => state.showToast);
  return (
    <header className="safe-top sticky top-0 z-30 -mx-5 mb-1 flex items-center justify-between border-b-2 border-[#dcecf4] bg-[#eef9ff]/95 px-5 pb-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/" className="flex size-10 shrink-0" aria-label="날씨로그 홈으로 이동">
          <Image src="/brand/날씨로그_아이콘.png" alt="" width={40} height={40} priority className="size-full object-contain" />
        </Link>
        <button
          type="button"
          onClick={() => showToast("전국 LIVE를 준비하고 있어요.", "INFO")}
          className="flex h-9 min-w-0 items-center gap-2 rounded-xl border-2 border-[#d9eaf3] px-3 text-xs font-extrabold text-[#386177] transition-colors hover:border-[#b9ddea] hover:text-[#238fc9]"
          aria-label="전국 라이브 안내"
        >
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f06f6f] opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-[#e45f5f]" />
          </span>
          <span className="truncate">전국 LIVE</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => showToast("알림 기능을 준비하고 있어요.", "INFO")}
        className="icon-button shrink-0"
        aria-label="알림 기능 안내"
      >
        <Bell size={20} />
      </button>
    </header>
  );
}
