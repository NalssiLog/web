export type TemperatureStatus = "COLD" | "FRESH" | "HOT";
export type PrecipitationStatus = "NONE" | "LIGHT" | "HEAVY";
export type SunlightStatus = "LOW" | "MODERATE" | "STRONG";

export type WeatherAuthor =
  | { type: "ANONYMOUS" }
  | { type: "MEMBER"; id: string; nickname: string };

export type CurrentUser =
  | { type: "ANONYMOUS" }
  | {
      type: "MEMBER";
      id: string;
      nickname: string;
      email: string;
      provider: SocialProvider;
      avatarUrl?: string;
      linkedProviders?: SocialProvider[];
    };

export type SocialProvider = "NAVER" | "KAKAO" | "GOOGLE";

export interface MemberProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

export interface Location {
  id?: string;
  label: string;
  latitude?: number;
  longitude?: number;
}

export interface WeatherReport {
  id: string;
  location: Location;
  images: string[];
  content: string;
  temperature: TemperatureStatus;
  precipitation: PrecipitationStatus;
  sunlight: SunlightStatus;
  author: WeatherAuthor;
  createdAt: string;
  helpfulCount: number;
  isHelpful: boolean;
}

export interface WeatherSummary {
  temperature: TemperatureStatus;
  precipitation: PrecipitationStatus;
  sunlight: SunlightStatus;
  recentReportCount: number;
}

export interface ReportPage {
  reports: WeatherReport[];
  nextCursor?: string;
}

export interface CreateReportInput {
  location: Location;
  images: File[];
  content: string;
  temperature: TemperatureStatus;
  precipitation: PrecipitationStatus;
  sunlight: SunlightStatus;
}
