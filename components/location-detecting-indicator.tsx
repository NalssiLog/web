import { LoaderCircle } from "lucide-react";

export function LocationDetectingIndicator({
  className = "",
  compact = false,
  iconPosition = "left",
}: {
  className?: string;
  compact?: boolean;
  iconPosition?: "left" | "right";
}) {
  const spinner = (
    <LoaderCircle
      size={compact ? 14 : 16}
      className="shrink-0 animate-spin text-[#45ace4]"
    />
  );

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex min-w-0 items-center gap-1.5 text-[#718594] ${compact ? "text-xs font-bold" : "text-base font-extrabold"} ${className}`}
    >
      {iconPosition === "left" && spinner}
      <span className="truncate">위치를 찾는 중</span>
      {iconPosition === "right" && spinner}
    </span>
  );
}
