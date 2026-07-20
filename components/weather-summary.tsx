import { CloudRain, RotateCw, Sun, Thermometer } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { ReactNode } from "react";
import { PRECIPITATION_OPTIONS, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, statusLabel } from "@/lib/constants";
import type { WeatherSummary as Summary } from "@/lib/types";

export function WeatherSummary({ summary, updatedAt, isRefreshing, onRefresh }: { summary: Summary; updatedAt: number; isRefreshing: boolean; onRefresh: () => void }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-0.5">
        <p className="text-xs font-bold text-[#718594]">{format(new Date(updatedAt), "a h:mm", { locale: ko })} 기준</p>
        <button type="button" onClick={onRefresh} disabled={isRefreshing} className="flex size-5 items-center justify-center rounded-full text-[#718594] transition hover:text-[#268fc7] disabled:cursor-wait disabled:opacity-50" aria-label="날씨 통계와 피드 새로고침">
          <RotateCw size={14} strokeWidth={2.3} className={isRefreshing ? "animate-spin [animation-duration:2.4s]" : ""} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SummaryItem icon={<Thermometer size={21} />} label="체감온도" value={statusLabel(TEMPERATURE_OPTIONS, summary.temperature)} tone={temperatureTone[summary.temperature]} />
        <SummaryItem icon={<CloudRain size={21} />} label="강수" value={statusLabel(PRECIPITATION_OPTIONS, summary.precipitation)} tone={precipitationTone[summary.precipitation]} />
        <SummaryItem icon={<Sun size={21} />} label="햇빛" value={statusLabel(SUNLIGHT_OPTIONS, summary.sunlight)} tone={sunlightTone[summary.sunlight]} />
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

function SummaryItem({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center rounded-[18px] bg-white px-2 text-center shadow-sm shadow-[#b8d6e6]/20">
      <span className="mb-1 text-[#45ace4]" aria-hidden="true">{icon}</span>
      <span className="text-[13px] font-extrabold text-[#386177]">{label}</span>
      <span className={`mt-1 max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tone}`}>{value}</span>
    </div>
  );
}
