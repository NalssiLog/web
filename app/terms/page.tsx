import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { TermsContent } from "@/components/legal-content";
import { CURRENT_SERVICE_TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "서비스 이용약관",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalDocument title="서비스 이용약관" version={CURRENT_SERVICE_TERMS_VERSION} effectiveDate="2026년 7월 21일"><TermsContent /></LegalDocument>;
}
