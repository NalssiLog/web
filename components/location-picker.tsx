"use client";

import { Check, Flame, LockKeyhole, LocateFixed, MapPin, Search, Star, X } from "lucide-react";
import { FormEvent, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { POPULAR_LOCATIONS, SUPPORTED_LOCATIONS } from "@/lib/constants";
import { truncateText } from "@/lib/text";
import type { Location } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useLocationPreferencesStore } from "@/store/location-preferences-store";

type LocationTab = "SEARCH" | "FAVORITES" | "POPULAR";

interface LocationPickerProps {
  open: boolean;
  current?: string;
  isDetecting: boolean;
  required?: boolean;
  onClose: () => void;
  onDetect: () => Promise<Location | null>;
  onSelect: (location: Location) => void;
}

export function LocationPicker({ open, current, isDetecting, required, onClose, onDetect, onSelect }: LocationPickerProps) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <LocationPickerDialog key={current} current={current} isDetecting={isDetecting} required={required} onClose={onClose} onDetect={onDetect} onSelect={onSelect} />,
    document.body,
  );
}

function LocationPickerDialog({ current, isDetecting, required, onClose, onDetect, onSelect }: Omit<LocationPickerProps, "open">) {
  const [value, setValue] = useState("");
  const currentLocation = SUPPORTED_LOCATIONS.find((location) => location.label === current) ?? (current ? { label: current } : null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(currentLocation);
  const [activeTab, setActiveTab] = useState<LocationTab>("SEARCH");
  const { favorites, toggleFavorite } = useLocationPreferencesStore();
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  const normalizedValue = value.replaceAll(" ", "").toLowerCase();
  const searchResults = normalizedValue
    ? SUPPORTED_LOCATIONS.filter((location) => location.label.replaceAll(" ", "").toLowerCase().includes(normalizedValue)).slice(0, 6)
    : [];
  const exactMatch = SUPPORTED_LOCATIONS.find(
    (location) => location.label.replaceAll(" ", "").toLowerCase() === normalizedValue,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const location = selectedLocation ?? exactMatch;
    if (location) onSelect(location);
  };

  const chooseLocation = (location: Location) => setSelectedLocation(location);
  const isFavorite = (location: Location) => favorites.some((item) => (item.id ?? item.label) === (location.id ?? location.label));
  const detectCandidateLocation = async () => {
    const location = await onDetect();
    if (location) setSelectedLocation(location);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#173144]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="location-title">
      <div className="max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-[#eef9ff] p-6 pb-8 shadow-2xl sm:rounded-[28px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="location-title" className="text-xl font-extrabold">어느 동네 날씨를 볼까요?</h2>
          </div>
          {!required && <button type="button" onClick={onClose} className="icon-button" aria-label="닫기"><X size={20} /></button>}
        </div>
        <div className="mb-5 flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-sm shadow-[#b8d6e6]/20">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef9ff] text-[#45ace4]"><MapPin size={19} /></span>
          <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[#718594]">현재 설정된 위치</p><p className="mt-0.5 truncate text-sm font-extrabold">{isDetecting ? "현재 위치를 찾고 있어요…" : selectedLocation?.label ?? current ?? "아직 설정되지 않았어요"}</p></div>
          <button type="button" onClick={detectCandidateLocation} disabled={isDetecting} className="flex shrink-0 items-center gap-1 rounded-xl bg-[#eef9ff] px-2.5 py-2 text-[11px] font-extrabold text-[#268fc7] disabled:opacity-50" aria-label="GPS로 현재 위치 다시 찾기"><LocateFixed size={14} /> GPS</button>
        </div>
        <form onSubmit={submit}>
          <div className="mb-4 grid grid-cols-3 rounded-2xl bg-[#f1f6f9] p-1">
            <TabButton active={activeTab === "SEARCH"} onClick={() => setActiveTab("SEARCH")} icon={<Search size={14} />} label="검색" />
            <TabButton active={activeTab === "FAVORITES"} onClick={() => setActiveTab("FAVORITES")} icon={<Star size={14} />} label="즐겨찾기" />
            <TabButton active={activeTab === "POPULAR"} onClick={() => setActiveTab("POPULAR")} icon={<Flame size={14} />} label="인기" />
          </div>

          <div className="min-h-56">
            {activeTab === "SEARCH" && <>
              <label htmlFor="location" className="sr-only">동네 검색</label>
              <div className="flex items-center gap-2 rounded-2xl border border-[#dce8ef] bg-white px-4 focus-within:border-[#45ace4] focus-within:ring-3 focus-within:ring-[#45ace4]/10">
                <Search size={19} className="shrink-0 text-[#8ba0ae]" />
                <input id="location" value={value} onChange={(event) => { setValue(truncateText(event.target.value, 30)); setSelectedLocation(null); }} placeholder="구 또는 동 이름을 검색하세요" maxLength={30} autoFocus autoComplete="off" className="h-14 min-w-0 flex-1 border-0 bg-transparent outline-none" />
              </div>
              <div className="mt-2 space-y-1">
                {searchResults.map((location) => <LocationRow key={location.id} location={location} selected={selectedLocation?.id === location.id} favorite={isMember ? isFavorite(location) : undefined} onSelect={chooseLocation} onToggleFavorite={isMember ? toggleFavorite : undefined} />)}
                {value.trim() && searchResults.length === 0 && <p className="px-3 py-8 text-center text-sm font-semibold text-[#8ba0ae]">지원하는 지역을 찾지 못했어요.</p>}
                {!value.trim() && <p className="px-3 py-8 text-center text-sm font-semibold leading-6 text-[#8ba0ae]">찾고 싶은 구 또는 동 이름을 입력해 주세요.</p>}
              </div>
            </>}
            {activeTab === "FAVORITES" && (isMember
              ? <LocationList empty="아직 즐겨찾는 동네가 없어요." locations={favorites} selectedLocation={selectedLocation} onSelect={chooseLocation} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
              : <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-[#fff8e8] px-6 text-center text-[#8d6b27]"><LockKeyhole size={25} /><p className="mt-3 text-sm font-extrabold">회원 전용 기능이에요</p><p className="mt-1 text-xs font-semibold leading-5 text-[#9a8050]">로그인하면 자주 보는 동네를<br />즐겨찾기에 저장할 수 있어요.</p></div>)}
            {activeTab === "POPULAR" && <LocationList locations={POPULAR_LOCATIONS} selectedLocation={selectedLocation} onSelect={chooseLocation} isFavorite={isMember ? isFavorite : undefined} onToggleFavorite={isMember ? toggleFavorite : undefined} />}
          </div>
          <button type="submit" disabled={!selectedLocation && !exactMatch} className="primary-button mt-4">확인</button>
        </form>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-extrabold transition ${active ? "bg-white text-[#268fc7] shadow-sm" : "text-[#718594]"}`}>{icon}{label}</button>;
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
      <span className="flex-1 truncate">{location.label}</span>
      {selected && <Check size={16} strokeWidth={2.5} />}
  </button>{onToggleFavorite && <button type="button" onClick={() => onToggleFavorite(location)} className={`mr-1 flex size-9 items-center justify-center rounded-lg ${favorite ? "text-[#f0a629]" : "text-[#a4b3bd] hover:text-[#f0a629]"}`} aria-label={favorite ? `${location.label} 즐겨찾기 해제` : `${location.label} 즐겨찾기 추가`}><Star size={16} fill={favorite ? "currentColor" : "none"} /></button>}</div>;
}
