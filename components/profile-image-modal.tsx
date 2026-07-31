"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, UserRound, X } from "lucide-react";
import { useModalNavigation } from "@/hooks/use-modal-navigation";
import { DEFAULT_PROFILE_IMAGES } from "@/lib/constants";
import { isSupportedAvatarSource, normalizeSelectedImage } from "@/lib/image";
import { useToastStore } from "@/store/toast-store";

const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;

export type ProfileImageSelection =
  | { type: "PRESET"; value: string }
  | { type: "CUSTOM"; file: File };

export function ProfileImageModal({
  current,
  onClose,
  onChange,
}: {
  current?: string;
  onClose: () => void;
  onChange: (selection: ProfileImageSelection) => boolean | void | Promise<boolean | void>;
}) {
  const showToast = useToastStore((state) => state.showToast);
  const [selectedProfile, setSelectedProfile] = useState(current);
  const [selection, setSelection] = useState<ProfileImageSelection>();
  const objectUrlRef = useRef<string | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);
  const closeModal = useModalNavigation({
    open: true,
    onBack: () => {
      if (!isSaving) onClose();
    },
    onDismiss: onClose,
  });

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const clearObjectUrl = () => {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = undefined;
  };

  const saveProfile = async () => {
    if (!selection) return;
    setIsSaving(true);
    try {
      const saved = await onChange(selection);
      if (saved === false) return;
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;
    const file = normalizeSelectedImage(selectedFile);
    if (!isSupportedAvatarSource(file)) {
      showToast("JPG, PNG, WEBP, HEIC 사진을 선택해 주세요.", "ERROR");
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_SIZE) {
      showToast("20MB 이하의 사진을 선택해 주세요.", "ERROR");
      return;
    }
    clearObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setSelectedProfile(objectUrl);
    setSelection({ type: "CUSTOM", file });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="profile-image-modal-title">
      <div className="w-full max-w-[380px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h3 id="profile-image-modal-title" className="text-center text-lg font-extrabold">프로필 사진 변경</h3>
          <button type="button" disabled={isSaving} onClick={() => closeModal()} className="icon-button disabled:opacity-50" aria-label="닫기"><X size={19} /></button>
        </div>

        <div className="mt-5 flex justify-center">
          <span
            className="flex size-24 items-center justify-center rounded-full bg-white bg-cover bg-center text-[#45ace4] shadow-sm"
            style={selectedProfile ? { backgroundImage: `url(${selectedProfile})` } : undefined}
            aria-label="선택한 프로필 사진 미리보기"
          >
            {!selectedProfile && <UserRound size={38} />}
          </span>
        </div>

        <div className="mt-5 rounded-[20px] border-2 border-[#d2e3ec] p-4">
          <p className="text-xs font-extrabold text-[#526b7a]">기본 프로필</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {DEFAULT_PROFILE_IMAGES.map((profile) => (
              <button key={profile.src} type="button" disabled={isSaving} onClick={() => {
                clearObjectUrl();
                setSelectedProfile(profile.src);
                setSelection(profile.src === current ? undefined : { type: "PRESET", value: profile.id });
              }} aria-label={`${profile.label} 프로필 선택`} className="relative mx-auto flex size-14 items-center justify-center overflow-hidden rounded-full transition">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.src} alt="" className="size-full rounded-full" />
                {selectedProfile === profile.src && <span className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-[#238fc9]" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[#d2e3ec] px-4 py-3.5 text-sm font-extrabold transition hover:border-[#9fd4ee] hover:text-[#238fc9]">
            <ImagePlus size={18} className="text-[#45ace4]" /> 내 사진에서 선택
            <input type="file" disabled={isSaving} accept="image/*" onChange={uploadImage} className="sr-only" />
          </label>
        </div>
        <button type="button" disabled={!selection || isSaving} onClick={() => void saveProfile()} className="mt-3 w-full rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">{isSaving ? "저장하는 중…" : "저장"}</button>
      </div>
    </div>
  );
}
