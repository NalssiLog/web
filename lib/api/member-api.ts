import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import type { AvatarType, MemberAccount, SocialProvider } from "@/lib/types";

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

export const memberApi = {
  getMe: () => apiRequest<MemberAccount>("/api/members/me"),
  updateNickname: (nickname: string) => jsonRequest<void>("/api/members/me/nickname", "PATCH", { nickname }),
  updateAvatar: (type: AvatarType, value: string | null) =>
    jsonRequest<void>("/api/members/me/avatar", "PATCH", { type, value }),
  getSocialAccounts: () => apiRequest<SocialAccountResponse[]>("/api/members/me/social-accounts"),
  disconnectSocialAccount: (provider: SocialProvider) => jsonRequest<void>(`/api/members/me/social-accounts/${provider.toLowerCase()}`, "DELETE"),
  submitFeedback: (content: string, category: FeedbackCategory = "OTHER") =>
    jsonRequest<FeedbackResponse>("/api/feedbacks", "POST", { category, content }),
};
