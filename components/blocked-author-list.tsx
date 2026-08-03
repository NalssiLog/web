"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LoaderCircle, UserRound } from "lucide-react";
import { useState } from "react";
import { moderationApi } from "@/lib/api/moderation-api";
import { resolveProfileImage } from "@/lib/constants";
import { formatReportDateTime } from "@/lib/date";
import { useToastStore } from "@/store/toast-store";

const PAGE_SIZE = 20;

export function BlockedAuthorList() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [page, setPage] = useState(0);
  const blocks = useQuery({
    queryKey: ["report-blocks", page, PAGE_SIZE],
    queryFn: () => moderationApi.getReportBlocks(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const unblock = useMutation({
    mutationFn: moderationApi.unblockMember,
    onSuccess: () => {
      showToast("차단을 해제했어요.", "SUCCESS");
      if (blocks.data?.items.length === 1 && page > 0) setPage((current) => current - 1);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["report-blocks"] }),
        queryClient.invalidateQueries({ queryKey: ["weather-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["member-weather-reports"] }),
      ]);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "차단을 해제하지 못했어요.", "ERROR");
    },
  });

  if (blocks.isPending) {
    return <div className="space-y-2.5" aria-busy="true">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex items-center gap-3 rounded-[18px] border-2 border-[#d2e3ec] p-3"><span className="skeleton size-11 rounded-full" /><span className="skeleton h-4 flex-1 rounded" /></div>)}</div>;
  }

  if (blocks.isError || !blocks.data) {
    return <div className="rounded-[20px] border-2 border-[#d2e3ec] px-4 py-8 text-center"><p className="text-sm font-extrabold">차단 목록을 불러오지 못했어요.</p><button type="button" onClick={() => void blocks.refetch()} className="mt-3 text-xs font-extrabold text-[#238fc9]">다시 불러오기</button></div>;
  }

  if (blocks.data.items.length === 0) {
    return <p className="py-10 text-center text-sm font-extrabold text-[#718594]">차단한 사용자가 없어요.</p>;
  }

  return (
    <div>
      <div className={`space-y-2.5 transition-opacity ${blocks.isFetching ? "opacity-60" : "opacity-100"}`} aria-busy={blocks.isFetching}>
        {blocks.data.items.map((item) => {
          const avatarUrl = resolveProfileImage(item.avatar?.profileImageUrl ?? item.avatar?.value);
          const isUnblocking = unblock.isPending && unblock.variables === item.memberId;
          return <article key={item.memberId} className="flex items-center gap-3 rounded-[18px] border-2 border-[#d2e3ec] p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cover bg-center text-[#45ace4]" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined} aria-hidden="true">{!avatarUrl && <UserRound size={20} />}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{item.nickname}</p><p className="mt-0.5 text-[11px] font-semibold text-[#718594]">{formatReportDateTime(item.blockedAt)} 차단</p></div>
            <button type="button" disabled={unblock.isPending} onClick={() => unblock.mutate(item.memberId)} className="flex min-w-16 items-center justify-center gap-1 rounded-xl border-2 border-[#b9ddf0] px-2.5 py-2 text-xs font-extrabold text-[#268fc7] disabled:opacity-50">{isUnblocking && <LoaderCircle size={13} className="animate-spin" />}차단 해제</button>
          </article>;
        })}
      </div>
      {blocks.data.totalPages > 1 && <nav className="mt-4 flex items-center justify-center gap-4" aria-label="차단 목록 페이지">
        <button type="button" disabled={page === 0 || blocks.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))} className="flex size-9 items-center justify-center rounded-xl border-2 border-[#d2e3ec] disabled:opacity-35" aria-label="이전 페이지"><ChevronLeft size={17} /></button>
        <span className="min-w-14 text-center text-xs font-extrabold text-[#526a7a]">{page + 1} / {blocks.data.totalPages}</span>
        <button type="button" disabled={page + 1 >= blocks.data.totalPages || blocks.isFetching} onClick={() => setPage((current) => current + 1)} className="flex size-9 items-center justify-center rounded-xl border-2 border-[#d2e3ec] disabled:opacity-35" aria-label="다음 페이지"><ChevronRight size={17} /></button>
      </nav>}
    </div>
  );
}
