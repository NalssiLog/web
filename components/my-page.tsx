"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Grid3X3, Pencil, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MyReportList } from "@/components/my-report-list";
import { NicknameEditModal } from "@/components/nickname-edit-modal";
import { ProfileImageModal, type ProfileImageSelection } from "@/components/profile-image-modal";
import { ProfilePreviewModal } from "@/components/profile-preview-modal";
import { UserPanel } from "@/components/user-panel";
import { memberApi } from "@/lib/api/member-api";
import { resolveProfileImage } from "@/lib/constants";
import { optimizeAvatarImage } from "@/lib/image";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

export function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasCheckedServerSession = useAuthStore((state) => state.hasCheckedServerSession);
  const setProfileImage = useAuthStore((state) => state.setProfileImage);
  const setNickname = useAuthStore((state) => state.setNickname);
  const showToast = useToastStore((state) => state.showToast);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileImageOpen, setIsProfileImageOpen] = useState(false);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [isNicknameOpen, setIsNicknameOpen] = useState(false);
  const account = useQuery({
    queryKey: ["members", "me"],
    queryFn: memberApi.getMe,
    enabled: user.type === "MEMBER",
    retry: false,
  });
  const accountAvatar = resolveProfileImage(account.data?.avatar.profileImageUrl ?? account.data?.avatar.value);
  const avatarUrl = accountAvatar ?? (user.type === "MEMBER" ? user.avatarUrl : undefined);
  const nickname = account.data?.nickname ?? (user.type === "MEMBER" ? user.nickname : "");

  const saveNickname = async (nickname: string) => {
    try {
      const updatedAccount = await memberApi.updateNickname(nickname);
      setNickname(updatedAccount.nickname);
      queryClient.setQueryData(["members", "me"], updatedAccount);
      setIsNicknameOpen(false);
      showToast("닉네임을 변경했어요.", "SUCCESS");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "닉네임을 변경하지 못했어요.", "ERROR");
    }
  };

  const saveProfileImage = async (selection: ProfileImageSelection) => {
    try {
      const updatedAccount = selection.type === "PRESET"
        ? await memberApi.updateAvatar("PRESET", selection.value)
        : await memberApi.updateCustomAvatar(await optimizeAvatarImage(selection.file));
      setProfileImage(resolveProfileImage(updatedAccount.avatar.profileImageUrl ?? updatedAccount.avatar.value));
      queryClient.setQueryData(["members", "me"], updatedAccount);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["weather-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["weather-report"] }),
        queryClient.invalidateQueries({ queryKey: ["my-weather-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["member-weather-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["member-profile", updatedAccount.id] }),
      ]);
      showToast("프로필 사진을 변경했어요.", "SUCCESS");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "프로필 사진을 변경하지 못했어요.", "ERROR");
      return false;
    }
  };

  useEffect(() => {
    if (hasCheckedServerSession && user.type !== "MEMBER") router.replace("/");
  }, [hasCheckedServerSession, router, user.type]);

  if (!hasCheckedServerSession) {
    return <main className="min-h-[75dvh] pb-28" aria-busy="true"><header className="safe-top grid grid-cols-[42px_1fr_42px] items-center px-5 pb-3"><span /><div className="skeleton mx-auto h-5 w-20 rounded" /><span /></header><section className="flex items-center gap-5 px-5 py-6"><div className="skeleton size-18 rounded-full" /><div className="skeleton h-4 w-28 rounded" /></section><section className="px-5"><div className="skeleton mb-3 h-11 rounded" /><div className="grid grid-cols-3 gap-1.5">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton aspect-square rounded-lg" />)}</div></section></main>;
  }

  if (user.type !== "MEMBER") {
    return null;
  }

  return (
    <main className="min-h-[75dvh] pb-28">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-[#eef9ff] px-5 pb-3">
        <button type="button" onClick={() => router.back()} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button>
        <h1 className="text-lg font-extrabold">마이페이지</h1>
        <button type="button" onClick={() => setIsSettingsOpen(true)} className="icon-button" aria-label="설정 열기"><Settings size={21} /></button>
      </header>

      <section className="px-5 py-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <button type="button" onClick={() => setIsProfilePreviewOpen(true)} className="flex size-18 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm ring-2 ring-white" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined} aria-label="프로필 사진 크게 보기">
              {!avatarUrl && <UserRound size={29} />}
            </button>
            <button type="button" onClick={() => setIsProfileImageOpen(true)} className="absolute bottom-0 right-0 flex size-6.5 items-center justify-center rounded-full border-2 border-[#eef9ff] bg-[#45ace4] text-white" aria-label="프로필 사진 수정"><Pencil size={11} /></button>
          </div>
          <div className="flex h-18 min-w-0 flex-1 items-center justify-between gap-3">
            <p className="truncate text-base font-extrabold">{nickname}</p>
            <button type="button" onClick={() => setIsNicknameOpen(true)} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#b9dceb] bg-[#e5f5fe] px-2.5 py-1 text-[10px] font-extrabold text-[#238fc9] shadow-sm shadow-[#9bcce5]/10 transition hover:border-[#8bcdf0] hover:bg-[#d8f0fd] active:scale-[.98]"><Pencil size={11} /> 닉네임 수정</button>
          </div>
        </div>
      </section>

      <section className="px-5 pt-0">
        <div className="mb-3 grid h-11 grid-cols-3 gap-1.5 border-b-2 border-[#45ace4] text-[#268fc7]" aria-label="작성한 제보"><span className="flex items-center justify-center"><Grid3X3 size={19} strokeWidth={2.2} /></span><span /><span /></div>
        <MyReportList memberId={user.id} columns={3} />
      </section>

      <UserPanel open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isProfileImageOpen && <ProfileImageModal current={avatarUrl} onClose={() => setIsProfileImageOpen(false)} onChange={saveProfileImage} />}
      {isProfilePreviewOpen && <ProfilePreviewModal avatarUrl={avatarUrl} onClose={() => setIsProfilePreviewOpen(false)} />}
      {isNicknameOpen && <NicknameEditModal currentNickname={nickname} onClose={() => setIsNicknameOpen(false)} onSave={saveNickname} />}
    </main>
  );
}
