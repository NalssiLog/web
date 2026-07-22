import { CloudRain, RotateCw, Sun, Thermometer } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { ReactNode } from "react";
import { PRECIPITATION_OPTIONS, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, statusLabel } from "@/lib/constants";
import type { WeatherSummary as Summary } from "@/lib/types";

export function WeatherSummary({ summary, updatedAt, isRefreshing, onRefresh }: { summary: Summary; updatedAt: number; isRefreshing: boolean; onRefresh: () => void }) {
  const temperature = summary.temperature;
  const precipitation = summary.precipitation;
  const sunlight = summary.sunlight;
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-0.5">
        <p className="text-xs font-bold text-[#718594]">{format(new Date(updatedAt), "a h:mm", { locale: ko })} 기준</p>
        <button type="button" onClick={onRefresh} disabled={isRefreshing} className="flex size-5 items-center justify-center rounded-full text-[#718594] transition hover:text-[#268fc7] disabled:cursor-wait disabled:opacity-50" aria-label="날씨 통계와 피드 새로고침">
          <RotateCw size={14} strokeWidth={2.3} className={isRefreshing ? "animate-spin [animation-duration:2.4s]" : ""} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SummaryItem icon={<Thermometer size={21} />} label="체감온도" value={temperature ? statusLabel(TEMPERATURE_OPTIONS, temperature) : "제보 없음"} tone={temperature ? temperatureTone[temperature] : emptyTone} />
        <SummaryItem icon={<CloudRain size={21} />} label="강수" value={precipitation ? statusLabel(PRECIPITATION_OPTIONS, precipitation) : "제보 없음"} tone={precipitation ? precipitationTone[precipitation] : emptyTone} />
        <SummaryItem icon={<Sun size={21} />} label="햇빛" value={sunlight ? statusLabel(SUNLIGHT_OPTIONS, sunlight) : "제보 없음"} tone={sunlight ? sunlightTone[sunlight] : emptyTone} />
      </div>
    </section>
  );
}

export function WeatherSummarySkeleton() {
  return (
    <section className="mb-5" aria-busy="true" aria-label="동네 날씨 통계 불러오는 중">
      <div className="mb-2 flex h-5 items-center gap-1">
        <span className="skeleton h-3 w-20 rounded" />
        <span className="skeleton size-4 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex min-h-24 flex-col items-center justify-center rounded-[18px] bg-white px-2 shadow-sm shadow-[#b8d6e6]/20">
            <span className="skeleton size-5 rounded-md" />
            <span className={`skeleton mt-2 h-3.5 rounded ${index === 0 ? "w-14" : "w-10"}`} />
            <span className="skeleton mt-2 h-4 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

const temperatureTone = {
  COLD: "bg-[#e8f3ff] text-[#397bb5]",
  FRESH: "bg-[#e4f7ee] text-[#318561]",
  HOT: "bg-[#fff0e8] text-[#c86638]",
} as const;

const precipitationTone = {
  NONE: "bg-[#edf3f6] text-[#617887]",
  LIGHT: "bg-[#e5f4ff] text-[#3587bd]",
  HEAVY: "bg-[#e8edff] text-[#536bb2]",
} as const;

const sunlightTone = {
  LOW: "bg-[#edf1f4] text-[#667986]",
  MODERATE: "bg-[#fff7dc] text-[#a8791e]",
  STRONG: "bg-[#fff0d9] text-[#c66d19]",
} as const;

const emptyTone = "bg-[#edf3f6] text-[#718594]";

function SummaryItem({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center rounded-[18px] bg-white px-2 text-center shadow-sm shadow-[#b8d6e6]/20">
      <span className="mb-1 text-[#45ace4]" aria-hidden="true">{icon}</span>
      <span className="text-[13px] font-extrabold text-[#386177]">{label}</span>
      <span className={`mt-1 max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tone}`}>{value}</span>
    </div>
  );
}
