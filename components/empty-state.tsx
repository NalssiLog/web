import { CloudOff } from "lucide-react";

export function EmptyState({ title = "아직 날씨 제보가 없어요", description = "이 동네의 첫 날씨를 알려주세요." }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#eef9ff] text-[#8dd3f7]"><CloudOff /></span>
      <p className="font-extrabold">{title}</p>
      <p className="mt-1 text-sm text-[#718594]">{description}</p>
    </div>
  );
}
