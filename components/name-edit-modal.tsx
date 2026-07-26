"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { getTextLength } from "@/lib/text";

export function NameEditModal({
  currentName,
  onClose,
  onSave,
}: {
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const normalizedName = name.trim();
  const nameLength = getTextLength(name);
  const isValid = getTextLength(normalizedName) > 0 && getTextLength(normalizedName) <= 30;
  const canSave = isValid && normalizedName !== currentName.trim() && !isSaving;

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await onSave(normalizedName);
    } catch {
      // 저장 실패 안내는 호출 화면의 전역 토스트에서 처리한다.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="name-modal-title">
      <div className="w-full max-w-[380px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h3 id="name-modal-title" className="text-center text-lg font-extrabold">이름 변경</h3>
          <button type="button" onClick={onClose} className="icon-button" aria-label="닫기"><X size={19} /></button>
        </div>

        <div className="mt-5 rounded-[18px] border-2 border-[#d2e3ec] p-3.5">
          <label htmlFor="member-name" className="sr-only">이름</label>
          <input
            id="member-name"
            value={name}
            maxLength={30}
            autoComplete="name"
            onChange={(event) => {
              const nextName = event.currentTarget.value;
              if (getTextLength(nextName) <= 30) setName(nextName);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              }
            }}
            className="w-full rounded-xl border-2 border-[#dce8ee] px-3 py-2.5 text-sm font-bold outline-none transition focus:border-[#45ace4]"
            placeholder="이름 입력"
          />
          <p className="mt-1.5 text-right text-[11px] font-bold text-[#8ba0ae]">{nameLength}/30</p>
          {name.length > 0 && !isValid && <p className="mt-2 text-xs font-bold text-[#c95e5e]">공백을 제외한 이름을 입력해 주세요.</p>}
        </div>

        <button type="button" disabled={!canSave} onClick={() => void save()} className="mt-4 w-full rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">{isSaving ? "변경하는 중…" : "변경하기"}</button>
      </div>
    </div>
  );
}
