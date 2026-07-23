import type { Metadata } from "next";
import { ReportForm } from "@/components/report-form";

export const metadata: Metadata = {
  title: "날씨 제보하기",
  robots: { index: false, follow: false },
};

export default function NewReportPage() {
  return <ReportForm />;
}
