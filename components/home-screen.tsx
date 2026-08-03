"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { HomeWeatherControls } from "@/components/home-weather-controls";
import { LocationPicker } from "@/components/location-picker";
import { ReportCard } from "@/components/report-card";
import { ReportGridSkeleton } from "@/components/report-grid-skeleton";
import { WeatherSummary, WeatherSummarySkeleton } from "@/components/weather-summary";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { useLocationFavorite } from "@/hooks/use-location-favorite";
import { weatherApi } from "@/lib/api";
import { getLocationName } from "@/lib/constants";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";

export function HomeScreen() {
  const { location, setLocation, isDetecting, detectionError, needsManualInput, setNeedsManualInput, detectLocation } = useCurrentLocation({ refreshOnHomeResume: true });
  const showToast = useToastStore((state) => state.showToast);
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isManualRefreshAnimating, setIsManualRefreshAnimating] = useState(false);
  const locationLabel = location ? getLocationName(location, "short") : "";
  const locationKey = location?.id ?? locationLabel;
  const showFavoriteError = useCallback(() => {
    showToast("즐겨찾기를 변경하지 못했어요.", "ERROR");
  }, [showToast]);
  const favorite = useLocationFavorite({
    location,
    enabled: isMember,
    onError: showFavoriteError,
  });
  const summary = useQuery({ queryKey: ["weather-summary", locationKey], queryFn: () => weatherApi.getSummary(location!), enabled: !!location, refetchInterval: 10_000, refetchIntervalInBackground: false });
  const reports = useInfiniteQuery({
    queryKey: ["weather-reports", locationKey],
    queryFn: ({ pageParam }) => weatherApi.getReports(location!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!location,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = reports;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: "180px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const items = reports.data?.pages.flatMap((page) => page.reports) ?? [];
  const isEmptyFeed = Boolean(reports.data && items.length === 0);
  const showFeedEndMessage = Boolean(reports.data && !reports.hasNextPage && items.length > 0);
  const refreshWeather = async () => {
    if (isManualRefreshAnimating) return;
    setIsManualRefreshAnimating(true);
    const minimumAnimation = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 650);
    });
    try {
      await Promise.all([summary.refetch(), reports.refetch(), minimumAnimation]);
    } finally {
      setIsManualRefreshAnimating(false);
    }
  };
  const hasSummaryData = Boolean(summary.data);
  const hasReportData = Boolean(reports.data);
  const hasWeatherData = hasSummaryData || hasReportData;
  const hasWeatherError = summary.isError || reports.isError;
  const showLocationError = !location && !isDetecting && Boolean(detectionError);
  const isInitialWeatherLoading = !isDetecting && Boolean(locationLabel) && !hasWeatherData && (summary.isPending || reports.isPending);
  const showFullWeatherError = Boolean(locationLabel) && !hasWeatherData && hasWeatherError && !summary.isPending && !reports.isPending;
  return (
    <div className="page main-tab-page">
      <AppHeader />
      <HomeWeatherControls
        location={locationLabel}
        isDetecting={isDetecting && !needsManualInput}
        updatedAt={summary.dataUpdatedAt}
        isRefreshing={summary.isFetching || reports.isRefetching || isManualRefreshAnimating}
        canRefresh={Boolean(location)}
        isFavorite={favorite.isFavorite}
        isFavoriteDisabled={favorite.isLoading || favorite.isUpdating}
        onLocationClick={() => setNeedsManualInput(true)}
        onFavoriteToggle={isMember && location?.id ? () => void favorite.toggleFavorite() : undefined}
        onRefresh={() => void refreshWeather()}
      />
      {showLocationError ? <ErrorState message="현재 동네를 불러오지 못했어요." transparent /> : showFullWeatherError ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><p className="font-extrabold">서버 오류입니다</p><p className="mt-1 text-sm text-[#718594]">관리자에게 문의해 주세요</p></div> : <>
        {summary.data
          ? <WeatherSummary summary={summary.data} />
          : isInitialWeatherLoading || (!summary.isError && summary.isPending)
            ? <WeatherSummarySkeleton />
            : null}
        {reports.data
          ? items.length === 0
            ? <EmptyState />
            : <div className="grid grid-cols-2 gap-3">{items.map((report) => <ReportCard key={report.id} report={report} />)}</div>
          : isInitialWeatherLoading || (!reports.isError && reports.isPending)
            ? <ReportGridSkeleton columns={2} />
            : null}
      </>}
      <div ref={loadMoreRef} className={`flex items-center justify-center text-sm text-[#8ba0ae] ${isEmptyFeed ? "h-2" : showFeedEndMessage ? "mb-1 mt-4 min-h-5" : "h-8"}`}>
        {reports.isFetchingNextPage ? "다음 날씨를 불러오는 중…" : showFeedEndMessage ? "모든 날씨를 확인했어요" : null}
      </div>
      <LocationPicker open={needsManualInput} current={location} isDetecting={isDetecting} detectionError={detectionError} required={false} onClose={() => setNeedsManualInput(false)} onDetect={detectLocation} onSelect={(next) => { setLocation(next); setNeedsManualInput(false); showToast(`${getLocationName(next, "short")} 날씨로 이동했어요.`, "INFO"); }} />
    </div>
  );
}
