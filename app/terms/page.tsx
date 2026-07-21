import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { TermsContent } from "@/components/legal-content";

export const metadata: Metadata = { title: "서비스 이용약관 | 너의 날씨는" };

export default function TermsPage() {
  return <LegalDocument title="서비스 이용약관" effectiveDate="2026년 7월 21일"><TermsContent /></LegalDocument>;
}
