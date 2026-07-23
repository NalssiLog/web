import type {
  CreateReportInput,
  CreateReportOptions,
  Location,
  MemberProfile,
  ReportPage,
  WeatherReport,
  WeatherSummary,
  ThanksState,
} from "@/lib/types";

export interface WeatherApi {
  getSummary(location: Location): Promise<WeatherSummary>;
  getReports(location: Location, cursor?: string): Promise<ReportPage>;
  getMyReports(cursor?: string): Promise<ReportPage>;
  getMemberProfile(id: string): Promise<MemberProfile>;
  getMemberReports(id: string, cursor?: string): Promise<ReportPage>;
  getReport(id: string): Promise<WeatherReport>;
  createReport(input: CreateReportInput, options?: CreateReportOptions): Promise<WeatherReport>;
  deleteReport(id: string): Promise<void>;
  toggleThanks(id: string, isThanked: boolean): Promise<ThanksState>;
  reverseGeocode(latitude: number, longitude: number): Promise<Location>;
}
