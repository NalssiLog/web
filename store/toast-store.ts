"use client";

import { create } from "zustand";

export type ToastTone = "SUCCESS" | "ERROR" | "INFO";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

let nextToastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, tone = "INFO") =>
    set((state) => ({
      toasts: [...state.toasts, { id: ++nextToastId, message, tone }].slice(-3),
    })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
