"use client";

import { useMutation, useQuery, useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import { ArrowLeft, CloudRain, Heart, Sun, Thermometer, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode, type UIEvent } from "react";
import { ErrorState } from "@/components/error-state";
import { ReportDeleteConfirmModal, type ModalDismiss } from "@/components/report-delete-confirm-modal";
import { weatherApi } from "@/lib/api";
import { ApiError } from "@/lib/api/http-client";
import { PRECIPITATION_OPTIONS, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, formatThanksCount, getLocationName, statusLabel } from "@/lib/constants";
import { formatReportDateTime } from "@/lib/date";
import type { ReportPage, ThanksState, WeatherReport, WeatherStatus } from "@/lib/types";
import { getWeatherStatusTone } from "@/lib/weather-status-tone";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";
import { useLocationStore } from "@/store/location-store";

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
  const setLocation = useLocationStore((state) => state.setLocation);
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
  const deleteReport = useMutation<void, Error, ModalDismiss>({
    mutationFn: () => weatherApi.deleteReport(id),
    onSuccess: (_result, dismissModal) => {
      queryClient.setQueriesData<InfiniteData<ReportPage>>(
        { predicate: (query) => isReportListQuery(query.queryKey) },
        (data) => removeReportFromPages(data, id),
      );
      void queryClient.invalidateQueries({ queryKey: ["weather-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["weather-reports"] });
      showToast("날씨 제보를 삭제했어요.", "SUCCESS");
      dismissModal(() => {
        router.back();
        window.setTimeout(() => {
          queryClient.removeQueries({ queryKey: ["weather-report", id], exact: true });
        }, 100);
      });
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
    <article className="min-h-screen pb-8">
      <div className="px-5"><DetailHeader onBack={() => router.back()} title={getLocationName(item.location, "full")} onTitleClick={() => { setLocation(item.location); router.push("/"); }} /></div>
      <header className="flex items-center gap-3 px-5 pb-5">
        {authorHref ? <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href={authorHref} className="shrink-0 rounded-full transition-opacity hover:opacity-80" aria-label={`${author}의 프로필로 이동`}>
            <span className="flex size-11 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm shadow-[#b8d6e6]/20" style={item.author.type === "MEMBER" && item.author.avatarUrl ? { backgroundImage: `url(${item.author.avatarUrl})` } : undefined} aria-hidden="true">{item.author.type === "MEMBER" && !item.author.avatarUrl ? <UserRound size={21} /> : null}</span>
          </Link>
          <Link href={authorHref} className="min-w-0 rounded-lg transition-colors hover:text-[#268fc7]" aria-label={`${author}의 프로필로 이동`}>
            <span className="block truncate font-extrabold">{author}</span><span className="mt-0.5 block text-xs font-semibold text-[#718594]">{formatReportDateTime(item.createdAt)}</span>
          </Link>
        </div> : <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#45ace4] shadow-sm shadow-[#b8d6e6]/20" aria-hidden="true">☁️</span>
          <span className="min-w-0"><span className="block truncate font-extrabold">{author}</span><span className="mt-0.5 block text-xs font-semibold text-[#718594]">{formatReportDateTime(item.createdAt)}</span></span>
        </div>}
        <button type="button" disabled={thanks.isPending} onClick={() => thanks.mutate()} aria-pressed={item.isThanked} aria-label={`감사해요 ${formatThanksCount(item.thanksCount)}개`} className={`flex shrink-0 items-center justify-center gap-1.5 rounded-[13px] border-2 px-3 py-2 text-xs font-extrabold transition-colors duration-150 disabled:cursor-wait ${item.isThanked ? "border-[#75c4ec] bg-[#e7f6ff] text-[#268fc7]" : "border-[#b9ddf0] text-[#45ace4]"}`}>
          <Heart size={17} fill={item.isThanked ? "currentColor" : "none"} className="-translate-y-px" /><span className="font-bold">{formatThanksCount(item.thanksCount)}</span>
        </button>
      </header>

      {item.images.length > 0 && <PhotoCarousel images={item.images} author={author} />}

      <div className="px-5 pt-6">
        <div className="grid grid-cols-3 gap-2">
          <StatusPill status={item.temperature} icon={<Thermometer size={18} />} value={statusLabel(TEMPERATURE_OPTIONS, item.temperature)} />
          <StatusPill status={item.precipitation} icon={<CloudRain size={18} />} value={statusLabel(PRECIPITATION_OPTIONS, item.precipitation)} />
          <StatusPill status={item.sunlight} icon={<Sun size={18} />} value={statusLabel(SUNLIGHT_OPTIONS, item.sunlight)} />
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-[17px] border-2 border-[#d2e3ec] p-4 text-[15px] font-medium leading-6 text-[#29495c]">{item.content}</p>
        {canDelete && <div className="mt-3 flex justify-end"><button type="button" disabled={deleteReport.isPending} onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-[#b56868] transition hover:bg-[#fff5f3] hover:text-[#c95e5e] disabled:opacity-50"><Trash2 size={15} /> 제보 삭제</button></div>}
      </div>
      {isDeleteModalOpen && <ReportDeleteConfirmModal isSubmitting={deleteReport.isPending} onClose={() => setIsDeleteModalOpen(false)} onConfirm={(dismissModal) => deleteReport.mutate(dismissModal)} />}
    </article>
  );
}

function DetailHeader({ onBack, title, onTitleClick }: { onBack: () => void; title?: string; onTitleClick?: () => void }) {
  return <div className="safe-top spacious-page-header grid grid-cols-[36px_minmax(0,1fr)_36px] items-center pb-2"><button type="button" onClick={onBack} className="header-back-button" aria-label="뒤로 가기"><ArrowLeft size={18} /></button>{title ? onTitleClick ? <button type="button" onClick={onTitleClick} className="w-fit max-w-full justify-self-center break-keep text-center text-base leading-5 transition-colors hover:text-[#268fc7]" aria-label={`${title} 날씨 홈으로 이동`}><span className="font-extrabold">{title}</span></button> : <p className="break-keep px-2 text-center text-base font-extrabold leading-5">{title}</p> : <span className="skeleton mx-auto h-5 w-36 rounded" aria-label="지역명 불러오는 중" />}<span /></div>;
}

function StatusPill({ status, icon, value }: { status: WeatherStatus; icon: ReactNode; value: string }) {
  return <div className={`flex items-center justify-center gap-1.5 rounded-[17px] border-2 px-2 py-3 ${getWeatherStatusTone(status).detail}`}><span aria-hidden="true">{icon}</span><span className="truncate text-xs font-extrabold">{value}</span></div>;
}

function PhotoCarousel({ images, author }: { images: string[]; author: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleImages = images.length > 1;

  const updateIndexDuringScroll = (event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    if (scroller.clientWidth === 0) return;
    const nextIndex = Math.max(
      0,
      Math.min(images.length - 1, Math.round(scroller.scrollLeft / scroller.clientWidth)),
    );
    setCurrentIndex((previousIndex) => previousIndex === nextIndex ? previousIndex : nextIndex);
  };

  return (
    <div className="relative mx-8 overflow-hidden rounded-[24px] border border-[#d2e3ec]">
      <div
        onScroll={updateIndexDuringScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${author}의 날씨 사진`}
        tabIndex={hasMultipleImages ? 0 : undefined}
      >
        {images.map((image, index) => <div key={`${image}-${index}`} className="relative aspect-square w-full shrink-0 snap-center"><Image src={image} alt={`${author}의 날씨 사진 ${index + 1}`} fill unoptimized={/^(https?:|blob:|data:)/.test(image)} priority={index === 0} sizes="(max-width: 480px) calc(100vw - 64px), 416px" className="object-cover" /></div>)}
      </div>
      {hasMultipleImages && <span className="absolute right-4 top-4 rounded-full bg-[#173144]/65 px-2.5 py-1 text-xs font-bold text-white" aria-live="polite">{currentIndex + 1} / {images.length}</span>}
    </div>
  );
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <article className="min-h-screen pb-8" aria-busy="true" aria-label="날씨 제보 불러오는 중">
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
            <div key={index} className="flex items-center justify-center gap-1.5 rounded-[17px] border-2 border-[#d2e3ec] px-2 py-3">
              <span className="skeleton size-[18px] shrink-0 rounded-md" />
              <span className={`skeleton h-3 rounded ${index === 1 ? "w-14" : "w-11"}`} />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[17px] border-2 border-[#d2e3ec] p-4">
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton mt-2.5 h-3.5 w-[88%] rounded" />
          <div className="skeleton mt-2.5 h-3.5 w-[58%] rounded" />
        </div>
      </div>
    </article>
  );
}
