"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useEffect } from "react";
import { useToastStore, type ToastMessage, type ToastTone } from "@/store/toast-store";

const toneStyle: Record<ToastTone, { icon: typeof CircleCheck; className: string }> = {
  SUCCESS: { icon: CircleCheck, className: "text-[#287e59]" },
  ERROR: { icon: CircleAlert, className: "text-[#c95e5e]" },
  INFO: { icon: Info, className: "text-[#268fc7]" },
};

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  return <div className="pointer-events-none fixed left-1/2 top-4 z-[80] flex w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 flex-col items-center gap-2" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)}</div>;
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dismissToast = useToastStore((state) => state.dismissToast);
  const style = toneStyle[toast.tone];
  const Icon = style.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => dismissToast(toast.id), 2_800);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast.id]);

  return <button type="button" onClick={() => dismissToast(toast.id)} className="pointer-events-auto flex w-fit max-w-full animate-[toast-in_.2s_ease-out] items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 text-left text-sm font-extrabold text-[#29495c] shadow-lg shadow-[#52768a]/15 backdrop-blur-sm transition active:scale-[.98]" aria-label={`${toast.message} 알림 닫기`}>
    <Icon size={18} className={style.className} />
    <span className="min-w-0 flex-1">{toast.message}</span>
  </button>;
}
