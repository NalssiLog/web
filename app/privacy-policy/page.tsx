import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { PrivacyPolicyContent } from "@/components/legal-content";

export const metadata: Metadata = { title: "개인정보처리방침 | 너의 날씨는" };

export default function PrivacyPolicyPage() {
  return <LegalDocument title="개인정보처리방침" effectiveDate="2026년 7월 21일"><PrivacyPolicyContent /></LegalDocument>;
}
