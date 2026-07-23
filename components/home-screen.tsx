"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Camera, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LocationPicker } from "@/components/location-picker";
import { ReportCard } from "@/components/report-card";
import { ReportGridSkeleton } from "@/components/report-grid-skeleton";
import { UserPanel } from "@/components/user-panel";
import { WeatherSummary, WeatherSummarySkeleton } from "@/components/weather-summary";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { weatherApi } from "@/lib/api";
import { getLocationName } from "@/lib/constants";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";

export function HomeScreen() {
  const router = useRouter();
  const { location, setLocation, isDetecting, detectionError, needsManualInput, setNeedsManualInput, detectLocation } = useCurrentLocation();
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isFooterReached, setIsFooterReached] = useState(false);
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  const showToast = useToastStore((state) => state.showToast);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const footerBoundaryRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const boundary = footerBoundaryRef.current;
    if (!boundary) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsFooterReached(entry.isIntersecting);
    }, { rootMargin: "0px 0px -90px 0px" });
    observer.observe(boundary);
    return () => observer.disconnect();
  }, []);

  const items = reports.data?.pages.flatMap((page) => page.reports) ?? [];
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
  const canCreateReport = Boolean(location && hasWeatherData && !hasWeatherError);
  const openUserArea = () => {
    if (isMember) router.push("/mypage");
    else setIsUserPanelOpen(true);
  };
  return (
    <div className={`page ${isFooterReached ? "home-footer-reached" : ""}`}>
      <AppHeader location={locationLabel} isDetecting={isDetecting && !needsManualInput} onLocationClick={() => setNeedsManualInput(true)} onUserClick={openUserArea} />
      {hasWeatherData && hasWeatherError && <ConnectionNotice onRetry={refreshWeather} isRetrying={summary.isFetching || reports.isFetching} />}
      {showLocationError ? <ErrorState message="현재 동네를 불러오지 못했어요." actionLabel="동네 선택하기" onRetry={() => setNeedsManualInput(true)} /> : showFullWeatherError ? <ErrorState onRetry={refreshWeather} /> : <>
        {summary.data
          ? <WeatherSummary summary={summary.data} updatedAt={summary.dataUpdatedAt} isRefreshing={summary.isFetching || reports.isRefetching} onRefresh={refreshWeather} />
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
      <div ref={loadMoreRef} className="flex h-20 items-center justify-center text-sm text-[#8ba0ae]">
        {reports.isFetchingNextPage ? "다음 날씨를 불러오는 중…" : !reports.hasNextPage && items.length > 0 ? "모든 날씨를 확인했어요" : null}
      </div>
      <div ref={footerBoundaryRef} className="h-px" aria-hidden="true" />
      {canCreateReport && <div className={isFooterReached ? "home-cta-inline" : "mobile-fixed"}><Link href="/reports/new" className="primary-button"><Camera size={20} strokeWidth={2.4} /> 지금 날씨 제보하기</Link></div>}
      <LocationPicker open={needsManualInput} current={location} isDetecting={isDetecting} detectionError={detectionError} required={false} onClose={() => setNeedsManualInput(false)} onDetect={detectLocation} onSelect={(next) => { setLocation(next); setNeedsManualInput(false); showToast(`${getLocationName(next, "short")} 날씨로 이동했어요.`, "INFO"); }} />
      <UserPanel open={isUserPanelOpen} onClose={() => setIsUserPanelOpen(false)} />
    </div>
  );
}

function ConnectionNotice({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-[#f0dfc8] bg-[#fff9ef] px-4 py-3 text-[#806846]" role="status">
      <CloudOff size={18} className="shrink-0" />
      <p className="min-w-0 flex-1 text-xs font-bold leading-5">서버 연결이 원활하지 않아 최근 데이터를 표시하고 있어요.</p>
      <button type="button" onClick={onRetry} disabled={isRetrying} className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white transition-colors hover:text-[#268fc7] disabled:cursor-wait disabled:opacity-50" aria-label="날씨 다시 불러오기">
        <RefreshCw size={15} className={isRetrying ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
