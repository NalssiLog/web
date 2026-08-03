import type { AgreedTerm } from "@/lib/types";

export const CURRENT_SERVICE_TERMS_VERSION = "1.0";
export const CURRENT_PRIVACY_TERMS_VERSION = "1.0";

export function createRequiredReportAgreements(): AgreedTerm[] {
  return [
    { type: "SERVICE", version: CURRENT_SERVICE_TERMS_VERSION },
    { type: "PRIVACY", version: CURRENT_PRIVACY_TERMS_VERSION },
  ];
}
