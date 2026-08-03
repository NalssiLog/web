import type { SocialProvider } from "@/lib/types";

export const socialProviderLabel: Readonly<Record<SocialProvider, string>> = {
  APPLE: "애플",
  GOOGLE: "구글",
  KAKAO: "카카오",
  NAVER: "네이버",
};

export const webSocialProviders = [
  "NAVER",
  "KAKAO",
  "GOOGLE",
  "APPLE",
] as const satisfies readonly SocialProvider[];
