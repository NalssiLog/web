export function EmptyState({ title = "아직 날씨 제보가 없어요", description = "이 동네의 첫 날씨를 알려주세요." }) {
  return (
    <div className="flex min-h-56 -translate-y-2 flex-col items-center justify-center px-6 text-center">
      <p className="font-extrabold">{title}</p>
      <p className="mt-1 text-sm text-[#718594]">{description}</p>
    </div>
  );
}
