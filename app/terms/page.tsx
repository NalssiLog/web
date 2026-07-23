import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { TermsContent } from "@/components/legal-content";

export const metadata: Metadata = {
  title: "서비스 이용약관",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalDocument title="서비스 이용약관" effectiveDate="2026년 7월 21일"><TermsContent /></LegalDocument>;
}
