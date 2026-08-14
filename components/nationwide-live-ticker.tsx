"use client";

import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { weatherApi } from "@/lib/api";
import { getLocationName } from "@/lib/constants";
import type { NationwideLiveItem } from "@/lib/types";
import { useLocationStore } from "@/store/location-store";

const DISPLAY_DURATION_MS = 3_500;
const TRANSITION_DURATION_MS = 280;
const EMPTY_MESSAGE = "전국 속보를 기다리고 있어요";

export const NationwideLiveTicker = memo(function NationwideLiveTicker() {
  const setLocation = useLocationStore((state) => state.setLocation);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const liveFeed = useQuery({
    queryKey: ["nationwide-live"],
    queryFn: () => weatherApi.getNationwideLive(),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const items = liveFeed.data?.items ?? [];
  const itemCount = items.length;
  const normalizedIndex = itemCount > 0 ? currentIndex % itemCount : 0;
  const currentItem = items[normalizedIndex];
  const nextItem = items[itemCount > 0 ? (normalizedIndex + 1) % itemCount : 0];

  useEffect(() => {
    if (itemCount === 0 || isTransitioning) return;

    const timer = window.setTimeout(
      () => setIsTransitioning(true),
      DISPLAY_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [currentIndex, isTransitioning, itemCount]);

  useEffect(() => {
    if (!isTransitioning || itemCount === 0) return;

    const timer = window.setTimeout(() => {
      setCurrentIndex((index) => (index + 1) % itemCount);
      setIsTransitioning(false);
    }, TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isTransitioning, itemCount]);

  const selectCurrentLocation = useCallback(() => {
    if (currentItem) setLocation(currentItem.location);
  }, [currentItem, setLocation]);

  const accessibleLabel = useMemo(
    () => currentItem
      ? `${formatLiveItem(currentItem)} 동네 날씨 보기`
      : EMPTY_MESSAGE,
    [currentItem],
  );

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      disabled={!currentItem}
      onClick={selectCurrentLocation}
      className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] font-extrabold text-[#386177] disabled:cursor-default"
    >
      <span className="relative flex size-1.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f06f6f] opacity-50" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[#e45f5f]" />
      </span>
      {currentItem && nextItem ? (
        <span className="h-[18px] min-w-0 flex-1 overflow-hidden">
          <span
            className={`flex flex-col will-change-transform motion-reduce:transition-none ${isTransitioning ? "-translate-y-[18px] transition-transform duration-[280ms] ease-out" : "translate-y-0"}`}
          >
            <TickerLine item={currentItem} />
            <TickerLine item={nextItem} />
          </span>
        </span>
      ) : (
        <span className="truncate text-[#718594]">{EMPTY_MESSAGE}</span>
      )}
    </button>
  );
});

function TickerLine({ item }: { item: NationwideLiveItem }) {
  return (
    <span className="block h-[18px] min-w-0 shrink-0 truncate leading-[18px]">
      {formatLiveItem(item)}
    </span>
  );
}

function formatLiveItem(item: NationwideLiveItem) {
  return `[${getLocationName(item.location, "short")}] ${item.message}`;
}
