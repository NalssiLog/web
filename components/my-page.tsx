"use client";

import { ArrowLeft, Grid3X3, Pencil, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MyReportList } from "@/components/my-report-list";
import { NicknameEditModal } from "@/components/nickname-edit-modal";
import { ProfileImageModal } from "@/components/profile-image-modal";
import { ProfilePreviewModal } from "@/components/profile-preview-modal";
import { UserPanel } from "@/components/user-panel";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

export function MyPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setProfileImage = useAuthStore((state) => state.setProfileImage);
  const setNickname = useAuthStore((state) => state.setNickname);
  const showToast = useToastStore((state) => state.showToast);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileImageOpen, setIsProfileImageOpen] = useState(false);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [isNicknameOpen, setIsNicknameOpen] = useState(false);

  useEffect(() => {
    if (user.type !== "MEMBER") router.replace("/");
  }, [router, user.type]);

  if (user.type !== "MEMBER") {
    return null;
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-[#eef9ff] px-5 pb-3">
        <button type="button" onClick={() => router.back()} className="icon-button" aria-label="뒤로 가기"><ArrowLeft size={21} /></button>
        <h1 className="text-lg font-extrabold">마이페이지</h1>
        <button type="button" onClick={() => setIsSettingsOpen(true)} className="icon-button" aria-label="설정 열기"><Settings size={21} /></button>
      </header>

      <section className="px-5 py-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <button type="button" onClick={() => setIsProfilePreviewOpen(true)} className="flex size-18 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm ring-2 ring-white" style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined} aria-label="프로필 사진 크게 보기">
              {!user.avatarUrl && <UserRound size={29} />}
            </button>
            <button type="button" onClick={() => setIsProfileImageOpen(true)} className="absolute bottom-0 right-0 flex size-6.5 items-center justify-center rounded-full border-2 border-[#eef9ff] bg-[#45ace4] text-white" aria-label="프로필 사진 수정"><Pencil size={11} /></button>
          </div>
          <div className="flex h-18 min-w-0 flex-1 items-center justify-between gap-3">
            <p className="truncate text-base font-extrabold">{user.nickname}</p>
            <button type="button" onClick={() => setIsNicknameOpen(true)} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#b9dceb] bg-[#e5f5fe] px-2.5 py-1 text-[10px] font-extrabold text-[#238fc9] shadow-sm shadow-[#9bcce5]/10 transition hover:border-[#8bcdf0] hover:bg-[#d8f0fd] active:scale-[.98]"><Pencil size={11} /> 닉네임 수정</button>
          </div>
        </div>
      </section>

      <section className="px-5 pt-0">
        <div className="mb-3 flex h-11 items-center justify-start border-b-2 border-[#45ace4] pl-1 text-[#268fc7]" aria-label="작성한 제보"><Grid3X3 size={19} strokeWidth={2.2} /></div>
        <MyReportList memberId={user.id} columns={3} />
      </section>

      <UserPanel open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {isProfileImageOpen && <ProfileImageModal current={user.avatarUrl} onClose={() => setIsProfileImageOpen(false)} onChange={setProfileImage} />}
      {isProfilePreviewOpen && <ProfilePreviewModal avatarUrl={user.avatarUrl} onClose={() => setIsProfilePreviewOpen(false)} />}
      {isNicknameOpen && <NicknameEditModal currentNickname={user.nickname} onClose={() => setIsNicknameOpen(false)} onSave={(nickname) => { setNickname(nickname); setIsNicknameOpen(false); showToast("닉네임을 변경했어요.", "SUCCESS"); }} />}
    </main>
  );
}
