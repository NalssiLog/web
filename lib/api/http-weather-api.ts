import { resolveProfileImage } from "@/lib/constants";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api/http-client";
import { locationApi, normalizeLocation, type LocationResponse } from "@/lib/api/location-api";
import type { WeatherApi } from "@/lib/api/weather-api";
import type {
  CreateReportOptions,
  Location,
  MemberProfile,
  PrecipitationStatus,
  ReportPage,
  SunlightStatus,
  TemperatureStatus,
  WeatherReport,
} from "@/lib/types";

interface BackendReport {
  id: string;
  location: LocationResponse;
  author: {
    type: "ANONYMOUS" | "MEMBER";
    id: string | null;
    nickname: string;
    profileImageUrl?: string | null;
    avatar?: { type: string; value: string | null } | null;
  };
  temperature: TemperatureStatus;
  precipitation: PrecipitationStatus;
  sunlight: SunlightStatus;
  comment: string;
  imageUrls: string[];
  thanksCount: number;
  isThanked: boolean;
  createdAt: string;
}

interface BackendReportPage {
  items: BackendReport[];
  nextCursor: string | null;
}

interface BackendStats {
  reportCount: number;
  temperature: { dominant: TemperatureStatus | null };
  precipitation: { dominant: PrecipitationStatus | null };
  sunlight: { dominant: SunlightStatus | null };
}

interface PresignResponse {
  uploads: Array<{
    storageKey: string;
    uploadUrl: string;
    contentType: string;
    size: number;
  }>;
}

interface BackendMemberProfile {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
  avatar?: { type: string; value: string | null };
}

function isDisplayableImage(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:") || value.startsWith("data:");
}

function normalizeReport(report: BackendReport): WeatherReport {
  const author = report.author.type === "MEMBER" && report.author.id
    ? {
        type: "MEMBER" as const,
        id: report.author.id,
        nickname: report.author.nickname,
        avatarUrl: resolveProfileImage(report.author.profileImageUrl ?? report.author.avatar?.value),
      }
    : { type: "ANONYMOUS" as const, nickname: report.author.nickname };

  return {
    id: report.id,
    location: normalizeLocation(report.location),
    images: report.imageUrls.filter(isDisplayableImage),
    content: report.comment,
    temperature: report.temperature,
    precipitation: report.precipitation,
    sunlight: report.sunlight,
    author,
    createdAt: report.createdAt,
    thanksCount: report.thanksCount,
    isThanked: report.isThanked,
  };
}

async function resolveBackendLocation(location: Location) {
  if (location.id && /^\d+$/.test(location.id)) return location;
  const candidates = await locationApi.search(location.fullName ?? location.label);
  return candidates.find((candidate) =>
    candidate.fullName === location.fullName || candidate.label === location.label,
  ) ?? candidates[0] ?? location;
}

function reportQuery(path: string, cursor?: string) {
  if (!cursor) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cursor=${encodeURIComponent(cursor)}`;
}

async function getReportPage(path: string, cursor?: string): Promise<ReportPage> {
  const page = await apiRequest<BackendReportPage>(reportQuery(path, cursor));
  return {
    reports: page.items.map(normalizeReport),
    nextCursor: page.nextCursor ?? undefined,
  };
}

function abortError() {
  return new DOMException("사진 업로드를 취소했어요.", "AbortError");
}

function putImage(
  uploadUrl: string,
  file: File,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const request = new XMLHttpRequest();
    const cleanup = () => signal?.removeEventListener("abort", handleAbort);
    const handleAbort = () => request.abort();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        onProgress(file.size);
        resolve();
      } else {
        reject(new ApiError(request.status, "IMAGE_UPLOAD_FAILED", "사진을 업로드하지 못했어요."));
      }
    };
    request.onerror = () => {
      cleanup();
      reject(new ApiError(0, "IMAGE_UPLOAD_FAILED", "사진 업로드 서버에 연결하지 못했어요."));
    };
    request.onabort = () => {
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    request.send(file);
  });
}

async function putImageWithRetry(
  uploadUrl: string,
  file: File,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number) => void,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (attempt > 0) onProgress(0);
      await putImage(uploadUrl, file, signal, onProgress);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      if (attempt === 1) throw error;
    }
  }
}

async function uploadReportImages(files: File[], options: CreateReportOptions) {
  if (files.length === 0) return [];
  options.onProgress?.({ stage: "PREPARING", percent: 5 });
  const presigned = await jsonRequest<PresignResponse>("/api/reports/images/presign", "POST", {
    images: files.map((file) => ({ contentType: file.type, size: file.size })),
  }, { signal: options.signal });

  if (presigned.uploads.length !== files.length) {
    throw new ApiError(0, "IMAGE_UPLOAD_FAILED", "사진 업로드 정보를 확인하지 못했어요.");
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const loadedBytes = files.map(() => 0);
  const updateProgress = (index: number, loaded: number) => {
    loadedBytes[index] = Math.min(files[index].size, loaded);
    const uploadedBytes = loadedBytes.reduce((total, value) => total + value, 0);
    options.onProgress?.({
      stage: "UPLOADING",
      percent: Math.min(90, 10 + Math.round((uploadedBytes / totalBytes) * 80)),
    });
  };
  options.onProgress?.({ stage: "UPLOADING", percent: 10 });
  await Promise.all(presigned.uploads.map((upload, index) =>
    putImageWithRetry(upload.uploadUrl, files[index], options.signal, (loaded) => updateProgress(index, loaded)),
  ));

  return presigned.uploads.map((upload) => upload.storageKey);
}

export const httpWeatherApi: WeatherApi = {
  async getSummary(location) {
    const resolvedLocation = await resolveBackendLocation(location);
    if (!resolvedLocation.id) throw new ApiError(400, "LOCATION_NOT_FOUND", "선택한 동네를 찾지 못했어요.");
    const stats = await apiRequest<BackendStats>(`/api/reports/stats?locationId=${encodeURIComponent(resolvedLocation.id)}`);
    return {
      temperature: stats.temperature.dominant,
      precipitation: stats.precipitation.dominant,
      sunlight: stats.sunlight.dominant,
      recentReportCount: stats.reportCount,
    };
  },

  async getReports(location, cursor) {
    const resolvedLocation = await resolveBackendLocation(location);
    if (!resolvedLocation.id) throw new ApiError(400, "LOCATION_NOT_FOUND", "선택한 동네를 찾지 못했어요.");
    return getReportPage(`/api/reports?locationId=${encodeURIComponent(resolvedLocation.id)}`, cursor);
  },

  getMyReports: (cursor) => getReportPage("/api/reports/me", cursor),

  async getMemberProfile(id) {
    const profile = await apiRequest<BackendMemberProfile>(`/api/members/${encodeURIComponent(id)}`);
    const normalized: MemberProfile = {
      id: profile.id,
      nickname: profile.nickname,
      avatarUrl: resolveProfileImage(profile.profileImageUrl ?? profile.avatar?.value),
    };
    return normalized;
  },

  getMemberReports: (id, cursor) =>
    getReportPage(`/api/reports/members/${encodeURIComponent(id)}`, cursor),

  async getReport(id) {
    return normalizeReport(await apiRequest<BackendReport>(`/api/reports/${encodeURIComponent(id)}`));
  },

  async createReport(input, options = {}) {
    options.onProgress?.({ stage: "PREPARING", percent: 0 });
    const location = await resolveBackendLocation(input.location);
    if (!location.id) throw new ApiError(400, "LOCATION_NOT_FOUND", "선택한 동네를 찾지 못했어요.");
    const imageKeys = await uploadReportImages(input.images, options);
    options.onProgress?.({ stage: "CREATING", percent: 95 });
    const report = await jsonRequest<BackendReport>("/api/reports", "POST", {
      locationId: location.id,
      temperature: input.temperature,
      precipitation: input.precipitation,
      sunlight: input.sunlight,
      comment: input.content,
      imageKeys,
    }, { signal: options.signal });
    options.onProgress?.({ stage: "CREATING", percent: 100 });
    return normalizeReport(report);
  },

  toggleThanks: (id, isThanked) =>
    jsonRequest(`/api/reports/${encodeURIComponent(id)}/thanks`, isThanked ? "DELETE" : "POST"),

  reverseGeocode: locationApi.reverseGeocode,
};
