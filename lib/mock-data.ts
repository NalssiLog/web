import type { WeatherReport } from "@/lib/types";
import { DEFAULT_LOCATION } from "@/lib/constants";

const now = Date.now();
const minute = 60_000;
const location = { label: DEFAULT_LOCATION, latitude: 37.4979, longitude: 127.0276 };

export const mockReports: WeatherReport[] = [
  { id: "12", location, images: ["/weather/clear-sky.webp"], content: "하늘은 맑은데 햇빛이 꽤 따가워요.", temperature: "HOT", precipitation: "NONE", sunlight: "STRONG", author: { type: "ANONYMOUS" }, createdAt: new Date(now - 3 * minute).toISOString(), thanksCount: 1250, isThanked: false },
  { id: "11", location, images: ["/weather/rainy-street.webp", "/weather/park-after-rain.webp"], content: "비가 조금씩 내려요. 작은 우산 챙기세요.", temperature: "FRESH", precipitation: "LIGHT", sunlight: "LOW", author: { type: "MEMBER", id: "mock-google", nickname: "구름이웃" }, createdAt: new Date(now - 8 * minute).toISOString(), thanksCount: 12, isThanked: false },
  { id: "10", location, images: [], content: "선선해서 걷기 딱 좋은 날씨예요.", temperature: "FRESH", precipitation: "NONE", sunlight: "MODERATE", author: { type: "ANONYMOUS" }, createdAt: new Date(now - 14 * minute).toISOString(), thanksCount: 9, isThanked: false },
  { id: "9", location, images: ["/weather/park-after-rain.webp"], content: "공원 길이 아직 젖어 있어요. 미끄럼 주의하세요.", temperature: "COLD", precipitation: "LIGHT", sunlight: "LOW", author: { type: "MEMBER", id: "mock-kakao", nickname: "노란이웃" }, createdAt: new Date(now - 22 * minute).toISOString(), thanksCount: 21, isThanked: false },
  { id: "8", location, images: ["/weather/sunset.webp", "/weather/clear-sky.webp", "/weather/park-after-rain.webp"], content: "노을이 예쁘고 바람이 시원해요.", temperature: "FRESH", precipitation: "NONE", sunlight: "MODERATE", author: { type: "ANONYMOUS" }, createdAt: new Date(now - 31 * minute).toISOString(), thanksCount: 16, isThanked: false },
  { id: "7", location, images: ["/weather/rainy-street.webp"], content: "갑자기 빗줄기가 굵어졌어요. 우산 꼭 필요해요.", temperature: "COLD", precipitation: "HEAVY", sunlight: "LOW", author: { type: "MEMBER", id: "mock-naver", nickname: "초록이웃" }, createdAt: new Date(now - 44 * minute).toISOString(), thanksCount: 30, isThanked: false },
  { id: "6", location, images: [], content: "구름이 많지만 후텁지근해요.", temperature: "HOT", precipitation: "NONE", sunlight: "LOW", author: { type: "ANONYMOUS" }, createdAt: new Date(now - 55 * minute).toISOString(), thanksCount: 7, isThanked: false },
  { id: "5", location, images: ["/weather/clear-sky.webp", "/weather/sunset.webp"], content: "그늘 밖은 뜨거워요. 물 챙기세요.", temperature: "HOT", precipitation: "NONE", sunlight: "STRONG", author: { type: "MEMBER", id: "u4", nickname: "파란하늘" }, createdAt: new Date(now - 68 * minute).toISOString(), thanksCount: 24, isThanked: false },
  { id: "4", location, images: ["/weather/park-after-rain.webp"], content: "비가 그치고 공기가 상쾌해졌어요.", temperature: "FRESH", precipitation: "NONE", sunlight: "MODERATE", author: { type: "ANONYMOUS" }, createdAt: new Date(now - 82 * minute).toISOString(), thanksCount: 15, isThanked: false },
  { id: "3", location, images: ["/weather/rainy-street.webp"], content: "비가 세차게 와서 신발이 젖을 정도예요.", temperature: "COLD", precipitation: "HEAVY", sunlight: "LOW", author: { type: "MEMBER", id: "u5", nickname: "우산수집가" }, createdAt: new Date(now - 99 * minute).toISOString(), thanksCount: 27, isThanked: false },
  { id: "2", location, images: [], content: "햇빛은 적당하고 조금 쌀쌀해요.", temperature: "COLD", precipitation: "NONE", sunlight: "MODERATE", author: { type: "ANONYMOUS" }, createdAt: new Date(now - 121 * minute).toISOString(), thanksCount: 5, isThanked: false },
  { id: "1", location, images: ["/weather/sunset.webp"], content: "습하고 더운데 약한 비가 내려요.", temperature: "HOT", precipitation: "LIGHT", sunlight: "STRONG", author: { type: "MEMBER", id: "u6", nickname: "동네한바퀴" }, createdAt: new Date(now - 145 * minute).toISOString(), thanksCount: 11, isThanked: false },
];
