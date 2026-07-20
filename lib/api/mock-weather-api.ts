import { mockReports } from "@/lib/mock-data";
import { DEFAULT_LOCATION } from "@/lib/constants";
import type { CreateReportInput, WeatherReport } from "@/lib/types";
import type { WeatherApi } from "@/lib/api/weather-api";
import { useAuthStore } from "@/store/auth-store";

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));
const PAGE_SIZE = 6;
const mockAvatars: Record<string, string> = {
  "mock-google": "/avatars/cloud.svg",
  "mock-kakao": "/avatars/sun.svg",
  "mock-naver": "/avatars/breeze.svg",
};

export const mockWeatherApi: WeatherApi = {
  async getSummary() {
    await wait();
    return { temperature: "FRESH", precipitation: "NONE", sunlight: "STRONG", recentReportCount: mockReports.length };
  },
  async getReports(_location, cursor) {
    await wait();
    const start = Number(cursor ?? "0");
    const reports = mockReports.slice(start, start + PAGE_SIZE);
    const next = start + PAGE_SIZE;
    return { reports, nextCursor: next < mockReports.length ? String(next) : undefined };
  },
  async getMyReports() {
    await wait();
    const user = useAuthStore.getState().user;
    if (user.type !== "MEMBER") return [];
    return mockReports.filter((report) => report.author.type === "MEMBER" && report.author.id === user.id);
  },
  async getMemberProfile(id) {
    await wait();
    const currentUser = useAuthStore.getState().user;
    if (currentUser.type === "MEMBER" && currentUser.id === id) {
      return { id, nickname: currentUser.nickname, avatarUrl: currentUser.avatarUrl };
    }
    const report = mockReports.find((item) => item.author.type === "MEMBER" && item.author.id === id);
    if (!report || report.author.type !== "MEMBER") throw new Error("사용자를 찾을 수 없어요.");
    return { id, nickname: report.author.nickname, avatarUrl: mockAvatars[id] };
  },
  async getMemberReports(id) {
    await wait();
    return mockReports.filter((report) => report.author.type === "MEMBER" && report.author.id === id);
  },
  async getReport(id) {
    await wait();
    const report = mockReports.find((item) => item.id === id);
    if (!report) throw new Error("제보를 찾을 수 없어요.");
    return report;
  },
  async createReport(input: CreateReportInput) {
    await wait(500);
    const user = useAuthStore.getState().user;
    const report: WeatherReport = {
      id: `mock-${Date.now()}`,
      ...input,
      images: input.images.map((file) => URL.createObjectURL(file)),
      author: user.type === "MEMBER"
        ? { type: "MEMBER", id: user.id, nickname: user.nickname }
        : { type: "ANONYMOUS" },
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      isHelpful: false,
    };
    mockReports.unshift(report);
    return report;
  },
  async toggleHelpful(id) {
    await wait(180);
    const report = mockReports.find((item) => item.id === id);
    if (!report) throw new Error("제보를 찾을 수 없어요.");
    report.isHelpful = !report.isHelpful;
    report.helpfulCount = Math.max(0, report.helpfulCount + (report.isHelpful ? 1 : -1));
    return { ...report };
  },
  async reverseGeocode(latitude, longitude) {
    await wait(350);
    return { label: DEFAULT_LOCATION, latitude, longitude };
  },
};
