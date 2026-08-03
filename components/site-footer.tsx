"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { UserPanel } from "@/components/user-panel";
import { useLegalModalStore } from "@/store/legal-modal-store";

const MAIN_TAB_PATHS = new Set(["/", "/mypage"]);

export function SiteFooter() {
  const pathname = usePathname();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const openLegalDocument = useLegalModalStore((state) => state.openLegalDocument);

  if (pathname === "/reports/new") return null;

  const hasMainTabNavigation = MAIN_TAB_PATHS.has(pathname);

  return (
    <>
      <footer
        id="site-footer"
        className={`border-t-2 border-[#dcecf4] px-5 pt-6 text-center ${
          hasMainTabNavigation
            ? "pb-[calc(76px+env(safe-area-inset-bottom))]"
            : "pb-[max(32px,env(safe-area-inset-bottom))]"
        }`}
      >
        <p className="text-sm font-extrabold text-[#526a7a]">날씨로그</p>
        <nav
          className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#718594]"
          aria-label="서비스 안내"
        >
          <Link
            href="/privacy"
            onClick={(event) => {
              event.preventDefault();
              openLegalDocument("PRIVACY");
            }}
            className="transition-colors hover:text-[#238fc9]"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/terms"
            onClick={(event) => {
              event.preventDefault();
              openLegalDocument("TERMS");
            }}
            className="transition-colors hover:text-[#238fc9]"
          >
            서비스 이용약관
          </Link>
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="transition-colors hover:text-[#238fc9]"
          >
            서비스 피드백
          </button>
        </nav>
        <p className="mt-2 text-[10px] font-medium text-[#8ba0ae]">
          © 2026 날씨로그. All rights reserved.
        </p>
      </footer>

      {isFeedbackOpen ? (
        <UserPanel
          initialView="FEEDBACK"
          open
          onClose={() => setIsFeedbackOpen(false)}
        />
      ) : null}
    </>
  );
}
