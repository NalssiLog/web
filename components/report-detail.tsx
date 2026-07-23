"use client";

import { useMutation, useQuery, useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight, CloudRain, Heart, Sun, Thermometer, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { ErrorState } from "@/components/error-state";
import { ReportDeleteConfirmModal } from "@/components/report-delete-confirm-modal";
import { weatherApi } from "@/lib/api";
import { ApiError } from "@/lib/api/http-client";
import { PRECIPITATION_OPTIONS, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, formatThanksCount, getLocationName, statusLabel } from "@/lib/constants";
import type { ReportPage, ThanksState, WeatherReport } from "@/lib/types";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";

const REPORT_LIST_QUERY_KEYS = new Set([
  "weather-reports",
  "my-weather-reports",
  "member-weather-reports",
]);

function isReportListQuery(queryKey: QueryKey) {
  return REPORT_LIST_QUERY_KEYS.has(String(queryKey[0]));
}

function updateReportPageThanks(
  data: InfiniteData<ReportPage> | undefined,
  reportId: string,
  thanks: ThanksState,
) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      reports: page.reports.map((item) =>
        item.id === reportId ? { ...item, ...thanks } : item,
      ),
    })),
  };
}

function removeReportFromPages(
  data: InfiniteData<ReportPage> | undefined,
  reportId: string,
) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      reports: page.reports.filter((item) => item.id !== reportId),
    })),
  };
}

interface ThanksMutationContext {
  previousReport?: WeatherReport;
  previousLists: Array<[QueryKey, InfiniteData<ReportPage> | undefined]>;
}

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useAuthStore((state) => state.user);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const report = useQuery({ queryKey: ["weather-report", id], queryFn: () => weatherApi.getReport(id) });
  const thanks = useMutation<ThanksState, Error, void, ThanksMutationContext>({
    mutationFn: () => weatherApi.toggleThanks(id, Boolean(report.data?.isThanked)),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["weather-report", id] }),
        queryClient.cancelQueries({ predicate: (query) => isReportListQuery(query.queryKey) }),
      ]);
      const previousReport = queryClient.getQueryData<WeatherReport>(["weather-report", id]);
      const previousLists = queryClient.getQueriesData<InfiniteData<ReportPage>>({
        predicate: (query) => isReportListQuery(query.queryKey),
      });
      if (previousReport) {
        const isThanked = !previousReport.isThanked;
        const optimisticThanks = {
          isThanked,
          thanksCount: Math.max(0, previousReport.thanksCount + (isThanked ? 1 : -1)),
        };
        queryClient.setQueryData<WeatherReport>(["weather-report", id], {
          ...previousReport,
          ...optimisticThanks,
        });
        queryClient.setQueriesData<InfiniteData<ReportPage>>(
          { predicate: (query) => isReportListQuery(query.queryKey) },
          (data) => updateReportPageThanks(data, id, optimisticThanks),
        );
      }
      return { previousReport, previousLists };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReport) {
        queryClient.setQueryData(["weather-report", id], context.previousReport);
      }
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      showToast("감사를 반영하지 못했어요.", "ERROR");
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WeatherReport>(["weather-report", id], (current) =>
        current ? { ...current, ...updated } : current,
      );
      queryClient.setQueriesData<InfiniteData<ReportPage>>(
        { predicate: (query) => isReportListQuery(query.queryKey) },
        (data) => updateReportPageThanks(data, id, updated),
      );
    },
  });
  const deleteReport = useMutation({
    mutationFn: () => weatherApi.deleteReport(id),
    onSuccess: () => {
      queryClient.setQueriesData<InfiniteData<ReportPage>>(
        { predicate: (query) => isReportListQuery(query.queryKey) },
        (data) => removeReportFromPages(data, id),
      );
      void queryClient.invalidateQueries({ queryKey: ["weather-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["weather-reports"] });
      setIsDeleteModalOpen(false);
      showToast("날씨 제보를 삭제했어요.", "SUCCESS");
      router.back();
      window.setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["weather-report", id], exact: true });
      }, 100);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "REPORT_NOT_FOUND") {
        showToast("이미 삭제되었거나 존재하지 않는 제보예요.", "ERROR");
        return;
      }
      if (error instanceof ApiError && error.code === "REPORT_DELETE_FORBIDDEN") {
        showToast("본인이 작성한 제보만 삭제할 수 있어요.", "ERROR");
        return;
      }
      showToast(error instanceof Error ? error.message : "제보를 삭제하지 못했어요.", "ERROR");
    },
  });

  if (report.isLoading) return <DetailSkeleton onBack={() => router.back()} />;
  if (report.isError || !report.data) return <div className="page"><DetailHeader onBack={() => router.back()} title="제보 상세" /><ErrorState message={report.error instanceof Error ? report.error.message : undefined} onRetry={() => report.refetch()} /></div>;
  const item = report.data;
  const author = item.author.type === "ANONYMOUS" ? "익명의 이웃" : item.author.nickname;
  const authorHref = item.author.type === "MEMBER"
    ? currentUser.type === "MEMBER" && currentUser.id === item.author.id
      ? "/mypage"
      : `/users/${item.author.id}`
    : null;
  const canDelete = item.isMine;

  return (
    <article className="min-h-screen pb-28">
      <div className="px-5"><DetailHeader onBack={() => router.back()} title={getLocationName(item.location, "full")} /></div>
      <header className="flex items-center gap-3 px-5 pb-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm shadow-[#b8d6e6]/20" style={item.author.type === "MEMBER" && item.author.avatarUrl ? { backgroundImage: `url(${item.author.avatarUrl})` } : undefined} aria-hidden="true">{item.author.type === "ANONYMOUS" ? "☁️" : !item.author.avatarUrl ? <UserRound size={21} /> : null}</span>
        <div className="min-w-0 flex-1">{authorHref ? <Link href={authorHref} className="font-extrabold transition-colors hover:text-[#268fc7]">{author}</Link> : <p className="font-extrabold">{author}</p>}<p className="mt-0.5 text-xs font-semibold text-[#718594]">{format(new Date(item.createdAt), "M월 d일 a h:mm", { locale: ko })}</p></div>
        {canDelete && <button type="button" disabled={deleteReport.isPending} onClick={() => setIsDeleteModalOpen(true)} className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#b56868] shadow-sm transition hover:bg-[#fff5f3] hover:text-[#c95e5e] disabled:opacity-50" aria-label="제보 삭제"><Trash2 size={16} /></button>}
        <button type="button" disabled={thanks.isPending} onClick={() => thanks.mutate()} aria-pressed={item.isThanked} className={`flex shrink-0 items-center justify-center gap-1.5 rounded-[13px] border-2 px-3 py-2 text-xs font-extrabold transition-colors duration-150 disabled:cursor-wait ${item.isThanked ? "border-[#75c4ec] bg-[#e7f6ff] text-[#268fc7]" : "border-[#b9ddf0] bg-white text-[#45ace4]"}`}>
          <Heart size={15} fill={item.isThanked ? "currentColor" : "none"} className="-translate-y-px" /> 감사해요! <span className="font-bold">{formatThanksCount(item.thanksCount)}</span>
        </button>
      </header>

      {item.images.length > 0 && <PhotoCarousel images={item.images} author={author} />}

      <div className="px-5 pt-6">
        <div className="grid grid-cols-3 gap-2">
          <StatusPill icon={<Thermometer size={18} />} value={statusLabel(TEMPERATURE_OPTIONS, item.temperature)} />
          <StatusPill icon={<CloudRain size={18} />} value={statusLabel(PRECIPITATION_OPTIONS, item.precipitation)} />
          <StatusPill icon={<Sun size={18} />} value={statusLabel(SUNLIGHT_OPTIONS, item.sunlight)} />
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-[17px] bg-white p-4 text-[15px] font-medium leading-6 text-[#29495c] shadow-sm shadow-[#b8d6e6]/20">{item.content}</p>
      </div>
      {isDeleteModalOpen && <ReportDeleteConfirmModal isSubmitting={deleteReport.isPending} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => deleteReport.mutate()} />}
    </article>
  );
}

function DetailHeader({ onBack, title }: { onBack: () => void; title?: string }) {
  return <div className="safe-top grid grid-cols-[42px_minmax(0,1fr)_42px] items-center pb-5"><button type="button" onClick={onBack} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button>{title ? <p className="break-keep px-2 text-center text-sm font-extrabold leading-5">{title}</p> : <span className="skeleton mx-auto h-5 w-36 rounded" aria-label="지역명 불러오는 중" />}<span /></div>;
}

function StatusPill({ icon, value }: { icon: ReactNode; value: string }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-[17px] bg-white px-2 py-3 shadow-sm shadow-[#b8d6e6]/20"><span className="text-[#45ace4]" aria-hidden="true">{icon}</span><span className="truncate text-xs font-extrabold text-[#386177]">{value}</span></div>;
}

function PhotoCarousel({ images, author }: { images: string[]; author: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleImages = images.length > 1;

  const updateIndexAfterScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const scroller = scrollRef.current;
      if (!scroller || scroller.clientWidth === 0) return;
      setCurrentIndex(Math.round(scroller.scrollLeft / scroller.clientWidth));
    }, 120);
  };

  const moveTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, images.length - 1));
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: scroller.clientWidth * nextIndex, behavior: "smooth" });
    setCurrentIndex(nextIndex);
  };

  return (
    <div className="relative mx-8 overflow-hidden rounded-[24px] bg-[#eaf2f6]">
      <div ref={scrollRef} onScroll={updateIndexAfterScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((image, index) => <div key={`${image}-${index}`} className="relative aspect-square w-full shrink-0 snap-center"><Image src={image} alt={`${author}의 날씨 사진 ${index + 1}`} fill unoptimized={/^(https?:|blob:|data:)/.test(image)} priority={index === 0} sizes="(max-width: 480px) calc(100vw - 64px), 416px" className="object-cover" /></div>)}
      </div>
      {hasMultipleImages && <>
        <span className="absolute right-4 top-4 rounded-full bg-[#173144]/65 px-2.5 py-1 text-xs font-bold text-white">{currentIndex + 1} / {images.length}</span>
        {currentIndex > 0 && <button type="button" onClick={() => moveTo(currentIndex - 1)} className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#29495c] shadow-md backdrop-blur-sm" aria-label="이전 사진"><ChevronLeft size={21} /></button>}
        {currentIndex < images.length - 1 && <button type="button" onClick={() => moveTo(currentIndex + 1)} className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#29495c] shadow-md backdrop-blur-sm" aria-label="다음 사진"><ChevronRight size={21} /></button>}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-label={`${images.length}장 중 ${currentIndex + 1}번째 사진`}>
          {images.map((_, index) => <button key={index} type="button" onClick={() => moveTo(index)} className={`h-1.5 rounded-full shadow-sm transition-all ${index === currentIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} aria-label={`${index + 1}번째 사진 보기`} />)}
        </div>
      </>}
    </div>
  );
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <article className="min-h-screen pb-28" aria-busy="true" aria-label="날씨 제보 불러오는 중">
      <div className="px-5"><DetailHeader onBack={onBack} /></div>

      <header className="flex items-center gap-3 px-5 pb-5">
        <div className="skeleton size-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton mt-2 h-3 w-28 rounded" />
        </div>
        <div className="skeleton h-9 w-24 shrink-0 rounded-[13px]" />
      </header>

      <div className="skeleton mx-8 aspect-square rounded-[24px]" />

      <div className="px-5 pt-6">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-center gap-1.5 rounded-[17px] bg-white px-2 py-3 shadow-sm shadow-[#b8d6e6]/20">
              <span className="skeleton size-[18px] shrink-0 rounded-md" />
              <span className={`skeleton h-3 rounded ${index === 1 ? "w-14" : "w-11"}`} />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[17px] bg-white p-4 shadow-sm shadow-[#b8d6e6]/20">
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton mt-2.5 h-3.5 w-[88%] rounded" />
          <div className="skeleton mt-2.5 h-3.5 w-[58%] rounded" />
        </div>
      </div>
    </article>
  );
}
