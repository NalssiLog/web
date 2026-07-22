export function ReportGridSkeleton({ columns = 2, count }: { columns?: 2 | 3; count?: number }) {
  const itemCount = count ?? (columns === 3 ? 6 : 6);

  return (
    <div
      className={`grid ${columns === 3 ? "grid-cols-3 gap-1.5" : "grid-cols-2 gap-3"}`}
      aria-busy="true"
      aria-label="날씨 제보 목록 불러오는 중"
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className={`skeleton relative aspect-square overflow-hidden ${columns === 3 ? "rounded-lg" : "rounded-[22px]"}`}>
          {columns === 2 ? (
            <>
              <span className="absolute right-2.5 top-2.5 h-3 w-8 rounded bg-white/45" />
              <span className="absolute bottom-3.5 left-3.5 h-4 w-14 rounded bg-white/50" />
              <span className="absolute bottom-3.5 right-3.5 h-3 w-10 rounded bg-white/40" />
            </>
          ) : (
            <>
              <span className="absolute left-2 top-2 h-3 w-[70%] rounded bg-white/45" />
              <span className="absolute bottom-2 left-2 h-3.5 w-11 rounded bg-white/45" />
              <span className="absolute bottom-2 right-2 h-3 w-7 rounded bg-white/40" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
