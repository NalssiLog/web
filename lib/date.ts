import { format, isSameYear } from "date-fns";
import { ko } from "date-fns/locale";

export function formatReportDateTime(value: string | Date, referenceDate = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const pattern = isSameYear(date, referenceDate)
    ? "M월 d일 a h:mm"
    : "yyyy년 M월 d일 a h:mm";

  return format(date, pattern, { locale: ko });
}
