"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ServiceFeedbackModal } from "@/components/service-feedback-modal";
import { useLegalModalStore } from "@/store/legal-modal-store";

export function SiteFooter() {
  const pathname = usePathname();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const openLegalDocument = useLegalModalStore((state) => state.openLegalDocument);
  if (pathname === "/reports/new") return null;

  return (
    <>
      <footer id="site-footer" className="border-t border-[#dcecf4] px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-7 text-center">
        <p className="text-sm font-extrabold text-[#526a7a]">날씨로그</p>
        <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#718594]" aria-label="서비스 안내">
          <Link href="/privacy-policy" onClick={(event) => { event.preventDefault(); openLegalDocument("PRIVACY"); }} className="transition-colors hover:text-[#238fc9]">개인정보처리방침</Link>
          <span className="text-[#bfd0da]" aria-hidden="true">·</span>
          <Link href="/terms" onClick={(event) => { event.preventDefault(); openLegalDocument("TERMS"); }} className="transition-colors hover:text-[#238fc9]">서비스 이용약관</Link>
          <span className="text-[#bfd0da]" aria-hidden="true">·</span>
          <button type="button" onClick={() => setIsFeedbackOpen(true)} className="transition-colors hover:text-[#238fc9]">서비스 피드백</button>
        </nav>
        <p className="mt-2 text-[10px] font-medium text-[#8ba0ae]">© 2026 날씨로그. All rights reserved.</p>
      </footer>
      <ServiceFeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}
