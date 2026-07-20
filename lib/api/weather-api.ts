import type {
  CreateReportInput,
  Location,
  MemberProfile,
  ReportPage,
  WeatherReport,
  WeatherSummary,
} from "@/lib/types";

export interface WeatherApi {
  getSummary(location: string): Promise<WeatherSummary>;
  getReports(location: string, cursor?: string): Promise<ReportPage>;
  getMyReports(): Promise<WeatherReport[]>;
  getMemberProfile(id: string): Promise<MemberProfile>;
  getMemberReports(id: string): Promise<WeatherReport[]>;
  getReport(id: string): Promise<WeatherReport>;
  createReport(input: CreateReportInput): Promise<WeatherReport>;
  toggleHelpful(id: string): Promise<WeatherReport>;
  reverseGeocode(latitude: number, longitude: number): Promise<Location>;
}
