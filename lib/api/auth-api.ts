import { getApiUrl } from "@/lib/api/config";
import { apiRequest, jsonRequest } from "@/lib/api/http-client";
import type { AvatarType, SocialProvider } from "@/lib/types";

export type SessionAuthResult =
  | "SUCCESS"
  | "SIGNUP_REQUIRED"
  | "LINK_REQUIRED"
  | "NONE";

export type OAuthCallbackResult =
  | "SUCCESS"
  | "SIGNUP_REQUIRED"
  | "LINK_REQUIRED"
  | "LINK_SUCCESS"
  | "LINK_FAILED"
  | "FAILED";

export interface AuthUserResponse {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
  avatar?: { type: AvatarType; value: string | null };
}

export interface PendingAuthResponse {
  provider: SocialProvider;
  email: string;
  existingProviders?: SocialProvider[];
}

interface RawAuthMeResponse extends Omit<AuthMeResponse, "pendingAuth"> {
  pendingAuth: (Omit<PendingAuthResponse, "provider" | "existingProviders"> & {
    provider: string;
    existingProviders?: string[];
  }) | null;
}

export interface AuthMeResponse {
  authenticated: boolean;
  result: SessionAuthResult;
  user: AuthUserResponse | null;
  pendingAuth: PendingAuthResponse | null;
}

export interface SignupRequest {
  agreedTerms: Array<{ type: "SERVICE" | "PRIVACY"; version: string }>;
}

const providerPath: Record<SocialProvider, string> = {
  NAVER: "naver",
  KAKAO: "kakao",
  GOOGLE: "google",
};

function normalizeProvider(provider: string): SocialProvider {
  const normalized = provider.toUpperCase();
  if (normalized === "NAVER" || normalized === "KAKAO" || normalized === "GOOGLE") return normalized;
  throw new Error("지원하지 않는 소셜 로그인 제공자예요.");
}

function normalizeAuthMe(response: RawAuthMeResponse): AuthMeResponse {
  return {
    ...response,
    pendingAuth: response.pendingAuth
      ? {
          ...response.pendingAuth,
          provider: normalizeProvider(response.pendingAuth.provider),
          existingProviders: response.pendingAuth.existingProviders?.map(normalizeProvider),
        }
      : null,
  };
}

export const authApi = {
  checkHealth: () => apiRequest<{ status: "UP" }>("/api/health", { signal: AbortSignal.timeout(5_000) }),
  getLoginUrl: (provider: SocialProvider) => getApiUrl(`/api/auth/login/${providerPath[provider]}`),
  getMe: async () => normalizeAuthMe(await apiRequest<RawAuthMeResponse>("/api/auth/me")),
  signup: (body: SignupRequest) => jsonRequest<unknown>("/api/auth/signup", "POST", body),
  refresh: () => jsonRequest<void>("/api/auth/refresh", "POST"),
  logout: () => jsonRequest<void>("/api/auth/logout", "POST"),
  withdraw: () => jsonRequest<void>("/api/auth/withdraw", "DELETE"),
  consentToLink: () => jsonRequest<{ authorizationUrl: string }>("/api/auth/link/consent", "POST"),
  cancelLink: () => jsonRequest<void>("/api/auth/link/cancel", "POST"),
  linkSocial: (provider: SocialProvider) =>
    jsonRequest<{ authorizationUrl: string }>(`/api/auth/link/social/${providerPath[provider]}`, "POST"),
  checkNickname: (nickname: string) => apiRequest<{ available: boolean }>(`/api/members/nickname/availability?nickname=${encodeURIComponent(nickname)}`),
};
