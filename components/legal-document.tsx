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
      <header className="safe-top grid grid-cols-[42px_1fr_42px] items-center pb-5">
        <Link href="/" className="icon-button" aria-label="홈으로 돌아가기"><ArrowLeft size={21} /></Link>
        <h1 className="text-center text-lg font-extrabold">{title}</h1>
        <span />
      </header>
      <div className="rounded-[22px] bg-white p-5 shadow-sm shadow-[#b8d6e6]/20">
        <p className="text-xs font-bold text-[#718594]">시행일 {effectiveDate}</p>
        <div className="legal-content mt-5">{children}</div>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}
