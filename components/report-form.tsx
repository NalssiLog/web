"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, ImagePlus, LoaderCircle, MapPin, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { LocationPicker } from "@/components/location-picker";
import { PhotoSourceSheet } from "@/components/photo-source-sheet";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { weatherApi } from "@/lib/api";
import { PRECIPITATION_OPTIONS, SUGGESTED_MESSAGES, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, getLocationName } from "@/lib/constants";
import { optimizeReportImage } from "@/lib/image";
import { getTextLength, truncateText } from "@/lib/text";
import type { CreateReportInput, Location, PrecipitationStatus, ReportUploadProgress, SunlightStatus, TemperatureStatus } from "@/lib/types";
import { useToastStore } from "@/store/toast-store";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;
const REPORT_DRAFT_KEY = "nalssilog-report-draft";
const REPORT_DRAFT_TTL = 6 * 60 * 60 * 1_000;
const schema = z.object({
  content: z.string().trim().min(1, "날씨 이야기를 한 글자 이상 적어주세요.").max(100, "글은 100자까지 쓸 수 있어요."),
  temperature: z.enum(["COLD", "FRESH", "HOT"], { message: "체감온도를 골라주세요." }),
  precipitation: z.enum(["NONE", "LIGHT", "HEAVY"], { message: "비 상태를 골라주세요." }),
  sunlight: z.enum(["LOW", "MODERATE", "STRONG"], { message: "햇빛 밝기를 골라주세요." }),
  images: z.array(z.custom<File>()).max(3, "사진은 최대 3장까지 올릴 수 있어요."),
});
type ReportFormValues = z.infer<typeof schema>;
const reportDraftSchema = z.object({
  updatedAt: z.number(),
  step: z.union([z.literal(1), z.literal(2)]),
  selectedReportLocation: z.object({
    id: z.string().optional(),
    label: z.string(),
    fullName: z.string().optional(),
    shortName: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).nullable(),
  content: z.string(),
  temperature: z.enum(["COLD", "FRESH", "HOT"]).optional(),
  precipitation: z.enum(["NONE", "LIGHT", "HEAVY"]).optional(),
  sunlight: z.enum(["LOW", "MODERATE", "STRONG"]).optional(),
  hadImages: z.boolean(),
});

function readReportDraft() {
  try {
    const value = window.sessionStorage.getItem(REPORT_DRAFT_KEY);
    if (!value) return null;
    const parsed = reportDraftSchema.safeParse(JSON.parse(value));
    if (!parsed.success || Date.now() - parsed.data.updatedAt > REPORT_DRAFT_TTL) {
      window.sessionStorage.removeItem(REPORT_DRAFT_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeReportDraft(draft: z.infer<typeof reportDraftSchema>) {
  try {
    window.sessionStorage.setItem(REPORT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 저장소가 차단된 인앱브라우저에서는 현재 문서의 폼 상태만 유지한다.
  }
}

function clearReportDraft() {
  try {
    window.sessionStorage.removeItem(REPORT_DRAFT_KEY);
  } catch {
    // 저장소가 차단되어 있으면 제거할 초안도 없다.
  }
}

function normalizeSelectedImage(file: File) {
  if (file.type) return file;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const type = extension === "png"
    ? "image/png"
    : extension === "webp"
      ? "image/webp"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : "";
  return type
    ? new File([file], file.name, { type, lastModified: file.lastModified })
    : file;
}

interface StatusOption<T extends string> { value: T; label: string }

function StatusField<T extends string>({ title, options, value, onChange }: { title: string; options: ReadonlyArray<StatusOption<T>>; value?: T; onChange: (value?: T) => void }) {
  return (
    <fieldset className="mt-8">
      <legend className="text-[17px] font-extrabold">{title} <span className="text-[#45ace4]">*</span></legend>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return <button key={option.value} type="button" onClick={() => onChange(selected ? undefined : option.value)} className={`flex min-h-16 items-center justify-center rounded-[18px] border p-2 transition ${selected ? "border-[#45ace4] bg-[#eaf7ff] text-[#268fc7] ring-2 ring-[#45ace4]/10" : "border-[#e2ecf2] bg-white text-[#526a7a]"}`} aria-pressed={selected}>
            <span className="text-[13px] font-bold">{option.label}</span>
          </button>;
        })}
      </div>
    </fieldset>
  );
}

export function ReportForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReportLocation, setSelectedReportLocation] = useState<Location | null>(null);
  const [fileError, setFileError] = useState("");
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [isPhotoSourceOpen, setIsPhotoSourceOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ReportUploadProgress | null>(null);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const { location, setLocation, isDetecting, detectionError, needsManualInput, setNeedsManualInput, detectLocation } = useCurrentLocation();
  const { register, handleSubmit, control, setValue, reset, resetField, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { content: "", images: [] },
  });
  const content = useWatch({ control, name: "content" });
  const files = useWatch({ control, name: "images" });
  const temperature = useWatch({ control, name: "temperature" });
  const precipitation = useWatch({ control, name: "precipitation" });
  const sunlight = useWatch({ control, name: "sunlight" });
  const contentField = register("content");
  const contentLength = getTextLength(content);
  const reportLocation = selectedReportLocation ?? location;
  const canGoToStory = Boolean(reportLocation && temperature && precipitation && sunlight);
  const canSubmitReport = content.trim().length > 0 && contentLength <= 100;
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => () => uploadControllerRef.current?.abort(), []);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const draft = readReportDraft();
      if (draft) {
        setStep(draft.step);
        setSelectedReportLocation(draft.selectedReportLocation);
        reset({
          content: draft.content,
          images: [],
          temperature: draft.temperature,
          precipitation: draft.precipitation,
          sunlight: draft.sunlight,
        });
        if (draft.hadImages) {
          showToast("작성 내용을 복원했어요. 보안을 위해 사진은 다시 선택해 주세요.", "INFO");
        }
      }
      setIsDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [reset, showToast]);
  useEffect(() => {
    if (!isDraftReady) return;
    const timeout = window.setTimeout(() => {
      writeReportDraft({
        updatedAt: Date.now(),
        step,
        selectedReportLocation,
        content,
        temperature,
        precipitation,
        sunlight,
        hadImages: files.length > 0,
      });
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [content, files.length, isDraftReady, precipitation, selectedReportLocation, step, sunlight, temperature]);
  useEffect(() => {
    const closePhotoSource = () => setIsPhotoSourceOpen(false);
    const closePhotoSourceWhenVisible = () => {
      if (document.visibilityState === "visible") closePhotoSource();
    };
    window.addEventListener("pageshow", closePhotoSource);
    document.addEventListener("visibilitychange", closePhotoSourceWhenVisible);
    return () => {
      window.removeEventListener("pageshow", closePhotoSource);
      document.removeEventListener("visibilitychange", closePhotoSourceWhenVisible);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: (values: ReportFormValues) => {
      const controller = new AbortController();
      uploadControllerRef.current = controller;
      return weatherApi.createReport(
        { ...values, location: reportLocation! } as CreateReportInput,
        { signal: controller.signal, onProgress: setUploadProgress },
      );
    },
    onSuccess: (report) => {
      clearReportDraft();
      queryClient.setQueryData(["weather-report", report.id], report);
      queryClient.invalidateQueries({ queryKey: ["weather-reports"] });
      queryClient.invalidateQueries({ queryKey: ["weather-summary"] });
      queryClient.invalidateQueries({ queryKey: ["my-weather-reports"] });
      showToast("날씨 제보를 올렸어요.", "SUCCESS");
      router.replace(`/reports/${report.id}`);
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast(error instanceof Error ? error.message : "제보를 올리지 못했어요.", "ERROR");
    },
    onSettled: () => {
      uploadControllerRef.current = null;
      setUploadProgress(null);
    },
  });

  const addImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const requested = Array.from(event.target.files ?? []).map(normalizeSelectedImage);
    event.target.value = "";
    const remainingSlots = Math.max(0, 3 - files.length);
    const selected = requested.slice(0, remainingSlots);
    if (requested.length > remainingSlots) {
      showToast(`사진은 최대 3장까지 선택할 수 있어 먼저 선택한 ${remainingSlots}장만 추가해요.`, "INFO");
    }
    if (selected.length === 0) return;
    if (selected.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      setFileError("JPG, PNG, WEBP 파일만 올릴 수 있어요.");
      return;
    }
    if (selected.some((file) => file.size > MAX_SOURCE_IMAGE_SIZE)) {
      setFileError("원본 사진은 한 장당 20MB 이하로 선택해 주세요.");
      return;
    }
    setFileError("");
    setIsOptimizingImages(true);
    try {
      const optimized = await Promise.all(selected.map(optimizeReportImage));
      if (optimized.some((file) => file.size > MAX_IMAGE_SIZE)) {
        setFileError("최적화 후에도 5MB를 넘는 사진이 있어요. 다른 사진을 선택해 주세요.");
        return;
      }
      setValue("images", [...files, ...optimized], { shouldValidate: true });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "사진을 준비하지 못했어요.");
    } finally {
      setIsOptimizingImages(false);
    }
  };

  const submit = handleSubmit((values) => {
    if (!reportLocation) { setNeedsManualInput(true); return; }
    mutation.mutate(values);
  });

  const goToStoryStep = () => {
    if (canGoToStory) setStep(2);
  };

  const uploadLabel = uploadProgress?.stage === "UPLOADING"
    ? "사진을 올리는 중…"
    : uploadProgress?.stage === "CREATING"
      ? "제보를 등록하는 중…"
      : "사진을 준비하는 중…";

  return (
    <form onSubmit={submit} className="page">
      <header className="safe-top pb-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => step === 2 ? setStep(1) : router.back()} className="icon-button" aria-label={step === 2 ? "이전 단계" : "뒤로 가기"}><ArrowLeft size={21} /></button>
          <h1 className="text-lg font-extrabold">지금 날씨 제보하기</h1>
          <span className="w-[42px]" />
        </div>
        <div className="mt-3 flex items-center justify-center" aria-label={`2페이지 중 ${step}페이지`}>
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#45ace4] bg-[#45ace4] text-xs font-extrabold text-white">1</span>
          <span className={`h-0.5 w-9 ${step === 2 ? "bg-[#45ace4]" : "bg-[#cbdce5]"}`} />
          <span className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-extrabold ${step === 2 ? "border-[#45ace4] bg-[#45ace4] text-white" : "border-[#cbdce5] bg-white text-[#8ba0ae]"}`}>2</span>
        </div>
      </header>

      {step === 1 ? <>
        <input type="hidden" {...register("temperature")} />
        <input type="hidden" {...register("precipitation")} />
        <input type="hidden" {...register("sunlight")} />
        <button type="button" onClick={() => setNeedsManualInput(true)} className="flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-sm shadow-[#b8d6e6]/20">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef9ff] text-[#45ace4]"><MapPin size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#718594]">현재 위치</span>{isDetecting && !needsManualInput ? <span className="skeleton mt-1 block h-4 w-40 max-w-full rounded" aria-label="현재 위치 불러오는 중" /> : <span className="block truncate font-extrabold">{reportLocation?.label ?? "위치를 설정해 주세요"}</span>}</span>
        </button>

        <section className="mt-8">
          <h2 className="text-[17px] font-extrabold">사진 <span className="align-middle text-[11px] font-semibold text-[#8ba0ae]">최대 3장</span></h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => {
              const preview = previews[index];
              if (preview) return <div key={`${preview.file.name}-${preview.file.lastModified}`} className="relative aspect-square overflow-hidden rounded-[18px] bg-[#edf4f7]"><Image src={preview.url} alt={`선택한 사진 ${index + 1}`} fill unoptimized className="object-cover" /><button type="button" onClick={() => setValue("images", files.filter((_, fileIndex) => fileIndex !== index), { shouldValidate: true })} className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-[#173144]/75 text-white" aria-label={`사진 ${index + 1} 삭제`}><X size={15} /></button></div>;
              if (index === files.length) return <button key="add-image" type="button" disabled={isOptimizingImages} onClick={() => setIsPhotoSourceOpen(true)} className="flex aspect-square flex-col items-center justify-center rounded-[18px] border border-dashed border-[#bcd3df] bg-white text-[#718594] disabled:cursor-wait disabled:opacity-60">{isOptimizingImages ? <LoaderCircle size={23} className="animate-spin" /> : <ImagePlus size={23} />}<span className="mt-1 text-xs font-bold">{isOptimizingImages ? "최적화 중" : "사진 추가"}</span></button>;
              return <div key={`empty-${index}`} className="aspect-square rounded-[18px] border border-dashed border-[#d9e6ec] bg-white/45" aria-hidden="true" />;
            })}
          </div>
          <input ref={galleryInputRef} type="file" multiple disabled={isOptimizingImages} accept="image/jpeg,image/png,image/webp" onChange={(event) => void addImages(event)} className="hidden" />
          <input ref={cameraInputRef} type="file" capture="environment" disabled={isOptimizingImages} accept="image/*" onChange={(event) => void addImages(event)} className="hidden" />
          {(fileError || errors.images?.message) && <p className="mt-2 text-xs font-semibold text-[#e26060]">{fileError || errors.images?.message}</p>}
        </section>

        <StatusField title="체감온도는 어떤가요?" options={TEMPERATURE_OPTIONS} value={temperature} onChange={(value?: TemperatureStatus) => value ? setValue("temperature", value) : resetField("temperature")} />
        <StatusField title="비가 오고 있나요?" options={PRECIPITATION_OPTIONS} value={precipitation} onChange={(value?: PrecipitationStatus) => value ? setValue("precipitation", value) : resetField("precipitation")} />
        <StatusField title="햇빛의 밝기는 어떤가요?" options={SUNLIGHT_OPTIONS} value={sunlight} onChange={(value?: SunlightStatus) => value ? setValue("sunlight", value) : resetField("sunlight")} />
      </> : <section>
        <div className="flex items-end justify-between"><label htmlFor="content" className="text-[17px] font-extrabold">날씨 이야기 <span className="text-[#45ace4]">*</span></label><span className="text-xs font-bold text-[#8ba0ae]">{contentLength}/100</span></div>
        <textarea id="content" {...contentField} onChange={(event) => { event.target.value = truncateText(event.target.value, 100); contentField.onChange(event); }} maxLength={100} rows={5} placeholder="밖에 나갈 이웃에게 지금 날씨를 알려주세요." className="mt-3 w-full resize-none rounded-[20px] border border-[#dce8ef] bg-white p-4 leading-6 outline-none transition placeholder:text-[#a4b3bd] focus:border-[#45ace4] focus:ring-3 focus:ring-[#45ace4]/10" />
        <div className="mt-3 flex flex-wrap gap-2">{SUGGESTED_MESSAGES.map((message) => <button key={message} type="button" onClick={() => setValue("content", message, { shouldValidate: true })} className="rounded-full border border-[#d9eaf3] bg-white px-3.5 py-2 text-xs font-bold text-[#52768a]">{message}</button>)}</div>
        {mutation.isError && <p className="mt-6 rounded-2xl bg-[#fff3f0] p-4 text-center text-sm font-semibold text-[#b4534a]">{mutation.error instanceof Error ? mutation.error.message : "제보를 올리지 못했어요. 잠시 후 다시 시도해 주세요."}</p>}
      </section>}

      <div className="mobile-fixed">{step === 1 ? <button type="button" disabled={!canGoToStory || isOptimizingImages} onClick={goToStoryStep} className="primary-button">다음 <ChevronRight size={19} /></button> : mutation.isPending ? <div className="w-full rounded-[18px] bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-extrabold text-[#386177]"><LoaderCircle size={16} className="animate-spin text-[#45ace4]" />{uploadLabel}</span><span className="text-xs font-extrabold text-[#268fc7]">{uploadProgress?.percent ?? 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4eff5]"><span className="block h-full rounded-full bg-[#45ace4] transition-[width] duration-200" style={{ width: `${uploadProgress?.percent ?? 0}%` }} /></div></div> : <button type="submit" disabled={!canSubmitReport} className="primary-button">{mutation.isError ? "다시 시도" : "제보 올리기"}</button>}</div>
      <PhotoSourceSheet
        open={isPhotoSourceOpen}
        onClose={() => setIsPhotoSourceOpen(false)}
        onSelectGallery={() => {
          setIsPhotoSourceOpen(false);
          galleryInputRef.current?.click();
        }}
        onTakePhoto={() => {
          setIsPhotoSourceOpen(false);
          cameraInputRef.current?.click();
        }}
      />
      <LocationPicker open={needsManualInput} current={reportLocation} isDetecting={isDetecting} detectionError={detectionError} required={false} onClose={() => setNeedsManualInput(false)} onDetect={detectLocation} onSelect={(next) => { setSelectedReportLocation(next); setLocation(next); setNeedsManualInput(false); showToast(`${getLocationName(next, "full")}으로 위치를 설정했어요.`, "INFO"); }} />
    </form>
  );
}
