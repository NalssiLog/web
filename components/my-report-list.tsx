"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { CloudSun, LoaderCircle } from "lucide-react";
import Link from "next/link";
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
    return <div className="rounded-[20px] bg-white px-4 py-8 text-center"><p className="text-sm font-bold text-[#718594]">제보 목록을 불러오지 못했어요.</p><button type="button" onClick={() => reports.refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#268fc7]"><LoaderCircle size={16} /> 다시 불러오기</button></div>;
  }

  if (!reportItems.length) {
    return <div className="rounded-[20px] bg-white px-5 py-9 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#eef9ff] text-[#45ace4]"><CloudSun size={24} /></span><p className="mt-3 text-sm font-extrabold">아직 작성한 제보가 없어요.</p><p className="mt-1 text-xs font-semibold text-[#718594]">{publicProfile ? "아직 공개된 날씨 제보가 없어요." : "날씨를 제보하면 여기에서 확인할 수 있어요."}</p>{!publicProfile && <Link href="/reports/new" className="mt-4 inline-flex rounded-full bg-[#e6f6ff] px-4 py-2 text-xs font-extrabold text-[#238fc9]">날씨 제보하기</Link>}</div>;
  }

  return <><div className={`grid ${columns === 3 ? "grid-cols-3 gap-1.5" : "grid-cols-2 gap-3"}`}>{reportItems.map((report) => <ReportCard key={report.id} report={report} compact={columns === 3} />)}</div><div ref={loadMoreRef} className="flex h-12 items-center justify-center" aria-hidden={!reports.isFetchingNextPage}>{reports.isFetchingNextPage && <LoaderCircle size={18} className="animate-spin text-[#45ace4]" />}</div></>;
}
