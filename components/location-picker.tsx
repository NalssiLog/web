"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertCircle, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Flame, LockKeyhole, LocateFixed, MapPin, RefreshCw, RotateCw, Search, Star, X } from "lucide-react";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LocationDetectingIndicator } from "@/components/location-detecting-indicator";
import { useModalNavigation } from "@/hooks/use-modal-navigation";
import { getLocationName } from "@/lib/constants";
import {
  locationApi,
  type PopularLocationItem,
  type PopularLocationMovement,
} from "@/lib/api/location-api";
import {
  clampLocationPage,
  getLocationPageCount,
  getLocationPageItems,
} from "@/lib/location-pagination";
import { truncateText } from "@/lib/text";
import type { Location } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

type LocationTab = "SEARCH" | "FAVORITES" | "POPULAR";
type LocationPages = Record<LocationTab, number>;
const FAVORITES_QUERY_KEY = ["locations", "favorites"] as const;

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
  const closeModal = useModalNavigation({ open: true, onBack: onClose });
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(current ?? null);
  const [activeTab, setActiveTab] = useState<LocationTab>("SEARCH");
  const [isPopularRefreshAnimating, setIsPopularRefreshAnimating] = useState(false);
  const [pages, setPages] = useState<LocationPages>({
    SEARCH: 1,
    FAVORITES: 1,
    POPULAR: 1,
  });
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  const showToast = useToastStore((state) => state.showToast);
  const normalizedValue = debouncedValue.replaceAll(" ", "").toLowerCase();
  const serverSearch = useQuery({
    queryKey: ["locations", "search", debouncedValue, pages.SEARCH - 1],
    queryFn: () => locationApi.search(debouncedValue, pages.SEARCH - 1),
    enabled: Boolean(debouncedValue.trim()),
    placeholderData: (previousData, previousQuery) => {
      const previousKeyword = previousQuery?.queryKey[2];
      return previousKeyword === debouncedValue ? previousData : undefined;
    },
    staleTime: 60_000,
    retry: false,
  });
  const serverPopular = useQuery({
    queryKey: ["locations", "popular"],
    queryFn: locationApi.popular,
    enabled: activeTab === "POPULAR",
    staleTime: 60_000,
    refetchInterval: activeTab === "POPULAR" ? 30_000 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const serverFavorites = useQuery({
    queryKey: [...FAVORITES_QUERY_KEY, "page", pages.FAVORITES - 1],
    queryFn: () => locationApi.favorites(pages.FAVORITES - 1),
    enabled: isMember,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const serverFavoriteCatalog = useQuery({
    queryKey: [...FAVORITES_QUERY_KEY, "catalog"],
    queryFn: locationApi.favoriteCatalog,
    enabled: isMember,
    staleTime: 60_000,
    retry: 1,
  });
  const favorites = serverFavorites.data?.items ?? [];
  const favoriteCatalog = serverFavoriteCatalog.data ?? [];
  const popularItems = serverPopular.data?.items ?? [];
  const popularLocations = popularItems.map((item) => item.location);
  const searchResults = serverSearch.data?.items ?? [];
  const visiblePages: LocationPages = {
    SEARCH: (serverSearch.data?.page ?? pages.SEARCH - 1) + 1,
    FAVORITES: (serverFavorites.data?.page ?? pages.FAVORITES - 1) + 1,
    POPULAR: clampLocationPage(pages.POPULAR, popularLocations.length),
  };
  const exactMatch = searchResults.find(
    (location) => [location.label, location.shortName, location.fullName]
      .filter((name): name is string => Boolean(name))
      .some((name) => name.replaceAll(" ", "").toLowerCase() === normalizedValue),
  );
  const isFavorite = (location: Location) => [...favoriteCatalog, ...favorites]
    .some((item) => (item.id ?? item.label) === (location.id ?? location.label));
  const favoriteMutation = useMutation({
    mutationFn: async ({ location, favorite }: { location: Location; favorite: boolean }) => {
      if (!location.id) return;
      if (favorite) {
        await locationApi.removeFavorite(location.id);
        return "REMOVED" as const;
      }
      await locationApi.addFavorite(location.id);
      return "ADDED" as const;
    },
    onSuccess: (action, { location }) => {
      if (!action) return;
      queryClient.setQueryData<Location[]>(
        [...FAVORITES_QUERY_KEY, "catalog"],
        (current) => {
          if (!current) return current;
          if (action === "REMOVED") {
            return current.filter(
              (item) => (item.id ?? item.label) !== (location.id ?? location.label),
            );
          }
          return current.some(
            (item) => (item.id ?? item.label) === (location.id ?? location.label),
          )
            ? current
            : [...current, location];
        },
      );
      const removedLastItemOnPage = action === "REMOVED"
        && favorites.some((item) => (item.id ?? item.label) === (location.id ?? location.label))
        && favorites.length === 1
        && pages.FAVORITES > 1;
      if (removedLastItemOnPage) {
        setPages((currentPages) => ({
          ...currentPages,
          FAVORITES: currentPages.FAVORITES - 1,
        }));
      }
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
    onError: () => {
      showToast("즐겨찾기를 변경하지 못했어요.", "ERROR");
    },
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
  const toggleFavorite = async (location: Location) => {
    if (favoriteMutation.isPending || serverFavoriteCatalog.isFetching) return;
    const favoriteOnVisiblePage = favorites.some(
      (item) => (item.id ?? item.label) === (location.id ?? location.label),
    );
    let catalog = serverFavoriteCatalog.data;
    if (!catalog && !favoriteOnVisiblePage) {
      const refreshedCatalog = await serverFavoriteCatalog.refetch();
      catalog = refreshedCatalog.data;
      if (!catalog) {
        showToast("즐겨찾기 정보를 불러오지 못했어요.", "ERROR");
        return;
      }
    }
    const favorite = favoriteOnVisiblePage || (catalog ?? []).some(
      (item) => (item.id ?? item.label) === (location.id ?? location.label),
    );
    favoriteMutation.mutate({ location, favorite });
  };
  const changePage = (tab: LocationTab, page: number) => {
    const pageCount = tab === "SEARCH"
      ? Math.max(1, serverSearch.data?.totalPages ?? 1)
      : tab === "FAVORITES"
        ? Math.max(1, serverFavorites.data?.totalPages ?? 1)
        : getLocationPageCount(popularLocations.length);
    setPages((currentPages) => ({
      ...currentPages,
      [tab]: Math.min(Math.max(1, page), pageCount),
    }));
  };
  const detectCandidateLocation = async () => {
    const location = await onDetect();
    if (location) setSelectedLocation(location);
  };
  const refreshPopular = async () => {
    if (isPopularRefreshAnimating) return;
    setIsPopularRefreshAnimating(true);
    const minimumAnimation = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 650);
    });
    try {
      await Promise.all([
        serverPopular.isFetching ? Promise.resolve() : serverPopular.refetch(),
        minimumAnimation,
      ]);
    } finally {
      setIsPopularRefreshAnimating(false);
    }
  };
  const selectTab = (tab: LocationTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      if (tab === "POPULAR") void refreshPopular();
      return;
    }
    if (tab === "FAVORITES" && isMember && !serverFavorites.isFetching && !serverFavoriteCatalog.isFetching) {
      void Promise.all([serverFavorites.refetch(), serverFavoriteCatalog.refetch()]);
    }
    if (tab === "POPULAR") {
      void refreshPopular();
      if (isMember && !serverFavoriteCatalog.isSuccess && !serverFavoriteCatalog.isFetching) {
        void serverFavoriteCatalog.refetch();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#173144]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="location-title">
      <div className="max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-[#eef9ff] p-6 pb-8 shadow-2xl sm:rounded-[28px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="location-title" className="text-xl font-extrabold">어느 동네 날씨를 볼까요?</h2>
          </div>
          {!required && <button type="button" onClick={() => closeModal()} className="flex size-9 items-center justify-center rounded-xl border-2 border-[#d2e3ec]" aria-label="닫기"><X size={18} /></button>}
        </div>
        <div className="mb-5 flex items-center gap-3 rounded-[18px] border-2 border-[#d2e3ec] p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef9ff] text-[#45ace4]"><MapPin size={18} /></span>
          <div className="min-w-0 flex-1">{isDetecting ? <LocationDetectingIndicator iconPosition="right" /> : <p className="break-keep text-base font-extrabold leading-6">{selectedLocation ? getLocationName(selectedLocation, "full") : current ? getLocationName(current, "full") : "아직 설정되지 않았어요"}</p>}</div>
          <button type="button" onClick={detectCandidateLocation} disabled={isDetecting} className="flex shrink-0 items-center gap-1 rounded-xl border-2 border-[#d2e3ec] bg-[#eef9ff] px-2.5 py-1.5 text-[11px] font-extrabold text-[#268fc7] disabled:opacity-50" aria-label="현재 위치 다시 찾기"><LocateFixed size={14} /> 현 위치</button>
        </div>
        {detectionError && <p className="-mt-3 mb-5 flex items-start gap-1.5 px-1 text-xs font-bold leading-5 text-[#b36b54]"><AlertCircle size={14} className="mt-0.5 shrink-0" />{detectionError}</p>}
        <form onSubmit={submit}>
          <div className={`${activeTab === "POPULAR" ? "mb-0" : "mb-4"} grid grid-cols-3 rounded-2xl p-1`}>
            <TabButton active={activeTab === "SEARCH"} onClick={() => selectTab("SEARCH")} icon={<Search size={14} />} label="검색" />
            <TabButton active={activeTab === "FAVORITES"} onClick={() => selectTab("FAVORITES")} icon={<Star size={14} />} label="즐겨찾기" />
            <TabButton active={activeTab === "POPULAR"} onClick={() => selectTab("POPULAR")} icon={<Flame size={14} />} label="인기" />
          </div>

          <div className="min-h-44">
            {activeTab === "SEARCH" && <>
              <label htmlFor="location" className="sr-only">동네 검색</label>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-[#d2e3ec] px-4 focus-within:border-[#45ace4] focus-within:ring-3 focus-within:ring-[#45ace4]/10">
                <Search size={19} className="shrink-0 text-[#8ba0ae]" />
                <input id="location" value={value} onChange={(event) => { setValue(truncateText(event.target.value, 30)); setSelectedLocation(null); setPages((currentPages) => currentPages.SEARCH === 1 ? currentPages : { ...currentPages, SEARCH: 1 }); }} placeholder="시·구 또는 동 이름을 검색하세요" maxLength={30} autoComplete="off" className="h-14 min-w-0 flex-1 border-0 bg-transparent outline-none" />
              </div>
              <div className="mt-2 space-y-1">
                {!serverSearch.isError && searchResults.length > 0 && <ServerPaginatedLocationList label="검색 결과" locations={searchResults} page={visiblePages.SEARCH} totalPages={serverSearch.data?.totalPages ?? 0} hasPrevious={serverSearch.data?.hasPrevious ?? false} hasNext={serverSearch.data?.hasNext ?? false} isPageLoading={serverSearch.isPlaceholderData && serverSearch.isFetching} selectedLocation={selectedLocation} onPageChange={(page) => changePage("SEARCH", page)} onSelect={chooseLocation} isFavorite={isMember ? isFavorite : undefined} onToggleFavorite={isMember ? toggleFavorite : undefined} favoriteDisabled={favoriteMutation.isPending || serverFavoriteCatalog.isFetching} />}
                {serverSearch.isFetching && !serverSearch.data && <div className="space-y-2 px-3 py-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-10 rounded-xl" />)}</div>}
                {serverSearch.isError && <LocationLoadError onRetry={() => serverSearch.refetch()} />}
                {value.trim() && !serverSearch.isFetching && !serverSearch.isError && searchResults.length === 0 && <p className="px-3 py-8 text-center text-sm font-semibold text-[#8ba0ae]">검색 결과가 없습니다.</p>}
                {!value.trim() && <p className="px-3 py-8 text-center text-sm font-semibold leading-6 text-[#8ba0ae]">검색 결과가 없습니다.</p>}
              </div>
            </>}
            {activeTab === "FAVORITES" && (isMember
              ? serverFavorites.isError && !serverFavorites.data
                ? <LocationLoadError onRetry={() => serverFavorites.refetch()} />
                : serverFavorites.isPending
                  ? <div className="space-y-2 px-3 py-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-10 rounded-xl" />)}</div>
                  : <ServerPaginatedLocationList label="즐겨찾기" empty="아직 즐겨찾는 동네가 없어요." locations={favorites} page={visiblePages.FAVORITES} totalPages={serverFavorites.data?.totalPages ?? 0} hasPrevious={serverFavorites.data?.hasPrevious ?? false} hasNext={serverFavorites.data?.hasNext ?? false} isPageLoading={serverFavorites.isPlaceholderData && serverFavorites.isFetching} selectedLocation={selectedLocation} onPageChange={(page) => changePage("FAVORITES", page)} onSelect={chooseLocation} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} favoriteDisabled={favoriteMutation.isPending || serverFavoriteCatalog.isFetching} />
              : <div className="flex min-h-44 -translate-y-2 flex-col items-center justify-center px-6 text-center text-[#8d6b27]"><LockKeyhole size={25} /><p className="mt-3 text-sm font-extrabold">회원 전용 기능이에요</p><p className="mt-1 text-xs font-semibold leading-5 text-[#9a8050]">로그인하면 자주 보는 동네를<br />즐겨찾기에 저장할 수 있어요.</p></div>)}
            {activeTab === "POPULAR" && <>
              <PopularRefreshControl updatedAt={serverPopular.dataUpdatedAt} calculatedAt={serverPopular.data?.calculatedAt} isFetching={serverPopular.isFetching || isPopularRefreshAnimating} onRefresh={() => void refreshPopular()} />
              {serverPopular.isError && popularLocations.length === 0
                ? <LocationLoadError onRetry={() => serverPopular.refetch()} />
                : serverPopular.isPending
                  ? <div className="space-y-2 px-3 py-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-10 rounded-xl" />)}</div>
                  : <PaginatedPopularLocationList label="인기 동네" empty="아직 인기 동네가 없어요." items={popularItems} page={visiblePages.POPULAR} selectedLocation={selectedLocation} onPageChange={(page) => changePage("POPULAR", page)} onSelect={chooseLocation} isFavorite={isMember ? isFavorite : undefined} onToggleFavorite={isMember ? toggleFavorite : undefined} favoriteDisabled={favoriteMutation.isPending || serverFavoriteCatalog.isFetching} />}
            </>}
          </div>
          <button type="submit" disabled={!selectedLocation && !exactMatch} className={`primary-button ${activeTab === "POPULAR" ? "mt-2" : "mt-4"}`}>확인</button>
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

function PopularRefreshControl({ updatedAt, calculatedAt, isFetching, onRefresh }: {
  updatedAt: number;
  calculatedAt?: string;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const calculatedDate = calculatedAt ? new Date(calculatedAt) : null;
  const updatedAtLabel = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? `${format(updatedDate, "a h:mm", { locale: ko })} 확인`
    : "집계 대기";
  const calculatedAtLabel = calculatedDate && !Number.isNaN(calculatedDate.getTime())
    ? `인기 순위 집계: ${format(calculatedDate, "M월 d일 a h:mm", { locale: ko })}`
    : undefined;

  return <div className="-mt-0.5 mb-0.5 flex justify-end">
    <button type="button" onClick={onRefresh} disabled={isFetching} title={calculatedAtLabel} className="flex h-7 items-center gap-1 px-1.5 text-[10px] font-bold text-[#718594] transition-colors hover:text-[#268fc7] disabled:cursor-wait disabled:opacity-60" aria-label={`${updatedAtLabel}, 인기 동네 새로고침`}>
      <RotateCw size={12} strokeWidth={2.3} className={isFetching ? "animate-spin [animation-duration:1.1s]" : ""} />
      <span>{updatedAtLabel}</span>
    </button>
  </div>;
}

function LocationList({ empty, locations, popularities, selectedLocation, onSelect, isFavorite, onToggleFavorite, favoriteDisabled }: {
  empty?: string;
  locations: ReadonlyArray<Location>;
  popularities?: ReadonlyArray<PopularLocationItem>;
  selectedLocation: Location | null;
  onSelect: (location: Location) => void;
  isFavorite?: (location: Location) => boolean;
  onToggleFavorite?: (location: Location) => void;
  favoriteDisabled?: boolean;
}) {
  return locations.length === 0 ? <p className="px-3 py-12 text-center text-sm font-semibold text-[#8ba0ae]">{empty}</p> : <div className={popularities ? "space-y-0.5" : "space-y-1"}>{locations.map((location, index) => <LocationRow key={location.id ?? location.label} location={location} popularity={popularities?.[index]} selected={(selectedLocation?.id ?? selectedLocation?.label) === (location.id ?? location.label)} favorite={isFavorite?.(location)} onSelect={onSelect} onToggleFavorite={onToggleFavorite} favoriteDisabled={favoriteDisabled} />)}</div>;
}

function ServerPaginatedLocationList({ label, empty, locations, page, totalPages, hasPrevious, hasNext, isPageLoading = false, selectedLocation, onPageChange, onSelect, isFavorite, onToggleFavorite, favoriteDisabled }: {
  label: string;
  empty?: string;
  locations: ReadonlyArray<Location>;
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isPageLoading?: boolean;
  selectedLocation: Location | null;
  onPageChange: (page: number) => void;
  onSelect: (location: Location) => void;
  isFavorite?: (location: Location) => boolean;
  onToggleFavorite?: (location: Location) => void;
  favoriteDisabled?: boolean;
}) {
  return <>
    <div className={`transition-opacity duration-150 ${isPageLoading ? "pointer-events-none opacity-70" : "opacity-100"}`} aria-busy={isPageLoading}>
      <LocationList empty={empty} locations={locations} selectedLocation={selectedLocation} onSelect={onSelect} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} favoriteDisabled={favoriteDisabled || isPageLoading} />
    </div>
    {locations.length > 0 && totalPages > 1 && <LocationPagination label={label} page={page} pageCount={totalPages} hasPrevious={hasPrevious} hasNext={hasNext} isLoading={isPageLoading} onPageChange={onPageChange} />}
  </>;
}

function PaginatedPopularLocationList({ label, empty, items, page, selectedLocation, onPageChange, onSelect, isFavorite, onToggleFavorite, favoriteDisabled }: {
  label: string;
  empty?: string;
  items: ReadonlyArray<PopularLocationItem>;
  page: number;
  selectedLocation: Location | null;
  onPageChange: (page: number) => void;
  onSelect: (location: Location) => void;
  isFavorite?: (location: Location) => boolean;
  onToggleFavorite?: (location: Location) => void;
  favoriteDisabled?: boolean;
}) {
  const currentPage = clampLocationPage(page, items.length);
  const pageCount = getLocationPageCount(items.length);
  const pageItems = getLocationPageItems(items, currentPage);

  return <>
    <LocationList empty={empty} locations={pageItems.map((item) => item.location)} popularities={pageItems} selectedLocation={selectedLocation} onSelect={onSelect} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} favoriteDisabled={favoriteDisabled} />
    {items.length > 0 && pageCount > 1 && <LocationPagination compact label={label} page={currentPage} pageCount={pageCount} hasPrevious={currentPage > 1} hasNext={currentPage < pageCount} onPageChange={onPageChange} />}
  </>;
}

function LocationPagination({ label, page, pageCount, hasPrevious, hasNext, onPageChange, compact = false, isLoading = false }: {
  label: string;
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  compact?: boolean;
  isLoading?: boolean;
}) {
  return <nav aria-label={`${label} 페이지 이동`} aria-busy={isLoading} className={`${compact ? "mt-1 gap-1" : "mt-3 gap-1.5"} flex items-center justify-center`}>
    <button type="button" disabled={!hasPrevious || isLoading} onClick={() => onPageChange(1)} className={`${compact ? "size-8" : "size-10"} flex items-center justify-center rounded-xl text-[#526a7a] transition-colors hover:text-[#268fc7] disabled:cursor-not-allowed disabled:opacity-35`} aria-label={`${label} 첫 페이지`}>
      <ChevronsLeft size={compact ? 14 : 15} />
    </button>
    <button type="button" disabled={!hasPrevious || isLoading} onClick={() => onPageChange(page - 1)} className={`${compact ? "h-8 px-1.5 text-[11px]" : "h-10 px-2 text-xs"} flex items-center gap-0.5 rounded-xl font-extrabold text-[#526a7a] transition-colors hover:text-[#268fc7] disabled:cursor-not-allowed disabled:opacity-35`} aria-label={`${label} 이전 페이지`}>
      <ChevronLeft size={compact ? 14 : 15} />
      이전
    </button>
    <span className={`${compact ? "text-[11px]" : "text-xs"} inline-flex min-w-12 items-center justify-center text-center font-extrabold text-[#718594]`} aria-live="polite" aria-atomic="true">{page} / {pageCount}</span>
    <button type="button" disabled={!hasNext || isLoading} onClick={() => onPageChange(page + 1)} className={`${compact ? "h-8 px-1.5 text-[11px]" : "h-10 px-2 text-xs"} flex items-center gap-0.5 rounded-xl font-extrabold text-[#526a7a] transition-colors hover:text-[#268fc7] disabled:cursor-not-allowed disabled:opacity-35`} aria-label={`${label} 다음 페이지`}>
      다음
      <ChevronRight size={compact ? 14 : 15} />
    </button>
    <button type="button" disabled={!hasNext || isLoading} onClick={() => onPageChange(pageCount)} className={`${compact ? "size-8" : "size-10"} flex items-center justify-center rounded-xl text-[#526a7a] transition-colors hover:text-[#268fc7] disabled:cursor-not-allowed disabled:opacity-35`} aria-label={`${label} 마지막 페이지`}>
      <ChevronsRight size={compact ? 14 : 15} />
    </button>
  </nav>;
}

function getMovementDisplay(movement: PopularLocationMovement, rankChange: number | null) {
  const amount = rankChange === null ? "" : Math.abs(rankChange);
  if (movement === "UP") return { label: `▲${amount}`, description: `${amount || 0}계단 상승`, className: "text-[#e45f55]" };
  if (movement === "DOWN") return { label: `▼${amount}`, description: `${amount || 0}계단 하락`, className: "text-[#438fce]" };
  if (movement === "NEW") return { label: "NEW", description: "순위 신규 진입", className: "text-[#e78f2d]" };
  if (movement === "SAME") return { label: "―", description: "순위 변동 없음", className: "text-[#8ba0ae]" };
  return { label: "·", description: "이전 순위 없음", className: "text-[#a4b3bd]" };
}

function LocationRow({ location, popularity, selected, favorite, onSelect, onToggleFavorite, favoriteDisabled }: { location: Location; popularity?: PopularLocationItem; selected: boolean; favorite?: boolean; onSelect: (location: Location) => void; onToggleFavorite?: (location: Location) => void; favoriteDisabled?: boolean }) {
  const movement = popularity ? getMovementDisplay(popularity.movement, popularity.rankChange) : null;

  return <div className={`flex items-center rounded-xl transition ${selected ? "bg-[#eaf7ff] text-[#268fc7]" : "hover:bg-[#f5f9fb]"}`}><button type="button" onClick={() => onSelect(location)} className={`flex min-w-0 flex-1 items-center gap-3 px-3 text-left text-sm font-bold ${popularity ? "py-2" : "py-3"}`}>
      {popularity ? <span className={`w-5 shrink-0 text-center text-xs font-extrabold ${popularity.rank <= 3 ? "text-[#e78f2d]" : selected ? "text-[#45ace4]" : "text-[#8ba0ae]"}`}>{popularity.rank}</span> : <MapPin size={16} className={selected ? "text-[#45ace4]" : "text-[#8ba0ae]"} />}
      <span className="flex-1 break-keep leading-5">{getLocationName(location, "full")}</span>
      {movement && <span className={`w-8 shrink-0 text-right text-[10px] font-extrabold ${movement.className}`} aria-label={movement.description} title={popularity?.previousRank ? `이전 ${popularity.previousRank}위` : movement.description}>{movement.label}</span>}
      {selected && !popularity && <Check size={16} strokeWidth={2.5} />}
  </button>{onToggleFavorite && <button type="button" onClick={() => onToggleFavorite(location)} disabled={favoriteDisabled} className={`mr-1 flex size-9 items-center justify-center rounded-lg disabled:cursor-wait disabled:opacity-55 ${favorite ? "text-[#f0a629]" : "text-[#a4b3bd] hover:text-[#f0a629]"}`} aria-label={favorite ? `${location.label} 즐겨찾기 해제` : `${location.label} 즐겨찾기 추가`}><Star size={20} fill={favorite ? "currentColor" : "none"} /></button>}</div>;
}
