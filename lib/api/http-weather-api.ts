import type { CreateReportInput } from "@/lib/types";
import type { WeatherApi } from "@/lib/api/weather-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw new Error("요청을 처리하지 못했어요.");
  return response.json() as Promise<T>;
}

export const httpWeatherApi: WeatherApi = {
  getSummary: (location) => request(`/api/v1/weather-summary?location=${encodeURIComponent(location)}`),
  getReports: (location, cursor) => request(`/api/v1/weather-reports?location=${encodeURIComponent(location)}${cursor ? `&cursor=${cursor}` : ""}`),
  getMyReports: () => request("/api/v1/weather-reports/me"),
  getMemberProfile: (id) => request(`/api/v1/members/${id}`),
  getMemberReports: (id) => request(`/api/v1/members/${id}/weather-reports`),
  getReport: (id) => request(`/api/v1/weather-reports/${id}`),
  createReport: (input: CreateReportInput) => {
    const formData = new FormData();
    formData.append("request", new Blob([JSON.stringify({ ...input, images: undefined })], { type: "application/json" }));
    input.images.forEach((image) => formData.append("images", image));
    return request("/api/v1/weather-reports", { method: "POST", body: formData });
  },
  toggleThanks: (id) => request(`/api/v1/weather-reports/${id}/thanks`, { method: "POST" }),
  reverseGeocode: (latitude, longitude) => request(`/api/v1/locations/reverse-geocode?latitude=${latitude}&longitude=${longitude}`),
};
