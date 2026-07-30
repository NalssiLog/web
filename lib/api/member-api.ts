import { ApiError, apiRequest, jsonRequest } from "@/lib/api/http-client";
import { logger } from "@/lib/logging";
import type { AvatarType, MemberAccount, SocialProvider } from "@/lib/types";

const avatarLogger = logger.child("member.avatar_upload");

export interface SocialAccountResponse {
  provider: SocialProvider;
  email: string | null;
  lastLoginAt: string | null;
}

export type FeedbackCategory = "BUG" | "IMPROVEMENT" | "OTHER";

export interface FeedbackResponse {
  id: string;
  category: FeedbackCategory;
  content: string;
  createdAt: string;
}

interface AvatarPresignResponse {
  storageKey: string;
  uploadUrl: string;
  contentType: string;
  size: number;
}

async function uploadAvatarFile(file: File) {
  const presigned = await jsonRequest<AvatarPresignResponse>("/api/members/me/avatar/presign", "POST", {
    contentType: file.type,
    size: file.size,
  });
  if (presigned.contentType !== file.type || presigned.size !== file.size || !presigned.storageKey || !presigned.uploadUrl) {
    avatarLogger.error("presign_response_invalid", new Error("Avatar presign response mismatch"), {
      contentTypeMatched: presigned.contentType === file.type,
      sizeMatched: presigned.size === file.size,
    });
    throw new ApiError(0, "IMAGE_UPLOAD_FAILED", "프로필 사진 업로드 정보를 확인하지 못했어요.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
    } catch (error) {
      if (attempt === 0) continue;
      avatarLogger.error("r2_upload_network_failed", error, { stage: "put", attempts: attempt + 1 });
      throw new ApiError(0, "IMAGE_UPLOAD_FAILED", "프로필 사진 업로드 서버에 연결하지 못했어요.");
    }

    if (response.ok) return presigned.storageKey;
    const isRetryable = response.status === 408 || response.status === 429 || response.status >= 500;
    if (attempt === 0 && isRetryable) continue;
    avatarLogger.error("r2_upload_rejected", new Error(`Avatar upload failed with status ${response.status}`), {
      stage: "put",
      status: response.status,
      attempts: attempt + 1,
    });
    throw new ApiError(response.status, "IMAGE_UPLOAD_FAILED", "프로필 사진을 업로드하지 못했어요.");
  }

  throw new ApiError(0, "IMAGE_UPLOAD_FAILED", "프로필 사진을 업로드하지 못했어요.");
}

export const memberApi = {
  getMe: () => apiRequest<MemberAccount>("/api/members/me", { cache: "no-store" }),
  updateName: (name: string) => jsonRequest<MemberAccount>("/api/members/me/name", "PATCH", { name }),
  updateNickname: (nickname: string) => jsonRequest<MemberAccount>("/api/members/me/nickname", "PATCH", { nickname }),
  updateAvatar: (type: AvatarType, value: string | null) =>
    jsonRequest<MemberAccount>("/api/members/me/avatar", "PATCH", { type, value }),
  updateCustomAvatar: async (file: File) => {
    const storageKey = await uploadAvatarFile(file);
    try {
      return await jsonRequest<MemberAccount>("/api/members/me/avatar", "PATCH", {
        type: "CUSTOM",
        value: storageKey,
      });
    } catch (error) {
      avatarLogger.error("profile_update_failed", error, { stage: "apply" });
      if (error instanceof ApiError && error.status >= 500) {
        throw new ApiError(
          error.status,
          error.code,
          "사진은 업로드했지만 프로필에 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
      throw error;
    }
  },
  getSocialAccounts: () => apiRequest<SocialAccountResponse[]>("/api/members/me/social-accounts"),
  disconnectSocialAccount: (provider: SocialProvider) => jsonRequest<void>(`/api/members/me/social-accounts/${provider.toLowerCase()}`, "DELETE"),
  submitFeedback: (content: string, category: FeedbackCategory = "OTHER") =>
    jsonRequest<FeedbackResponse>("/api/feedbacks", "POST", { category, content }),
};
