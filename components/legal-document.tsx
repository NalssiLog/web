import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocument({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 pb-10">
      <header className="safe-top compact-page-header grid grid-cols-[36px_1fr_36px] items-center pb-2">
        <Link href="/" className="header-back-button" aria-label="홈으로 돌아가기"><ArrowLeft size={18} /></Link>
        <h1 className="text-center text-lg font-extrabold">{title}</h1>
        <span />
      </header>
      <div className="rounded-[22px] border-2 border-[#d2e3ec] p-5">
        <p className="text-xs font-bold text-[#718594]">시행일 {effectiveDate}</p>
        <div className="legal-content mt-5">{children}</div>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}
