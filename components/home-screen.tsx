"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { HomeWeatherControls } from "@/components/home-weather-controls";
import { LocationPicker } from "@/components/location-picker";
import { ReportCard } from "@/components/report-card";
import { ReportGridSkeleton } from "@/components/report-grid-skeleton";
import { WeatherSummary, WeatherSummarySkeleton } from "@/components/weather-summary";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { weatherApi } from "@/lib/api";
import { getLocationName } from "@/lib/constants";
import { useToastStore } from "@/store/toast-store";

export function HomeScreen() {
  const { location, setLocation, isDetecting, detectionError, needsManualInput, setNeedsManualInput, detectLocation } = useCurrentLocation({ refreshOnResume: true });
  const showToast = useToastStore((state) => state.showToast);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const locationLabel = location ? getLocationName(location, "short") : "";
  const locationKey = location?.id ?? locationLabel;
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
    await Promise.all([summary.refetch(), reports.refetch()]);
  };
  const hasSummaryData = Boolean(summary.data);
  const hasReportData = Boolean(reports.data);
  const hasWeatherData = hasSummaryData || hasReportData;
  const hasWeatherError = summary.isError || reports.isError;
  const showLocationError = !location && !isDetecting && Boolean(detectionError);
  const isInitialWeatherLoading = !locationLabel || (!hasWeatherData && (summary.isPending || reports.isPending));
  const showFullWeatherError = Boolean(locationLabel) && !hasWeatherData && hasWeatherError && !summary.isPending && !reports.isPending;
  return (
    <div className="page main-tab-page">
      <AppHeader />
      <HomeWeatherControls
        location={locationLabel}
        isDetecting={isDetecting && !needsManualInput}
        updatedAt={summary.dataUpdatedAt}
        isRefreshing={summary.isFetching || reports.isRefetching}
        canRefresh={Boolean(location)}
        onLocationClick={() => setNeedsManualInput(true)}
        onRefresh={() => void refreshWeather()}
      />
      {hasWeatherData && hasWeatherError && <ConnectionNotice onRetry={refreshWeather} isRetrying={summary.isFetching || reports.isFetching} />}
      {showLocationError ? <ErrorState message="현재 동네를 불러오지 못했어요." transparent /> : showFullWeatherError ? <ErrorState onRetry={refreshWeather} transparent /> : <>
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

function ConnectionNotice({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-[18px] border-2 border-[#f0dfc8] bg-[#fff9ef] px-4 py-3 text-[#806846]" role="status">
      <CloudOff size={18} className="shrink-0" />
      <p className="min-w-0 flex-1 text-xs font-bold leading-5">서버 연결이 원활하지 않아 최근 데이터를 표시하고 있어요.</p>
      <button type="button" onClick={onRetry} disabled={isRetrying} className="flex size-8 shrink-0 items-center justify-center rounded-xl border-2 border-[#d2e3ec] transition-colors hover:text-[#268fc7] disabled:cursor-wait disabled:opacity-50" aria-label="날씨 다시 불러오기">
        <RefreshCw size={15} className={isRetrying ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
