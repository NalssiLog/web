export type TemperatureStatus = "COLD" | "FRESH" | "HOT";
export type PrecipitationStatus = "NONE" | "LIGHT" | "HEAVY";
export type SunlightStatus = "LOW" | "MODERATE" | "STRONG";
export type WeatherStatus = TemperatureStatus | PrecipitationStatus | SunlightStatus;

export type WeatherAuthor =
  | { type: "ANONYMOUS"; nickname?: string }
  | { type: "MEMBER"; id: string; nickname: string; avatarUrl?: string };

export type CurrentUser =
  | { type: "ANONYMOUS" }
  | {
      type: "MEMBER";
      id: string;
      name?: string;
      nickname: string;
      email?: string;
      provider?: SocialProvider;
      avatarUrl?: string;
      linkedProviders?: SocialProvider[];
    };

export type SocialProvider = "NAVER" | "KAKAO" | "GOOGLE";

export type AvatarType = "DEFAULT" | "PRESET" | "CUSTOM";

export interface MemberAvatar {
  type: AvatarType;
  value: string | null;
  profileImageUrl?: string | null;
}

export interface MemberAccount {
  id: string;
  name: string | null;
  nickname: string;
  email: string | null;
  avatar: MemberAvatar;
  connectedProviders: SocialProvider[];
  currentProvider: SocialProvider;
}

export interface MemberProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

export interface Location {
  id?: string;
  label: string;
  fullName?: string;
  shortName?: string;
  latitude?: number;
  longitude?: number;
}

export interface WeatherReport {
  id: string;
  isMine: boolean;
  location: Location;
  images: string[];
  content: string;
  temperature: TemperatureStatus;
  precipitation: PrecipitationStatus;
  sunlight: SunlightStatus;
  author: WeatherAuthor;
  createdAt: string;
  thanksCount: number;
  isThanked: boolean;
}

export interface WeatherSummary {
  temperature: TemperatureStatus | null;
  precipitation: PrecipitationStatus | null;
  sunlight: SunlightStatus | null;
  recentReportCount: number;
}

export interface ReportPage {
  reports: WeatherReport[];
  nextCursor?: string;
}

export interface ThanksState {
  thanksCount: number;
  isThanked: boolean;
}

export interface CreateReportInput {
  location: Location;
  images: File[];
  content: string;
  temperature: TemperatureStatus;
  precipitation: PrecipitationStatus;
  sunlight: SunlightStatus;
}

export type ReportUploadStage = "PREPARING" | "UPLOADING" | "CREATING";

export interface ReportUploadProgress {
  stage: ReportUploadStage;
  percent: number;
}

export interface CreateReportOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ReportUploadProgress) => void;
}
