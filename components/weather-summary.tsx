import { CloudRain, Sun, Thermometer } from "lucide-react";
import type { ReactNode } from "react";
import { PRECIPITATION_OPTIONS, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, statusLabel } from "@/lib/constants";
import type { WeatherSummary as Summary } from "@/lib/types";
import { getWeatherStatusTone } from "@/lib/weather-status-tone";

export function WeatherSummary({ summary }: { summary: Summary }) {
  const temperature = summary.temperature;
  const precipitation = summary.precipitation;
  const sunlight = summary.sunlight;
  return (
    <section className="mb-3">
      <div className="grid grid-cols-3 gap-2">
        <SummaryItem icon={<Thermometer size={17} />} label="체감온도" value={temperature ? statusLabel(TEMPERATURE_OPTIONS, temperature) : "제보 없음"} tone={temperature ? getWeatherStatusTone(temperature).badge : emptyTone} />
        <SummaryItem icon={<CloudRain size={17} />} label="비" value={precipitation ? statusLabel(PRECIPITATION_OPTIONS, precipitation) : "제보 없음"} tone={precipitation ? getWeatherStatusTone(precipitation).badge : emptyTone} />
        <SummaryItem icon={<Sun size={17} />} label="햇빛" value={sunlight ? statusLabel(SUNLIGHT_OPTIONS, sunlight) : "제보 없음"} tone={sunlight ? getWeatherStatusTone(sunlight).badge : emptyTone} />
      </div>
    </section>
  );
}

export function WeatherSummarySkeleton() {
  return (
    <section className="mb-3" aria-busy="true" aria-label="동네 날씨 통계 불러오는 중">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex min-h-14 items-center gap-1 rounded-[18px] border-2 border-[#cfe3ed] px-1.5">
            <span className="skeleton size-6 shrink-0 rounded-lg" />
            <span className="flex min-w-0 flex-1 flex-col items-center">
              <span className={`skeleton block h-3 rounded ${index === 0 ? "w-12" : "w-8"}`} />
              <span className="skeleton mt-1.5 block h-4 w-12 max-w-full rounded-full" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const emptyTone = "bg-[#edf3f6] text-[#718594]";

function SummaryItem({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-14 items-center gap-1 rounded-[18px] border-2 border-[#cfe3ed] px-1.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#eef9ff] text-[#45ace4]" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1 text-center">
        <span className="block truncate text-[11px] font-extrabold text-[#386177]">{label}</span>
        <span className={`mt-1 block max-w-full truncate rounded-full px-1 py-0.5 text-center text-[9px] font-extrabold ${tone}`}>{value}</span>
      </span>
    </div>
  );
}
