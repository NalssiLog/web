"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronRight, ImagePlus, LoaderCircle, MapPin, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { LocationDetectingIndicator } from "@/components/location-detecting-indicator";
import { LocationPicker } from "@/components/location-picker";
import { PhotoSourceSheet } from "@/components/photo-source-sheet";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { useModalNavigation } from "@/hooks/use-modal-navigation";
import { weatherApi } from "@/lib/api";
import { PRECIPITATION_OPTIONS, SUGGESTED_MESSAGES, SUNLIGHT_OPTIONS, TEMPERATURE_OPTIONS, getLocationName } from "@/lib/constants";
import { normalizeSelectedImage, optimizeReportImage } from "@/lib/image";
import { CURRENT_PRIVACY_TERMS_VERSION, CURRENT_SERVICE_TERMS_VERSION, createRequiredReportAgreements } from "@/lib/legal";
import { getTextLength, truncateText } from "@/lib/text";
import type { CreateReportInput, Location, PrecipitationStatus, ReportUploadProgress, SunlightStatus, TemperatureStatus, WeatherStatus } from "@/lib/types";
import { getWeatherStatusTone } from "@/lib/weather-status-tone";
import { useAuthStore } from "@/store/auth-store";
import { useLegalModalStore } from "@/store/legal-modal-store";
import { useToastStore } from "@/store/toast-store";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;
const schema = z.object({
  content: z.string().trim().min(1, "날씨 이야기를 한 글자 이상 적어주세요.").max(100, "글은 100자까지 쓸 수 있어요."),
  temperature: z.enum(["COLD", "FRESH", "HOT"], { message: "체감온도를 골라주세요." }),
  precipitation: z.enum(["NONE", "LIGHT", "HEAVY"], { message: "비 상태를 골라주세요." }),
  sunlight: z.enum(["LOW", "MODERATE", "STRONG"], { message: "햇빛 밝기를 골라주세요." }),
  images: z.array(z.custom<File>()).max(3, "사진은 최대 3장까지 올릴 수 있어요."),
});
type ReportFormValues = z.infer<typeof schema>;

interface StatusOption<T extends WeatherStatus> { value: T; label: string }

function StatusField<T extends WeatherStatus>({ title, options, value, onChange }: { title: string; options: ReadonlyArray<StatusOption<T>>; value?: T; onChange: (value?: T) => void }) {
  return (
    <fieldset className="mt-6">
      <legend className="text-[17px] font-extrabold">{title} <span className="text-[#45ace4]">*</span></legend>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return <button key={option.value} type="button" onClick={() => onChange(selected ? undefined : option.value)} className={`flex min-h-14 items-center justify-center rounded-[18px] border-2 p-2 transition ${selected ? getWeatherStatusTone(option.value).selected : "border-[#d2e3ec] text-[#526a7a]"}`} aria-pressed={selected}>
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
  const submitLockRef = useRef(false);
  const previewUrlsRef = useRef(new Map<File, string>());
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReportLocation, setSelectedReportLocation] = useState<Location | null>(null);
  const [fileError, setFileError] = useState("");
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [isPhotoSourceOpen, setIsPhotoSourceOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ReportUploadProgress | null>(null);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [serviceTermsAgreed, setServiceTermsAgreed] = useState(false);
  const [privacyTermsAgreed, setPrivacyTermsAgreed] = useState(false);
  const userType = useAuthStore((state) => state.user.type);
  const hasCheckedServerSession = useAuthStore((state) => state.hasCheckedServerSession);
  const openLegalDocument = useLegalModalStore((state) => state.openLegalDocument);
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
  const requiresGuestAgreement = hasCheckedServerSession && userType === "ANONYMOUS";
  const hasRequiredGuestAgreement = serviceTermsAgreed && privacyTermsAgreed;
  const canGoToStory = Boolean(reportLocation && temperature && precipitation && sunlight);
  const canSubmitReport = hasCheckedServerSession
    && content.trim().length > 0
    && contentLength <= 100
    && (!requiresGuestAgreement || hasRequiredGuestAgreement);
  useEffect(() => {
    const activeFiles = new Set(files);
    previewUrlsRef.current.forEach((url, file) => {
      if (activeFiles.has(file)) return;
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(file);
    });
    setPreviews(files.map((file) => {
      const existingUrl = previewUrlsRef.current.get(file);
      if (existingUrl) return { file, url: existingUrl };
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.set(file, url);
      return { file, url };
    }));
  }, [files]);
  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);
  useEffect(() => () => uploadControllerRef.current?.abort(), []);
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
      if (!hasCheckedServerSession) throw new Error("로그인 상태를 확인하고 있어요.");
      if (requiresGuestAgreement && !hasRequiredGuestAgreement) {
        throw new Error("필수 약관에 모두 동의해야 합니다.");
      }
      const controller = new AbortController();
      uploadControllerRef.current = controller;
      return weatherApi.createReport(
        {
          ...values,
          location: reportLocation!,
          agreedTerms: requiresGuestAgreement ? createRequiredReportAgreements() : undefined,
        } as CreateReportInput,
        { signal: controller.signal, onProgress: setUploadProgress },
      );
    },
    onSuccess: (report) => {
      queryClient.setQueryData(["weather-report", report.id], report);
      queryClient.invalidateQueries({ queryKey: ["weather-reports"] });
      queryClient.invalidateQueries({ queryKey: ["weather-summary"] });
      queryClient.invalidateQueries({ queryKey: ["my-weather-reports"] });
      showToast("날씨 제보를 올렸어요.", "SUCCESS");
      dismissStoryStep(() => {
        setLocation(report.location);
        router.replace("/");
      });
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast(error instanceof Error ? error.message : "제보를 올리지 못했어요.", "ERROR");
    },
    onSettled: () => {
      submitLockRef.current = false;
      uploadControllerRef.current = null;
      setUploadProgress(null);
    },
  });

  const dismissStoryStep = useModalNavigation({
    open: step === 2,
    onBack: () => {
      if (mutation.isPending) {
        showToast("제보를 등록하는 동안에는 화면을 이동할 수 없어요.", "INFO");
        return;
      }
      setStep(1);
    },
    onDismiss: () => setStep(1),
  });

  useEffect(() => {
    const resetFormBeforeHistoryExit = () => {
      if (mutation.isPending) return;
      // 2단계는 같은 페이지에 올린 history 항목으로 동작한다.
      // 해당 항목을 닫는 뒤로가기는 작성 화면 이탈이 아니므로 현재 입력을 유지한다.
      if (step === 2) return;
      flushSync(() => {
        setStep(1);
        setSelectedReportLocation(null);
        setServiceTermsAgreed(false);
        setPrivacyTermsAgreed(false);
        reset({ content: "", images: [] });
      });
    };
    const resetStepAfterPageRestore = (event: PageTransitionEvent) => {
      if (event.persisted && !mutation.isPending) setStep(1);
    };

    window.addEventListener("popstate", resetFormBeforeHistoryExit);
    window.addEventListener("pageshow", resetStepAfterPageRestore);
    return () => {
      window.removeEventListener("popstate", resetFormBeforeHistoryExit);
      window.removeEventListener("pageshow", resetStepAfterPageRestore);
    };
  }, [mutation.isPending, reset, step]);

  useEffect(() => {
    if (!mutation.isPending) return;

    const preventPageExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", preventPageExit);
    return () => {
      window.removeEventListener("beforeunload", preventPageExit);
    };
  }, [mutation.isPending]);

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
      const optimized: File[] = [];
      for (const file of selected) {
        optimized.push(await optimizeReportImage(file));
      }
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportLocation) { setNeedsManualInput(true); return; }
    if (!hasCheckedServerSession || (requiresGuestAgreement && !hasRequiredGuestAgreement)) return;
    if (submitLockRef.current || mutation.isPending) return;
    submitLockRef.current = true;
    let mutationStarted = false;
    void handleSubmit((values) => {
      mutationStarted = true;
      mutation.mutate(values);
    })(event).finally(() => {
      if (!mutationStarted) submitLockRef.current = false;
    });
  };

  const goToStoryStep = () => {
    if (!canGoToStory) return;
    setStep(2);
  };

  const uploadLabel = uploadProgress?.stage === "UPLOADING"
    ? "사진을 올리는 중…"
    : uploadProgress?.stage === "CREATING"
      ? "제보를 등록하는 중…"
      : "사진을 준비하는 중…";

  return (
    <form onSubmit={submit} className="page" aria-busy={mutation.isPending}>
      <header className="safe-top pb-2">
        <div className="grid min-h-9 grid-cols-[36px_1fr_36px] items-center">
          <button type="button" disabled={mutation.isPending} onClick={() => step === 2 ? dismissStoryStep() : router.back()} className="header-back-button justify-self-start disabled:cursor-not-allowed disabled:opacity-50" aria-label={step === 2 ? "이전 단계" : "뒤로 가기"}><ArrowLeft size={18} /></button>
          <h1 className="text-center text-lg font-extrabold">날씨 제보하기</h1>
          <span />
        </div>
        <div className="mt-3 flex items-center justify-center" aria-label={`2페이지 중 ${step}페이지`}>
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#45ace4] bg-[#45ace4] text-xs font-extrabold text-white">1</span>
          <span className={`h-0.5 w-9 ${step === 2 ? "bg-[#45ace4]" : "bg-[#cbdce5]"}`} />
          <span className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-extrabold ${step === 2 ? "border-[#45ace4] bg-[#45ace4] text-white" : "border-[#cbdce5] text-[#8ba0ae]"}`}>2</span>
        </div>
      </header>

      {step === 1 ? <>
        <input type="hidden" {...register("temperature")} />
        <input type="hidden" {...register("precipitation")} />
        <input type="hidden" {...register("sunlight")} />
        <button type="button" onClick={() => setNeedsManualInput(true)} className="mt-1 flex w-full items-center gap-3 rounded-[20px] border-2 border-[#d2e3ec] p-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef9ff] text-[#45ace4]"><MapPin size={18} /></span>
          <span className="min-w-0 flex-1">{isDetecting && !needsManualInput ? <LocationDetectingIndicator iconPosition="right" /> : <span className="block truncate text-base font-extrabold">{reportLocation?.label ?? "위치를 설정해 주세요"}</span>}</span>
        </button>

        <section className="mt-5">
          <h2 className="text-[17px] font-extrabold">사진 <span className="align-middle text-[11px] font-semibold text-[#8ba0ae]">최대 3장</span></h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => {
              const preview = previews[index];
              if (preview) return <div key={`${preview.file.name}-${preview.file.lastModified}`} className="relative aspect-square overflow-hidden rounded-[18px] border border-[#d2e3ec]"><Image src={preview.url} alt={`선택한 사진 ${index + 1}`} fill unoptimized className="object-cover" /><button type="button" onClick={() => setValue("images", files.filter((_, fileIndex) => fileIndex !== index), { shouldValidate: true })} className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-[#173144]/75 text-white" aria-label={`사진 ${index + 1} 삭제`}><X size={15} /></button></div>;
              if (index === files.length) return <button key="add-image" type="button" disabled={isOptimizingImages} onClick={() => setIsPhotoSourceOpen(true)} className="flex aspect-square flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-[#bcd3df] text-[#718594] disabled:cursor-wait disabled:opacity-60">{isOptimizingImages ? <LoaderCircle size={23} className="animate-spin" /> : <ImagePlus size={23} />}<span className="mt-1 text-xs font-bold">{isOptimizingImages ? "최적화 중" : "사진 추가"}</span></button>;
              return <div key={`empty-${index}`} className="aspect-square rounded-[18px] border-2 border-dashed border-[#d9e6ec]" aria-hidden="true" />;
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
        <textarea id="content" {...contentField} onChange={(event) => { event.target.value = truncateText(event.target.value, 100); contentField.onChange(event); }} maxLength={100} rows={5} placeholder="밖에 나갈 이웃에게 지금 날씨를 알려주세요." className="mt-3 w-full resize-none rounded-[20px] border-2 border-[#d2e3ec] bg-transparent p-4 leading-6 outline-none transition placeholder:text-[#a4b3bd] focus:border-[#45ace4] focus:ring-3 focus:ring-[#45ace4]/10" />
        <div className="mt-3 flex flex-wrap gap-2">{SUGGESTED_MESSAGES.map((message) => <button key={message} type="button" onClick={() => setValue("content", message, { shouldValidate: true })} className="rounded-full border-2 border-[#d2e3ec] px-3.5 py-2 text-xs font-bold text-[#52768a]">{message}</button>)}</div>
        {requiresGuestAgreement && <section className="mt-5 overflow-hidden rounded-[20px] border-2 border-[#d2e3ec]" aria-labelledby="guest-report-agreement-title">
          <div className="px-4 pb-3 pt-4">
            <h2 id="guest-report-agreement-title" className="text-sm font-extrabold">비회원 제보 필수 동의</h2>
            <p className="mt-1 text-xs font-semibold text-[#718594]">제보를 올리기 전에 아래 약관을 확인해 주세요.</p>
          </div>
          <div className="flex items-center gap-3 border-t-2 border-[#dcecf4] px-4 py-3.5 text-sm font-bold">
            <label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={serviceTermsAgreed} onChange={(event) => setServiceTermsAgreed(event.target.checked)} className="peer sr-only" />
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#8dd3f7] peer-focus-visible:ring-offset-2 ${serviceTermsAgreed ? "border-[#45ace4] bg-[#45ace4] text-white" : "border-[#c8d8e1] text-transparent group-hover:border-[#45ace4]"}`} aria-hidden="true">{serviceTermsAgreed && <Check size={14} strokeWidth={3} />}</span>
              <span className="min-w-0"><span className="mr-1 text-[#238fc9]">[필수]</span>서비스 이용약관 동의 <span className="text-xs text-[#718594]">v{CURRENT_SERVICE_TERMS_VERSION}</span></span>
            </label>
            <button type="button" onClick={() => openLegalDocument("TERMS")} className="shrink-0 text-xs font-extrabold text-[#718594] underline underline-offset-2">보기</button>
          </div>
          <div className="flex items-center gap-3 border-t-2 border-[#dcecf4] px-4 py-3.5 text-sm font-bold">
            <label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={privacyTermsAgreed} onChange={(event) => setPrivacyTermsAgreed(event.target.checked)} className="peer sr-only" />
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#8dd3f7] peer-focus-visible:ring-offset-2 ${privacyTermsAgreed ? "border-[#45ace4] bg-[#45ace4] text-white" : "border-[#c8d8e1] text-transparent group-hover:border-[#45ace4]"}`} aria-hidden="true">{privacyTermsAgreed && <Check size={14} strokeWidth={3} />}</span>
              <span className="min-w-0"><span className="mr-1 text-[#238fc9]">[필수]</span>개인정보처리방침 동의 <span className="text-xs text-[#718594]">v{CURRENT_PRIVACY_TERMS_VERSION}</span></span>
            </label>
            <button type="button" onClick={() => openLegalDocument("PRIVACY")} className="shrink-0 text-xs font-extrabold text-[#718594] underline underline-offset-2">보기</button>
          </div>
        </section>}
        {mutation.isError && <p className="mt-6 rounded-2xl bg-[#fff3f0] p-4 text-center text-sm font-semibold text-[#b4534a]">{mutation.error instanceof Error ? mutation.error.message : "제보를 올리지 못했어요. 잠시 후 다시 시도해 주세요."}</p>}
      </section>}

      <div className="mobile-fixed">{step === 1 ? <button type="button" disabled={!canGoToStory || isOptimizingImages} onClick={goToStoryStep} className="primary-button">다음 <ChevronRight size={19} /></button> : mutation.isPending ? <div className="w-full rounded-[18px] border-2 border-[#d2e3ec] p-3"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-extrabold text-[#386177]"><LoaderCircle size={16} className="animate-spin text-[#45ace4]" />{uploadLabel}</span><span className="text-xs font-extrabold text-[#268fc7]">{uploadProgress?.percent ?? 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4eff5]"><span className="block h-full rounded-full bg-[#45ace4] transition-[width] duration-200" style={{ width: `${uploadProgress?.percent ?? 0}%` }} /></div></div> : <button type="submit" disabled={!canSubmitReport} className="primary-button">{mutation.isError ? "다시 시도" : "제보 올리기"}</button>}</div>
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
