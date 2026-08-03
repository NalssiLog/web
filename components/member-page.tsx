"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ellipsis, Grid3X3, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthorBlockConfirmModal } from "@/components/author-block-confirm-modal";
import { ErrorState } from "@/components/error-state";
import { MyReportList } from "@/components/my-report-list";
import { ProfilePreviewModal } from "@/components/profile-preview-modal";
import { ReportActionsModal } from "@/components/report-actions-modal";
import { weatherApi } from "@/lib/api";
import { moderationApi } from "@/lib/api/moderation-api";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

export function MemberPage({ memberId }: { memberId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const showToast = useToastStore((state) => state.showToast);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const profile = useQuery({ queryKey: ["member-profile", memberId], queryFn: () => weatherApi.getMemberProfile(memberId) });
  const canBlock = currentUser.type === "MEMBER" && currentUser.id !== memberId;
  const blockAuthor = useMutation({
    mutationFn: () => {
      if (!canBlock) {
        throw new Error("로그인이 필요한 기능이에요.");
      }
      return moderationApi.blockMember(memberId);
    },
    onSuccess: () => {
      setIsBlockModalOpen(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["report-blocks"] }),
        queryClient.invalidateQueries({ queryKey: ["weather-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["member-weather-reports"] }),
      ]);
      showToast("작성자를 차단했어요.", "SUCCESS");
      router.back();
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "작성자를 차단하지 못했어요.", "ERROR");
    },
  });

  if (profile.isLoading) {
    return <MemberPageSkeleton onBack={() => router.back()} />;
  }

  if (profile.isError || !profile.data) {
    return <main className="page"><header className="safe-top spacious-page-header flex items-center justify-between pb-2"><button type="button" onClick={() => router.back()} className="header-back-button" aria-label="뒤로 가기"><ArrowLeft size={18} /></button><h1 className="text-lg font-extrabold">프로필</h1><span className="w-9" /></header><ErrorState message="사용자 정보를 불러오지 못했어요." onRetry={() => profile.refetch()} /></main>;
  }

  return (
    <main className="min-h-[75dvh] pb-12">
      <header className="safe-top spacious-page-header sticky top-0 z-30 flex items-center justify-between bg-[#eef9ff] px-5 pb-2">
        <button type="button" onClick={() => router.back()} className="header-back-button" aria-label="뒤로 가기"><ArrowLeft size={18} /></button>
        <h1 className="text-lg font-extrabold">프로필</h1>
        {canBlock ? <button type="button" onClick={() => setIsActionsOpen(true)} className="flex size-9 items-center justify-center" aria-label="프로필 작업 메뉴 열기"><Ellipsis size={20} /></button> : <span className="w-9" />}
      </header>
      <section className="flex items-center gap-5 px-5 pb-6 pt-0">
        <button type="button" onClick={() => setIsProfilePreviewOpen(true)} className="flex size-18 shrink-0 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm" style={profile.data.avatarUrl ? { backgroundImage: `url(${profile.data.avatarUrl})` } : undefined} aria-label="프로필 사진 크게 보기">
          {!profile.data.avatarUrl && <UserRound size={29} />}
        </button>
        <div className="flex h-18 min-w-0 flex-1 items-center"><p className="truncate text-base font-extrabold">{profile.data.nickname}</p></div>
      </section>
      <section className="px-5">
        <div className="mb-3 grid h-11 grid-cols-3 gap-1.5 text-[#268fc7]" aria-label="작성한 제보"><span className="flex items-center justify-center border-b-2 border-[#45ace4]"><Grid3X3 size={19} strokeWidth={2.2} /></span><span /><span /></div>
        <MyReportList memberId={memberId} columns={3} publicProfile />
      </section>
      {isProfilePreviewOpen && <ProfilePreviewModal avatarUrl={profile.data.avatarUrl} onClose={() => setIsProfilePreviewOpen(false)} />}
      {isActionsOpen && <ReportActionsModal onClose={() => setIsActionsOpen(false)} onBlock={() => setIsBlockModalOpen(true)} />}
      {isBlockModalOpen && <AuthorBlockConfirmModal isSubmitting={blockAuthor.isPending} onClose={() => setIsBlockModalOpen(false)} onConfirm={() => blockAuthor.mutate()} />}
    </main>
  );
}

function MemberPageSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <main className="min-h-[75dvh] pb-12" aria-busy="true" aria-label="사용자 프로필 불러오는 중">
      <header className="safe-top spacious-page-header sticky top-0 z-30 grid grid-cols-[36px_1fr_36px] items-center bg-[#eef9ff] px-5 pb-2">
        <button type="button" onClick={onBack} className="header-back-button" aria-label="뒤로 가기"><ArrowLeft size={18} /></button>
        <div className="skeleton mx-auto h-5 w-16 rounded" />
        <span />
      </header>
      <section className="flex items-center gap-5 px-5 pb-6 pt-0">
        <div className="skeleton size-18 shrink-0 rounded-full" />
        <div className="flex h-18 min-w-0 flex-1 items-center"><div className="skeleton h-4 w-28 rounded" /></div>
      </section>
      <section className="px-5">
        <div className="mb-3 grid h-11 grid-cols-3 gap-1.5"><span className="flex items-center justify-center border-b-2 border-[#b9dce9]"><span className="skeleton size-[19px] rounded" /></span><span /><span /></div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton aspect-square rounded-lg" />)}
        </div>
      </section>
    </main>
  );
}
