import type { WeatherStatus } from "@/lib/types";

export type WeatherStatusTone = "BLUE" | "GREEN" | "ORANGE";

const toneByStatus: Record<WeatherStatus, WeatherStatusTone> = {
  COLD: "BLUE",
  NONE: "BLUE",
  LOW: "BLUE",
  FRESH: "GREEN",
  LIGHT: "GREEN",
  MODERATE: "GREEN",
  HOT: "ORANGE",
  HEAVY: "ORANGE",
  STRONG: "ORANGE",
};

export const weatherStatusToneClasses: Record<WeatherStatusTone, {
  badge: string;
  selected: string;
  detail: string;
}> = {
  BLUE: {
    badge: "bg-[#e8f3ff] text-[#397bb5]",
    selected: "border-[#9fcbea] bg-[#e8f3ff] text-[#397bb5] ring-2 ring-[#72b2e4]/15",
    detail: "border-[#9fcbea] text-[#397bb5]",
  },
  GREEN: {
    badge: "bg-[#e4f7ee] text-[#318561]",
    selected: "border-[#a5d9bf] bg-[#e4f7ee] text-[#318561] ring-2 ring-[#5fb98b]/15",
    detail: "border-[#a5d9bf] text-[#318561]",
  },
  ORANGE: {
    badge: "bg-[#fff0e8] text-[#c86638]",
    selected: "border-[#efbda4] bg-[#fff0e8] text-[#c86638] ring-2 ring-[#df8a5f]/15",
    detail: "border-[#efbda4] text-[#c86638]",
  },
};

export function getWeatherStatusTone(status: WeatherStatus) {
  return weatherStatusToneClasses[toneByStatus[status]];
}
