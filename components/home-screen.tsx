"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LocationPicker } from "@/components/location-picker";
import { ReportCard } from "@/components/report-card";
import { UserPanel } from "@/components/user-panel";
import { WeatherSummary } from "@/components/weather-summary";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { weatherApi } from "@/lib/api";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";

export function HomeScreen() {
  const router = useRouter();
  const { location, setLocation, isDetecting, needsManualInput, setNeedsManualInput, detectLocation } = useCurrentLocation();
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isFooterReached, setIsFooterReached] = useState(false);
  const isMember = useAuthStore((state) => state.user.type === "MEMBER");
  const showToast = useToastStore((state) => state.showToast);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const footerBoundaryRef = useRef<HTMLDivElement>(null);
  const locationLabel = location?.label ?? "";
  const summary = useQuery({ queryKey: ["weather-summary", locationLabel], queryFn: () => weatherApi.getSummary(locationLabel), enabled: !!locationLabel, refetchInterval: 10_000, refetchIntervalInBackground: false });
  const reports = useInfiniteQuery({
    queryKey: ["weather-reports", locationLabel],
    queryFn: ({ pageParam }) => weatherApi.getReports(locationLabel, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!locationLabel,
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
  const openUserArea = () => {
    if (isMember) router.push("/mypage");
    else setIsUserPanelOpen(true);
  };
  return (
    <div className={`page ${isFooterReached ? "home-footer-reached" : ""}`}>
      <AppHeader location={locationLabel} isDetecting={isDetecting && !needsManualInput} onLocationClick={() => setNeedsManualInput(true)} onUserClick={openUserArea} />
      {summary.isLoading || !locationLabel ? <div className="skeleton mb-5 h-28 rounded-[18px]" /> : summary.isError ? <ErrorState onRetry={() => summary.refetch()} /> : summary.data ? <WeatherSummary summary={summary.data} updatedAt={summary.dataUpdatedAt} isRefreshing={summary.isFetching || reports.isRefetching} onRefresh={refreshWeather} /> : null}
      {reports.isLoading || !locationLabel ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton aspect-square rounded-[22px]" />)}</div>
      ) : reports.isError ? (
        <ErrorState onRetry={() => reports.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3">{items.map((report) => <ReportCard key={report.id} report={report} />)}</div>
      )}
      <div ref={loadMoreRef} className="flex h-20 items-center justify-center text-sm text-[#8ba0ae]">
        {reports.isFetchingNextPage ? "다음 날씨를 불러오는 중…" : !reports.hasNextPage && items.length > 0 ? "모든 날씨를 확인했어요" : null}
      </div>
      <div ref={footerBoundaryRef} className="h-px" aria-hidden="true" />
      <div className={isFooterReached ? "home-cta-inline" : "mobile-fixed"}><Link href="/reports/new" className="primary-button"><Camera size={20} strokeWidth={2.4} /> 지금 날씨 제보하기</Link></div>
      <LocationPicker open={needsManualInput} current={locationLabel} isDetecting={isDetecting} required={!location} onClose={() => setNeedsManualInput(false)} onDetect={detectLocation} onSelect={(next) => { setLocation(next); setNeedsManualInput(false); showToast(`${next.label} 날씨로 이동했어요.`, "INFO"); }} />
      <UserPanel open={isUserPanelOpen} onClose={() => setIsUserPanelOpen(false)} />
    </div>
  );
}
