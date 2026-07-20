import { httpWeatherApi } from "@/lib/api/http-weather-api";
import { mockWeatherApi } from "@/lib/api/mock-weather-api";

export const weatherApi =
  process.env.NEXT_PUBLIC_USE_MOCK_API === "false" ? httpWeatherApi : mockWeatherApi;
