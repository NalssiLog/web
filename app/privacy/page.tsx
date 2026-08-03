import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/components/legal-content";
import { LegalDocument } from "@/components/legal-document";
import { CURRENT_PRIVACY_TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="개인정보처리방침"
      version={CURRENT_PRIVACY_TERMS_VERSION}
      effectiveDate="2026년 7월 21일"
    >
      <PrivacyPolicyContent />
    </LegalDocument>
  );
}
