"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Flame, LockKeyhole, LocateFixed, MapPin, RefreshCw, Search, Star, X } from "lucide-react";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getLocationName } from "@/lib/constants";
import { locationApi } from "@/lib/api/location-api";
import { truncateText } from "@/lib/text";
import type { Location } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

type LocationTab = "SEARCH" | "FAVORITES" | "POPULAR";

interface LocationPickerProps {
  open: boolean;
  current?: Location | null;
  isDetecting: boolean;
  detectionError?: string;
  required?: boolean;
  onClose: () => void;
  onDetect: () => Promise<Location | null>;
  onSelect: (location: Location) => void;
}

export function LocationPicker({ open, current, isDetecting, detectionError, required, onClose, onDetect, onSelect }: LocationPickerProps) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <LocationPickerDialog key={current?.id ?? current?.label} current={current} isDetecting={isDetecting} detectionError={detectionError} required={required} onClose={onClose} onDetect={onDetect} onSelect={onSelect} />,
    document.body,
  );
}

function LocationPickerDialog({ current, isDetecting, detectionError, required, onClose, onDetect, onSelect }: Omit<LocationPickerProps, "open">) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(current ?? null);
  const [activeTab, setActiveTab] = useState<LocationTab>("SEARCH");
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  const normalizedValue = debouncedValue.replaceAll(" ", "").toLowerCase();
  const serverSearch = useQuery({
    queryKey: ["locations", "search", debouncedValue],
    queryFn: () => locationApi.search(debouncedValue),
    enabled: Boolean(debouncedValue.trim()),
    staleTime: 60_000,
    retry: false,
  });
  const serverPopular = useQuery({
    queryKey: ["locations", "popular"],
    queryFn: locationApi.popular,
    staleTime: 60_000,
    retry: false,
  });
  const serverFavorites = useQuery({
    queryKey: ["locations", "favorites"],
    queryFn: locationApi.favorites,
    enabled: isMember,
    retry: false,
  });
  const favorites = serverFavorites.data ?? [];
  const popularLocations = serverPopular.data ?? [];
  const searchResults = serverSearch.data ?? [];
  const exactMatch = searchResults.find(
    (location) => [location.label, location.shortName, location.fullName]
      .filter((name): name is string => Boolean(name))
      .some((name) => name.replaceAll(" ", "").toLowerCase() === normalizedValue),
  );
  const favoriteMutation = useMutation({
    mutationFn: async (location: Location) => {
      if (!location.id) return;
      const favorite = favorites.some((item) => (item.id ?? item.label) === (location.id ?? location.label));
      if (favorite) await locationApi.removeFavorite(location.id);
      else await locationApi.addFavorite(location.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations", "favorites"] }),
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [value]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const location = selectedLocation ?? exactMatch;
    if (location) onSelect(location);
  };

  const chooseLocation = (location: Location) => onSelect(location);
  const isFavorite = (location: Location) => favorites.some((item) => (item.id ?? item.label) === (location.id ?? location.label));
  const toggleFavorite = (location: Location) => {
    favoriteMutation.mutate(location);
  };
  const detectCandidateLocation = async () => {
    const location = await onDetect();
    if (location) setSelectedLocation(location);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#173144]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="location-title">
      <div className="max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-[#eef9ff] p-6 pb-8 shadow-2xl sm:rounded-[28px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="location-title" className="text-xl font-extrabold">어느 동네 날씨를 볼까요?</h2>
          </div>
          {!required && <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl border-2 border-[#d2e3ec]" aria-label="닫기"><X size={18} /></button>}
        </div>
        <div className="mb-5 flex items-center gap-3 rounded-[18px] border-2 border-[#d2e3ec] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef9ff] text-[#45ace4]"><MapPin size={19} /></span>
          <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[#718594]">현재 설정된 위치</p>{isDetecting ? <div className="skeleton mt-1.5 h-4 w-44 max-w-full rounded" aria-label="현재 위치 불러오는 중" /> : <p className="mt-0.5 break-keep text-sm font-extrabold leading-5">{selectedLocation ? getLocationName(selectedLocation, "full") : current ? getLocationName(current, "full") : "아직 설정되지 않았어요"}</p>}</div>
          <button type="button" onClick={detectCandidateLocation} disabled={isDetecting} className="flex shrink-0 items-center gap-1 rounded-xl bg-[#eef9ff] px-2.5 py-2 text-[11px] font-extrabold text-[#268fc7] disabled:opacity-50" aria-label="GPS로 현재 위치 다시 찾기"><LocateFixed size={14} /> GPS</button>
        </div>
        {detectionError && <p className="-mt-3 mb-5 flex items-start gap-1.5 px-1 text-xs font-bold leading-5 text-[#b36b54]"><AlertCircle size={14} className="mt-0.5 shrink-0" />{detectionError}</p>}
        <form onSubmit={submit}>
          <div className="mb-4 grid grid-cols-3 rounded-2xl bg-[#f1f6f9] p-1">
            <TabButton active={activeTab === "SEARCH"} onClick={() => setActiveTab("SEARCH")} icon={<Search size={14} />} label="검색" />
            <TabButton active={activeTab === "FAVORITES"} onClick={() => setActiveTab("FAVORITES")} icon={<Star size={14} />} label="즐겨찾기" />
            <TabButton active={activeTab === "POPULAR"} onClick={() => setActiveTab("POPULAR")} icon={<Flame size={14} />} label="인기" />
          </div>

          <div className="min-h-44">
            {activeTab === "SEARCH" && <>
              <label htmlFor="location" className="sr-only">동네 검색</label>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-[#d2e3ec] px-4 focus-within:border-[#45ace4] focus-within:ring-3 focus-within:ring-[#45ace4]/10">
                <Search size={19} className="shrink-0 text-[#8ba0ae]" />
                <input id="location" value={value} onChange={(event) => { setValue(truncateText(event.target.value, 30)); setSelectedLocation(null); }} placeholder="시·구 또는 동 이름을 검색하세요" maxLength={30} autoComplete="off" className="h-14 min-w-0 flex-1 border-0 bg-transparent outline-none" />
              </div>
              <div className="mt-2 space-y-1">
                {!serverSearch.isError && searchResults.map((location) => <LocationRow key={location.id} location={location} selected={selectedLocation?.id === location.id} favorite={isMember ? isFavorite(location) : undefined} onSelect={chooseLocation} onToggleFavorite={isMember ? toggleFavorite : undefined} />)}
                {serverSearch.isFetching && <div className="space-y-2 px-3 py-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-10 rounded-xl" />)}</div>}
                {serverSearch.isError && <LocationLoadError onRetry={() => serverSearch.refetch()} />}
                {value.trim() && !serverSearch.isFetching && !serverSearch.isError && searchResults.length === 0 && <p className="px-3 py-8 text-center text-sm font-semibold text-[#8ba0ae]">지원하는 지역을 찾지 못했어요.</p>}
                {!value.trim() && <p className="px-3 py-8 text-center text-sm font-semibold leading-6 text-[#8ba0ae]">찾고 싶은 시·구 또는 동 이름을 입력해 주세요.</p>}
              </div>
            </>}
            {activeTab === "FAVORITES" && (isMember
              ? serverFavorites.isError
                ? <LocationLoadError onRetry={() => serverFavorites.refetch()} />
                : <LocationList empty="아직 즐겨찾는 동네가 없어요." locations={favorites} selectedLocation={selectedLocation} onSelect={chooseLocation} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
              : <div className="flex min-h-44 -translate-y-2 flex-col items-center justify-center px-6 text-center text-[#8d6b27]"><LockKeyhole size={25} /><p className="mt-3 text-sm font-extrabold">회원 전용 기능이에요</p><p className="mt-1 text-xs font-semibold leading-5 text-[#9a8050]">로그인하면 자주 보는 동네를<br />즐겨찾기에 저장할 수 있어요.</p></div>)}
            {activeTab === "POPULAR" && (serverPopular.isError
              ? <LocationLoadError onRetry={() => serverPopular.refetch()} />
              : serverPopular.isFetching
              ? <div className="space-y-2 px-3 py-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-10 rounded-xl" />)}</div>
              : <LocationList empty="아직 인기 동네가 없어요." locations={popularLocations} selectedLocation={selectedLocation} onSelect={chooseLocation} isFavorite={isMember ? isFavorite : undefined} onToggleFavorite={isMember ? toggleFavorite : undefined} />)}
          </div>
          <button type="submit" disabled={!selectedLocation && !exactMatch} className="primary-button mt-4">확인</button>
        </form>
      </div>
    </div>
  );
}

function LocationLoadError({ onRetry }: { onRetry: () => void }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-[#e8d8d2] px-5 text-center"><AlertCircle size={21} className="text-[#c57a62]" /><p className="mt-2 text-sm font-extrabold">동네 정보를 불러오지 못했어요.</p><button type="button" onClick={onRetry} className="mt-3 flex items-center gap-1.5 rounded-xl border-2 border-[#d2e3ec] px-3.5 py-2.5 text-xs font-extrabold text-[#526a7a]"><RefreshCw size={14} /> 다시 시도</button></div>;
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-extrabold transition ${active ? "border-[#9fd4ee] text-[#268fc7]" : "border-transparent text-[#718594]"}`}>{icon}{label}</button>;
}

function LocationList({ empty, locations, selectedLocation, onSelect, isFavorite, onToggleFavorite }: {
  empty?: string;
  locations: ReadonlyArray<Location>;
  selectedLocation: Location | null;
  onSelect: (location: Location) => void;
  isFavorite?: (location: Location) => boolean;
  onToggleFavorite?: (location: Location) => void;
}) {
  return locations.length === 0 ? <p className="px-3 py-12 text-center text-sm font-semibold text-[#8ba0ae]">{empty}</p> : <div className="space-y-1">{locations.map((location) => <LocationRow key={location.id ?? location.label} location={location} selected={(selectedLocation?.id ?? selectedLocation?.label) === (location.id ?? location.label)} favorite={isFavorite?.(location)} onSelect={onSelect} onToggleFavorite={onToggleFavorite} />)}</div>;
}

function LocationRow({ location, selected, favorite, onSelect, onToggleFavorite }: { location: Location; selected: boolean; favorite?: boolean; onSelect: (location: Location) => void; onToggleFavorite?: (location: Location) => void }) {
  return <div className={`flex items-center rounded-xl transition ${selected ? "bg-[#eaf7ff] text-[#268fc7]" : "hover:bg-[#f5f9fb]"}`}><button type="button" onClick={() => onSelect(location)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left text-sm font-bold">
      <MapPin size={16} className={selected ? "text-[#45ace4]" : "text-[#8ba0ae]"} />
      <span className="flex-1 break-keep leading-5">{getLocationName(location, "full")}</span>
      {selected && <Check size={16} strokeWidth={2.5} />}
  </button>{onToggleFavorite && <button type="button" onClick={() => onToggleFavorite(location)} className={`mr-1 flex size-9 items-center justify-center rounded-lg ${favorite ? "text-[#f0a629]" : "text-[#a4b3bd] hover:text-[#f0a629]"}`} aria-label={favorite ? `${location.label} 즐겨찾기 해제` : `${location.label} 즐겨찾기 추가`}><Star size={18} fill={favorite ? "currentColor" : "none"} /></button>}</div>;
}
