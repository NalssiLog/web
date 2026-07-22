import { RefreshCw } from "lucide-react";

export function ErrorState({ message = "날씨를 불러오지 못했어요.", actionLabel = "다시 시도", onRetry }: { message?: string; actionLabel?: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl bg-[#fff8f6] px-6 text-center">
      <p className="font-extrabold">잠시 구름이 꼈어요</p>
      <p className="mt-1 text-sm text-[#8b7b76]">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-sm"><RefreshCw size={16} /> {actionLabel}</button>}
    </div>
  );
}
