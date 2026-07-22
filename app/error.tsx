"use client";

import { CloudOff, RotateCw } from "lucide-react";
import { useEffect } from "react";
import { logger } from "@/lib/logging";

const errorLogger = logger.child("ui.route_error");

export default function RouteError({
  error,
  reset,
  unstable_retry: unstableRetry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    errorLogger.error("route_error_boundary", error, { digest: error.digest });
  }, [error]);

  const retry = unstableRetry ?? reset ?? (() => window.location.reload());
  return (
    <main className="flex min-h-[75dvh] items-center justify-center px-5 py-16">
      <section className="w-full rounded-[24px] bg-white px-6 py-10 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e5f5fe] text-[#45ace4]"><CloudOff size={27} /></span>
        <h1 className="mt-4 text-lg font-extrabold">잠시 구름이 꼈어요</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#718594]">화면을 불러오지 못했어요.<br />잠시 후 다시 시도해 주세요.</p>
        <button type="button" onClick={retry} className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#45ace4] px-5 py-3 text-sm font-extrabold text-white"><RotateCw size={16} /> 다시 시도</button>
      </section>
    </main>
  );
}
