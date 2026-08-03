"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { ReportCard } from "@/components/report-card";
import { ReportGridSkeleton } from "@/components/report-grid-skeleton";
import { weatherApi } from "@/lib/api";

export function MyReportList({ memberId, columns = 2, publicProfile = false }: { memberId: string; columns?: 2 | 3; publicProfile?: boolean }) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const reports = useInfiniteQuery({
    queryKey: [publicProfile ? "member-weather-reports" : "my-weather-reports", memberId],
    queryFn: ({ pageParam }) => publicProfile
      ? weatherApi.getMemberReports(memberId, pageParam)
      : weatherApi.getMyReports(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = reports;
  const reportItems = reports.data?.pages.flatMap((page) => page.reports) ?? [];
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (reports.isLoading) {
    return <ReportGridSkeleton columns={columns} count={columns === 3 ? 6 : 4} />;
  }

  if (reports.isError) {
    return <div className="rounded-[20px] border-2 border-[#d2e3ec] px-4 py-8 text-center"><p className="text-sm font-bold text-[#718594]">제보 목록을 불러오지 못했어요.</p><button type="button" onClick={() => reports.refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#268fc7]"><LoaderCircle size={16} /> 다시 불러오기</button></div>;
  }

  if (!reportItems.length) {
    return <div className="px-5 pb-3 pt-6 text-center"><p className="text-sm font-extrabold">아직 작성한 제보가 없어요.</p><p className="mt-1 text-xs font-semibold text-[#718594]">{publicProfile ? "아직 공개된 날씨 제보가 없어요." : "날씨를 제보하면 여기에서 확인할 수 있어요."}</p></div>;
  }

  return <><div className={`grid ${columns === 3 ? "grid-cols-3 gap-1.5" : "grid-cols-2 gap-3"}`}>{reportItems.map((report) => <ReportCard key={report.id} report={report} compact={columns === 3} />)}</div><div ref={loadMoreRef} className={`flex items-center justify-center ${reports.isFetchingNextPage ? "h-8" : "h-3"}`} aria-hidden={!reports.isFetchingNextPage}>{reports.isFetchingNextPage && <LoaderCircle size={18} className="animate-spin text-[#45ace4]" />}</div></>;
}
