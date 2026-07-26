"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { authApi } from "@/lib/api/auth-api";
import { getTextLength } from "@/lib/text";

type CheckState = "IDLE" | "CHECKING" | "AVAILABLE" | "TAKEN";

const nicknamePattern = /^[가-힣a-zA-Z0-9]{2,10}$/;
const isNicknameValid = (value: string) => value === value.trim() && nicknamePattern.test(value);

export function NicknameEditModal({
  currentNickname,
  onClose,
  onSave,
}: {
  currentNickname: string;
  onClose: () => void;
  onSave: (nickname: string) => void | Promise<void>;
}) {
  const [nickname, setNickname] = useState(currentNickname);
  const [checkState, setCheckState] = useState<CheckState>("IDLE");
  const [isSaving, setIsSaving] = useState(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkRequestRef = useRef(0);
  const normalizedNickname = nickname.trim();
  const isValid = isNicknameValid(nickname);
  const hasFeedback = (!isValid && nickname.length > 0) || checkState === "AVAILABLE" || checkState === "TAKEN";

  useEffect(() => () => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
  }, []);

  const changeNickname = (value: string) => {
    if (getTextLength(value) > 10) return;

    const nextNickname = value;
    setNickname(nextNickname);
    checkRequestRef.current += 1;
    const requestId = checkRequestRef.current;
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    if (!isNicknameValid(nextNickname)) {
      setCheckState("IDLE");
      return;
    }

    setCheckState("CHECKING");
    checkTimerRef.current = setTimeout(async () => {
      try {
        const available = nextNickname === currentNickname
          ? true
          : (await authApi.checkNickname(nextNickname)).available;
        if (requestId !== checkRequestRef.current) return;
        setCheckState(available ? "AVAILABLE" : "TAKEN");
      } catch {
        if (requestId === checkRequestRef.current) setCheckState("IDLE");
      }
    }, 350);
  };

  const save = async () => {
    if (checkState !== "AVAILABLE") return;
    setIsSaving(true);
    try {
      await onSave(normalizedNickname);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#173144]/35 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="nickname-modal-title">
      <div className="w-full max-w-[440px] rounded-[24px] bg-[#eef9ff] p-5 shadow-2xl">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <span />
          <h3 id="nickname-modal-title" className="text-center text-lg font-extrabold">닉네임 변경</h3>
          <button type="button" onClick={onClose} className="icon-button" aria-label="닫기"><X size={19} /></button>
        </div>

        <div className="mt-5 rounded-[18px] border-2 border-[#d2e3ec] p-3.5">
          <label htmlFor="nickname" className="sr-only">새 닉네임</label>
          <div className="relative">
            <input
              id="nickname"
              value={nickname}
              maxLength={10}
              onBeforeInput={(event) => {
                const inputType = (event.nativeEvent as InputEvent).inputType;
                if (typeof inputType === "string" && inputType.startsWith("insert") && getTextLength(nickname) >= 10) {
                  event.preventDefault();
                }
              }}
              onKeyDown={(event) => {
                const isCharacterKey = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
                if (isCharacterKey && getTextLength(nickname) >= 10) event.preventDefault();
              }}
              onPaste={(event) => {
                const selectionStart = event.currentTarget.selectionStart ?? 0;
                const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
                const selectedLength = getTextLength(nickname.slice(selectionStart, selectionEnd));
                const pastedLength = getTextLength(event.clipboardData.getData("text"));
                if (getTextLength(nickname) >= 10 || getTextLength(nickname) - selectedLength + pastedLength > 10) event.preventDefault();
              }}
              onChange={(event) => {
                const nextNickname = event.currentTarget.value;
                if (getTextLength(nextNickname) > 10) {
                  const caretAfterInput = event.currentTarget.selectionStart ?? nickname.length;
                  const insertedLength = nextNickname.length - nickname.length;
                  const restoredCaret = Math.max(0, caretAfterInput - insertedLength);
                  event.currentTarget.value = nickname;
                  event.currentTarget.setSelectionRange(restoredCaret, restoredCaret);
                  return;
                }
                changeNickname(nextNickname);
              }}
              className="w-full rounded-xl border-2 border-[#dce8ee] px-3 py-2.5 pr-10 text-sm font-bold outline-none transition focus:border-[#45ace4]"
              placeholder="닉네임 입력"
            />
            {checkState === "CHECKING" && <LoaderCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#45ace4]" aria-label="닉네임 중복 확인 중" />}
          </div>
          <p className="mt-1.5 text-right text-[11px] font-bold text-[#8ba0ae]">{getTextLength(nickname)}/10</p>
          {hasFeedback && <div className="mt-2 text-xs font-bold">
            {!isValid && nickname.length > 0 && <p className="whitespace-nowrap text-[9px] tracking-[-0.03em] text-[#c95e5e] min-[390px]:text-[10px] sm:text-[11px]">공백과 초성을 제외한 한글, 영문, 숫자 2~10자로 입력해주세요.</p>}
            {checkState === "AVAILABLE" && <p className="flex items-center gap-1 text-[#2d9b67]"><Check size={14} /> 사용할 수 있는 닉네임이에요.</p>}
            {checkState === "TAKEN" && <p className="text-[#c95e5e]">이미 사용 중인 닉네임이에요.</p>}
          </div>}
        </div>

        <button type="button" disabled={checkState !== "AVAILABLE" || isSaving} onClick={() => void save()} className="mt-4 w-full rounded-2xl bg-[#45ace4] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#299bd8] disabled:cursor-not-allowed disabled:bg-[#b9d5e4]">{isSaving ? "변경하는 중…" : "변경하기"}</button>
      </div>
    </div>
  );
}
