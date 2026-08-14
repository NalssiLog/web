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
  { value: "FRESH", label: "선선해요", emoji: "😊" },
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
  "공기가 건조해요",
  "공기가 습해요",
  "날씨가 더워요",
  "날씨가 추워요",
] as const;

export const DEFAULT_REPORT_IMAGE = "/weather/clear-sky.webp";
export const SERVICE_CONTACT_EMAIL = "nalssilog.team@gmail.com";
export const DEFAULT_PROFILE_IMAGES = [
  { id: "avatar-01", src: "/avatars/cloud.svg", label: "구름" },
  { id: "avatar-02", src: "/avatars/sun.svg", label: "햇빛" },
  { id: "avatar-03", src: "/avatars/rain.svg", label: "비" },
  { id: "avatar-04", src: "/avatars/breeze.svg", label: "산들바람" },
] as const;

export function resolveProfileImage(value?: string | null) {
  if (!value) return undefined;
  return DEFAULT_PROFILE_IMAGES.find((profile) => profile.id === value)?.src ?? value;
}

export function getProfilePresetId(value?: string | null) {
  return DEFAULT_PROFILE_IMAGES.find((profile) => profile.id === value || profile.src === value)?.id;
}

const seoulLocation = (id: string, districtAndNeighborhood: string): Location => {
  const shortName = `서울시 ${districtAndNeighborhood}`;
  return {
    id,
    label: shortName,
    shortName,
    fullName: `서울특별시 ${districtAndNeighborhood}`,
  };
};

export const SUPPORTED_LOCATIONS: ReadonlyArray<Location> = [
  seoulLocation("seoul-gangnam-yeoksam", "강남구 역삼동"),
  seoulLocation("seoul-gangnam-samseong", "강남구 삼성동"),
  seoulLocation("seoul-gangnam-daechi", "강남구 대치동"),
  seoulLocation("seoul-seocho-seocho", "서초구 서초동"),
  seoulLocation("seoul-seocho-banpo", "서초구 반포동"),
  seoulLocation("seoul-gwanak-bongcheon", "관악구 봉천동"),
  seoulLocation("seoul-dongjak-sadang", "동작구 사당동"),
  seoulLocation("seoul-yeongdeungpo-yeouido", "영등포구 여의도동"),
  seoulLocation("seoul-guro-guro", "구로구 구로동"),
  seoulLocation("seoul-geumcheon-gasan", "금천구 가산동"),
  seoulLocation("seoul-gangseo-magang", "강서구 마곡동"),
  seoulLocation("seoul-yangcheon-mok", "양천구 목동"),
  seoulLocation("seoul-mapogu-seogyo", "마포구 서교동"),
  seoulLocation("seoul-seodaemun-sinchon", "서대문구 신촌동"),
  seoulLocation("seoul-eunpyeong-bulgwang", "은평구 불광동"),
  seoulLocation("seoul-jongno-jongno", "종로구 종로동"),
  seoulLocation("seoul-jung-myeongdong", "중구 명동"),
  seoulLocation("seoul-yongsan-hannam", "용산구 한남동"),
  seoulLocation("seoul-seongdong-seongsu", "성동구 성수동"),
  seoulLocation("seoul-gwangjin-jayang", "광진구 자양동"),
  seoulLocation("seoul-dongdaemun-cheongnyangni", "동대문구 청량리동"),
  seoulLocation("seoul-jungnang-myeonmok", "중랑구 면목동"),
  seoulLocation("seoul-seongbuk-seongbuk", "성북구 성북동"),
  seoulLocation("seoul-gangbuk-mia", "강북구 미아동"),
  seoulLocation("seoul-dobong-chang", "도봉구 창동"),
  seoulLocation("seoul-nowon-sanggye", "노원구 상계동"),
  seoulLocation("seoul-gangdong-cheonho", "강동구 천호동"),
  seoulLocation("seoul-songpa-jamsil", "송파구 잠실동"),
];

export const DEFAULT_LOCATION_DATA = SUPPORTED_LOCATIONS[0];
export const DEFAULT_LOCATION = DEFAULT_LOCATION_DATA.shortName ?? DEFAULT_LOCATION_DATA.label;

export function getLocationName(location: Location, variant: "full" | "short" = "short") {
  return variant === "full"
    ? location.fullName ?? location.shortName ?? location.label
    : location.shortName ?? location.label;
}

export function findSupportedLocation(location: Pick<Location, "id" | "label">) {
  const normalizedLabel = location.label.replaceAll(" ", "").toLowerCase();
  return SUPPORTED_LOCATIONS.find((candidate) => {
    if (location.id && candidate.id === location.id) return true;
    return [candidate.label, candidate.shortName, candidate.fullName]
      .filter((name): name is string => Boolean(name))
      .some((name) => {
        const normalizedName = name.replaceAll(" ", "").toLowerCase();
        return normalizedName === normalizedLabel || normalizedName.endsWith(normalizedLabel);
      });
  });
}

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

export function formatThanksCount(count: number) {
  return count > 999 ? "999+" : String(count);
}

export function statusLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
