import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import type {
  ReportBlockPage,
  ReportFlagInput,
  ReportFlagResponse,
} from "@/lib/types";

function requireId(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label}를 확인해 주세요.`);
  return normalized;
}

export const moderationApi = {
  flagReport: (reportId: string, input: ReportFlagInput) =>
    jsonRequest<ReportFlagResponse>(
      `/api/reports/${encodeURIComponent(requireId(reportId, "제보 ID"))}/flags`,
      "POST",
      {
        reason: input.reason,
        ...(input.detail?.trim() ? { detail: input.detail.trim() } : {}),
      },
    ),

  blockMember: (memberId: string) =>
    jsonRequest<void>(
      `/api/report-blocks/members/${encodeURIComponent(requireId(memberId, "회원 ID"))}`,
      "POST",
    ),

  unblockMember: (memberId: string) =>
    jsonRequest<void>(
      `/api/report-blocks/members/${encodeURIComponent(requireId(memberId, "회원 ID"))}`,
      "DELETE",
    ),

  getReportBlocks: (page = 0, size = 20) =>
    apiRequest<ReportBlockPage>(
      `/api/report-blocks?page=${Math.max(0, Math.trunc(page))}&size=${Math.min(50, Math.max(1, Math.trunc(size)))}`,
      { cache: "no-store" },
    ),

};
