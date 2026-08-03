import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDown, MapPin, RotateCw, Star } from "lucide-react";
import { useSyncExternalStore } from "react";
import { LocationDetectingIndicator } from "@/components/location-detecting-indicator";

let openedAt = 0;
const openedAtListeners = new Set<() => void>();
const getOpenedAt = () => openedAt;
const getServerOpenedAt = () => 0;
const subscribeToOpenedAt = (listener: () => void) => {
  openedAtListeners.add(listener);
  if (!openedAt) openedAt = Date.now();
  listener();

  return () => {
    openedAtListeners.delete(listener);
    if (openedAtListeners.size === 0) openedAt = 0;
  };
};

export function HomeWeatherControls({
  location,
  isDetecting,
  updatedAt,
  isRefreshing,
  canRefresh,
  isFavorite,
  isFavoriteDisabled,
  onLocationClick,
  onFavoriteToggle,
  onRefresh,
}: {
  location?: string;
  isDetecting: boolean;
  updatedAt: number;
  isRefreshing: boolean;
  canRefresh: boolean;
  isFavorite?: boolean;
  isFavoriteDisabled?: boolean;
  onLocationClick: () => void;
  onFavoriteToggle?: () => void;
  onRefresh: () => void;
}) {
  const browserOpenedAt = useSyncExternalStore(subscribeToOpenedAt, getOpenedAt, getServerOpenedAt);
  const displayUpdatedAt = updatedAt || browserOpenedAt;
  const updatedAtLabel = displayUpdatedAt
    ? `${format(new Date(displayUpdatedAt), "a h:mm", { locale: ko })} 기준`
    : "현재 시각";

  return (
    <section className="mb-1 flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center">
        <button type="button" onClick={onLocationClick} className="group flex min-w-0 items-center gap-2 py-2.5 pr-1 text-left">
          <MapPin size={18} className="shrink-0 text-[#45ace4]" />
          {isDetecting
            ? <LocationDetectingIndicator compact />
            : <span className="min-w-0 truncate text-base font-extrabold">{location || "동네를 선택해 주세요"}</span>}
          <ChevronDown size={16} className="shrink-0 text-[#8ba0ae] transition-transform group-hover:translate-y-0.5" />
        </button>
        {onFavoriteToggle ? (
          <button
            type="button"
            onClick={onFavoriteToggle}
            disabled={isFavoriteDisabled}
            className={`ml-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-wait disabled:opacity-50 ${isFavorite ? "text-[#f0a629]" : "text-[#9aabb5] hover:text-[#f0a629]"}`}
            aria-label={isFavorite ? `${location} 즐겨찾기 해제` : `${location} 즐겨찾기 추가`}
            aria-pressed={isFavorite}
          >
            <Star size={19} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={!canRefresh || isRefreshing}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-2 text-xs font-bold text-[#718594] transition-colors hover:text-[#268fc7] disabled:cursor-wait disabled:opacity-50"
        aria-label={`${updatedAtLabel}, 날씨 통계와 피드 새로고침`}
      >
        <RotateCw size={14} strokeWidth={2.3} className={isRefreshing ? "animate-spin [animation-duration:1.1s]" : ""} />
        <span>{updatedAtLabel}</span>
      </button>
    </section>
  );
}
