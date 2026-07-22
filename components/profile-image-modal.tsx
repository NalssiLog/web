"use client";

import { useState, type ChangeEvent } from "react";
import { ImagePlus, UserRound, X } from "lucide-react";
import { DEFAULT_PROFILE_IMAGES } from "@/lib/constants";
import { useToastStore } from "@/store/toast-store";

export function ProfileImageModal({
  current,
  onClose,
  onChange,
}: {
  current?: string;
  onClose: () => void;
  onChange: (avatarUrl?: string) => boolean | void | Promise<boolean | void>;
}) {
  const showToast = useToastStore((state) => state.showToast);
  const [selectedProfile, setSelectedProfile] = useState(current);

  const [isSaving, setIsSaving] = useState(false);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const saved = await onChange(selectedProfile);
      if (saved === false) return;
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      showToast("JPG, PNG, WEBP 이미지만 선택할 수 있어요.", "ERROR");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("프로필 사진은 2MB 이하로 선택해 주세요.", "ERROR");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setSelectedProfile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="profile-image-modal-title">
      <div className="w-full max-w-[380px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h3 id="profile-image-modal-title" className="text-center text-lg font-extrabold">프로필 사진 변경</h3>
          <button type="button" onClick={onClose} className="icon-button" aria-label="닫기"><X size={19} /></button>
        </div>

        <div className="mt-5 flex justify-center">
          <span
            className="flex size-24 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm ring-4 ring-white"
            style={selectedProfile ? { backgroundImage: `url(${selectedProfile})` } : undefined}
            aria-label="선택한 프로필 사진 미리보기"
          >
            {!selectedProfile && <UserRound size={38} />}
          </span>
        </div>

        <div className="mt-5 rounded-[20px] bg-white p-4">
          <p className="text-xs font-extrabold text-[#526b7a]">기본 프로필</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {DEFAULT_PROFILE_IMAGES.map((profile) => (
              <button key={profile.src} type="button" onClick={() => setSelectedProfile(profile.src)} aria-label={`${profile.label} 프로필 선택`} className={`mx-auto flex size-14 items-center justify-center rounded-full border-2 p-1 transition ${selectedProfile === profile.src ? "border-[#45ace4]" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.src} alt="" className="size-full rounded-full" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-extrabold transition hover:text-[#238fc9]">
            <ImagePlus size={18} className="text-[#45ace4]" /> 내 사진에서 선택
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} className="sr-only" />
          </label>
        </div>
        <button type="button" disabled={selectedProfile === current || isSaving} onClick={() => void saveProfile()} className="mt-3 w-full rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">{isSaving ? "저장하는 중…" : "저장"}</button>
      </div>
    </div>
  );
}
