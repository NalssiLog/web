"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NationwideLiveTicker } from "@/components/nationwide-live-ticker";
import brandIcon from "@/public/brand/날씨로그_아이콘.png";
import { useToastStore } from "@/store/toast-store";

export function AppHeader() {
  const showToast = useToastStore((state) => state.showToast);
  return (
    <header className="safe-top home-header-top sticky top-0 z-30 -mx-5 mb-1 flex items-center justify-between gap-3 border-b-2 border-[#dcecf4] bg-[#eef9ff]/95 pb-2 pl-2.5 pr-5 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link href="/" className="flex size-9 shrink-0" aria-label="날씨로그 홈으로 이동">
          <Image src={brandIcon} alt="" width={36} height={36} priority className="size-full object-contain" />
        </Link>
        <NationwideLiveTicker />
      </div>
      <button
        type="button"
        onClick={() => showToast("알림 기능을 준비하고 있어요.", "INFO")}
        className="header-action-button"
        aria-label="알림 기능 안내"
      >
        <Bell size={18} />
      </button>
    </header>
  );
}
