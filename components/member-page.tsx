"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Grid3X3, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorState } from "@/components/error-state";
import { MyReportList } from "@/components/my-report-list";
import { ProfilePreviewModal } from "@/components/profile-preview-modal";
import { weatherApi } from "@/lib/api";

export function MemberPage({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const profile = useQuery({ queryKey: ["member-profile", memberId], queryFn: () => weatherApi.getMemberProfile(memberId) });

  if (profile.isLoading) {
    return <MemberPageSkeleton onBack={() => router.back()} />;
  }

  if (profile.isError || !profile.data) {
    return <main className="page"><header className="safe-top flex items-center justify-between pb-6"><button type="button" onClick={() => router.back()} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button><h1 className="text-lg font-extrabold">프로필</h1><span className="w-[42px]" /></header><ErrorState message="사용자 정보를 불러오지 못했어요." onRetry={() => profile.refetch()} /></main>;
  }

  return (
    <main className="min-h-[75dvh] pb-12">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-[#eef9ff] px-5 pb-3">
        <button type="button" onClick={() => router.back()} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button>
        <h1 className="text-lg font-extrabold">프로필</h1>
        <span className="w-[42px]" />
      </header>
      <section className="flex items-center gap-5 px-5 py-6">
        <button type="button" onClick={() => setIsProfilePreviewOpen(true)} className="flex size-18 shrink-0 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm ring-2 ring-white" style={profile.data.avatarUrl ? { backgroundImage: `url(${profile.data.avatarUrl})` } : undefined} aria-label="프로필 사진 크게 보기">
          {!profile.data.avatarUrl && <UserRound size={29} />}
        </button>
        <div className="flex h-18 min-w-0 flex-1 items-center"><p className="truncate text-base font-extrabold">{profile.data.nickname}</p></div>
      </section>
      <section className="px-5">
        <div className="mb-3 flex h-11 items-center justify-start border-b-2 border-[#45ace4] pl-1 text-[#268fc7]" aria-label="작성한 제보"><Grid3X3 size={19} strokeWidth={2.2} /></div>
        <MyReportList memberId={memberId} columns={3} publicProfile />
      </section>
      {isProfilePreviewOpen && <ProfilePreviewModal avatarUrl={profile.data.avatarUrl} onClose={() => setIsProfilePreviewOpen(false)} />}
    </main>
  );
}

function MemberPageSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <main className="min-h-[75dvh] pb-12" aria-busy="true" aria-label="사용자 프로필 불러오는 중">
      <header className="safe-top sticky top-0 z-30 grid grid-cols-[42px_1fr_42px] items-center bg-[#eef9ff] px-5 pb-3">
        <button type="button" onClick={onBack} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button>
        <div className="skeleton mx-auto h-5 w-16 rounded" />
        <span />
      </header>
      <section className="flex items-center gap-5 px-5 py-6">
        <div className="skeleton size-18 shrink-0 rounded-full" />
        <div className="flex h-18 min-w-0 flex-1 items-center"><div className="skeleton h-4 w-28 rounded" /></div>
      </section>
      <section className="px-5">
        <div className="mb-3 flex h-11 items-center border-b-2 border-[#b9dce9] pl-1"><div className="skeleton size-[19px] rounded" /></div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton aspect-square rounded-lg" />)}
        </div>
      </section>
    </main>
  );
}
