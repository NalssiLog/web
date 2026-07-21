import { create } from "zustand";

export type LegalDocumentType = "PRIVACY" | "TERMS";
export type LegalModalOrigin = "SETTINGS" | null;

interface LegalModalState {
  document: LegalDocumentType | null;
  origin: LegalModalOrigin;
  openLegalDocument: (document: LegalDocumentType, origin?: Exclude<LegalModalOrigin, null>) => void;
  closeLegalDocument: () => void;
}

export const useLegalModalStore = create<LegalModalState>((set) => ({
  document: null,
  origin: null,
  openLegalDocument: (document, origin) => set({ document, origin: origin ?? null }),
  closeLegalDocument: () => set({ document: null, origin: null }),
}));
