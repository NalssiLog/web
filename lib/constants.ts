import type {
  PrecipitationStatus,
  SunlightStatus,
  TemperatureStatus,
  Location,
} from "@/lib/types";

export const TEMPERATURE_OPTIONS: ReadonlyArray<{
  value: TemperatureStatus;
  label: string;
  emoji: string;
}> = [
  { value: "COLD", label: "추워요", emoji: "🥶" },
  { value: "FRESH", label: "신선해요", emoji: "😊" },
  { value: "HOT", label: "더워요", emoji: "🥵" },
];

export const PRECIPITATION_OPTIONS: ReadonlyArray<{
  value: PrecipitationStatus;
  label: string;
  emoji: string;
}> = [
  { value: "NONE", label: "지금 안 와요", emoji: "☂️" },
  { value: "LIGHT", label: "조금 와요", emoji: "🌦️" },
  { value: "HEAVY", label: "많이 와요", emoji: "🌧️" },
];

export const SUNLIGHT_OPTIONS: ReadonlyArray<{
  value: SunlightStatus;
  label: string;
  emoji: string;
}> = [
  { value: "LOW", label: "부족해요", emoji: "☁️" },
  { value: "MODERATE", label: "적당해요", emoji: "⛅" },
  { value: "STRONG", label: "따가워요", emoji: "☀️" },
];

export const SUGGESTED_MESSAGES = [
  "작은 우산 챙기세요",
  "겉옷이 필요해요",
  "햇빛이 따가워요",
  "지금은 비가 안 와요",
  "산책하기 좋은 날씨예요",
] as const;

export const DEFAULT_LOCATION = "강남구 역삼동";
export const DEFAULT_REPORT_IMAGE = "/weather/clear-sky.webp";
export const DEFAULT_PROFILE_IMAGES = [
  { src: "/avatars/cloud.svg", label: "구름" },
  { src: "/avatars/sun.svg", label: "햇빛" },
  { src: "/avatars/rain.svg", label: "비" },
  { src: "/avatars/breeze.svg", label: "산들바람" },
] as const;

export const SUPPORTED_LOCATIONS: ReadonlyArray<Location> = [
  { id: "seoul-gangnam-yeoksam", label: "강남구 역삼동" },
  { id: "seoul-gangnam-samseong", label: "강남구 삼성동" },
  { id: "seoul-gangnam-daechi", label: "강남구 대치동" },
  { id: "seoul-seocho-seocho", label: "서초구 서초동" },
  { id: "seoul-seocho-banpo", label: "서초구 반포동" },
  { id: "seoul-gwanak-bongcheon", label: "관악구 봉천동" },
  { id: "seoul-dongjak-sadang", label: "동작구 사당동" },
  { id: "seoul-yeongdeungpo-yeouido", label: "영등포구 여의도동" },
  { id: "seoul-guro-guro", label: "구로구 구로동" },
  { id: "seoul-geumcheon-gasan", label: "금천구 가산동" },
  { id: "seoul-gangseo-magang", label: "강서구 마곡동" },
  { id: "seoul-yangcheon-mok", label: "양천구 목동" },
  { id: "seoul-mapogu-seogyo", label: "마포구 서교동" },
  { id: "seoul-seodaemun-sinchon", label: "서대문구 신촌동" },
  { id: "seoul-eunpyeong-bulgwang", label: "은평구 불광동" },
  { id: "seoul-jongno-jongno", label: "종로구 종로동" },
  { id: "seoul-jung-myeongdong", label: "중구 명동" },
  { id: "seoul-yongsan-hannam", label: "용산구 한남동" },
  { id: "seoul-seongdong-seongsu", label: "성동구 성수동" },
  { id: "seoul-gwangjin-jayang", label: "광진구 자양동" },
  { id: "seoul-dongdaemun-cheongnyangni", label: "동대문구 청량리동" },
  { id: "seoul-jungnang-myeonmok", label: "중랑구 면목동" },
  { id: "seoul-seongbuk-seongbuk", label: "성북구 성북동" },
  { id: "seoul-gangbuk-mia", label: "강북구 미아동" },
  { id: "seoul-dobong-chang", label: "도봉구 창동" },
  { id: "seoul-nowon-sanggye", label: "노원구 상계동" },
  { id: "seoul-gangdong-cheonho", label: "강동구 천호동" },
  { id: "seoul-songpa-jamsil", label: "송파구 잠실동" },
] as const;

const POPULAR_LOCATION_IDS = [
  "seoul-gangnam-yeoksam",
  "seoul-seongdong-seongsu",
  "seoul-yeongdeungpo-yeouido",
  "seoul-mapogu-seogyo",
  "seoul-seocho-banpo",
] as const;

export const POPULAR_LOCATIONS = SUPPORTED_LOCATIONS.filter((location) =>
  POPULAR_LOCATION_IDS.includes(location.id as (typeof POPULAR_LOCATION_IDS)[number]),
);

export function formatHelpfulCount(count: number) {
  return count > 999 ? "999+" : String(count);
}

export function statusLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
