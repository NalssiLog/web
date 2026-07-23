"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Heart, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DEFAULT_REPORT_IMAGE, TEMPERATURE_OPTIONS, formatThanksCount, getLocationName, statusLabel } from "@/lib/constants";
import type { WeatherReport } from "@/lib/types";

export function ReportCard({ report, compact = false }: { report: WeatherReport; compact?: boolean }) {
  const ago = formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: ko }).replace("약 ", "");
  const compactDate = format(new Date(report.createdAt), "yy.MM.dd");
  const imageSource = report.images[0] ?? DEFAULT_REPORT_IMAGE;
  const unoptimizedImage = /^(https?:|blob:|data:)/.test(imageSource);
  const locationName = getLocationName(report.location, "short");
  return (
    <Link href={`/reports/${report.id}`} className={`group relative aspect-square overflow-hidden bg-[#e8f3f8] ${compact ? "rounded-lg" : "rounded-[22px]"}`}>
      <Image src={imageSource} alt={`${locationName} 날씨 제보`} fill unoptimized={unoptimizedImage} sizes="(max-width: 480px) 50vw, 220px" className="object-cover transition duration-300 group-active:scale-105" />
      {!compact && <>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 text-white">
          <span className="text-base font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,.75)]">{statusLabel(TEMPERATURE_OPTIONS, report.temperature)}</span>
          <span className="shrink-0 text-[13px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.75)]">{ago}</span>
        </div>
        <span className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 text-[13px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" aria-label={`감사해요 수 ${report.thanksCount}`}>
          <Heart size={14} fill={report.isThanked ? "currentColor" : "none"} className="-translate-y-px" /> {formatThanksCount(report.thanksCount)}
        </span>
      </>}
      {compact && <>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#102839]/60 to-transparent" />
        <span className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-16px)] items-center gap-0.5 text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
          <MapPin size={11} className="shrink-0" />
          <span className="break-keep leading-4">{locationName}</span>
        </span>
        <span className="absolute bottom-1.5 left-2 z-20 text-[16px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.5)]">{compactDate}</span>
        <span className="absolute bottom-2 right-2 z-20 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]" aria-label={`감사해요 수 ${report.thanksCount}`}><Heart size={11} fill={report.isThanked ? "currentColor" : "none"} className="-translate-y-px" /> {formatThanksCount(report.thanksCount)}</span>
      </>}
    </Link>
  );
}
