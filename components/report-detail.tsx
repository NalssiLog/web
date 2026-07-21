"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight, CloudRain, Heart, Sun, Thermometer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { ErrorState } from "@/components/error-state";
import { weatherApi } from "@/lib/api";
import { PRECIPITATION_OPTIONS, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, formatThanksCount, statusLabel } from "@/lib/constants";
import type { WeatherReport } from "@/lib/types";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useAuthStore((state) => state.user);
  const report = useQuery({ queryKey: ["weather-report", id], queryFn: () => weatherApi.getReport(id) });
  const thanks = useMutation<WeatherReport, Error, void, { previous?: WeatherReport }>({
    mutationFn: () => weatherApi.toggleThanks(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["weather-report", id] });
      const previous = queryClient.getQueryData<WeatherReport>(["weather-report", id]);
      if (previous) {
        const isThanked = !previous.isThanked;
        queryClient.setQueryData<WeatherReport>(["weather-report", id], {
          ...previous,
          isThanked,
          thanksCount: Math.max(0, previous.thanksCount + (isThanked ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["weather-report", id], context.previous);
      showToast("감사를 반영하지 못했어요.", "ERROR");
    },
    onSuccess: (updated) => queryClient.setQueryData(["weather-report", id], updated),
  });

  if (report.isLoading) return <DetailSkeleton onBack={() => router.back()} />;
  if (report.isError || !report.data) return <div className="page"><DetailHeader onBack={() => router.back()} /><ErrorState message={report.error instanceof Error ? report.error.message : undefined} onRetry={() => report.refetch()} /></div>;
  const item = report.data;
  const author = item.author.type === "ANONYMOUS" ? "익명의 이웃" : item.author.nickname;
  const authorHref = item.author.type === "MEMBER"
    ? currentUser.type === "MEMBER" && currentUser.id === item.author.id
      ? "/mypage"
      : `/users/${item.author.id}`
    : null;

  return (
    <article className="min-h-screen pb-28">
      <div className="px-5"><DetailHeader onBack={() => router.back()} /></div>
      <header className="flex items-center gap-3 px-5 pb-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm shadow-[#b8d6e6]/20" aria-hidden="true">{item.author.type === "ANONYMOUS" ? "☁️" : "🌤️"}</span>
        <div className="min-w-0 flex-1">{authorHref ? <Link href={authorHref} className="font-extrabold transition-colors hover:text-[#268fc7]">{author}</Link> : <p className="font-extrabold">{author}</p>}<p className="mt-0.5 text-xs font-semibold text-[#718594]">{format(new Date(item.createdAt), "M월 d일 a h:mm", { locale: ko })}</p></div>
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
    </article>
  );
}

function DetailHeader({ onBack }: { onBack: () => void }) {
  return <div className="safe-top flex items-center justify-between pb-5"><button type="button" onClick={onBack} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button><p className="font-extrabold">날씨 제보</p><span className="w-[42px]" /></div>;
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
        {images.map((image, index) => <div key={`${image}-${index}`} className="relative aspect-square w-full shrink-0 snap-center"><Image src={image} alt={`${author}의 날씨 사진 ${index + 1}`} fill unoptimized={image.startsWith("blob:")} priority={index === 0} sizes="(max-width: 480px) calc(100vw - 64px), 416px" className="object-cover" /></div>)}
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
  return <div className="min-h-screen"><div className="px-5"><DetailHeader onBack={onBack} /><div className="mb-5 flex items-center gap-3"><div className="skeleton size-11 rounded-full" /><div><div className="skeleton mb-2 h-4 w-24 rounded" /><div className="skeleton h-3 w-28 rounded" /></div></div><div className="skeleton mx-3 aspect-square w-[calc(100%-1.5rem)] rounded-[24px]" /></div><div className="px-5 pt-6"><div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-[17px]" />)}</div><div className="skeleton mt-3 h-20 rounded-[17px]" /><div className="skeleton mt-4 h-10 w-32 rounded-[14px]" /></div></div>;
}
