"use client";

import { create } from "zustand";
import { resolveProfileImage } from "@/lib/constants";
import type { AvatarType, CurrentUser, SocialProvider } from "@/lib/types";

const AUTH_SESSION_HINT_KEY = "nalssilog-auth-session";

export function hasAuthSessionHint() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "member";
  } catch {
    return false;
  }
}

function updateAuthSessionHint(authenticated: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (authenticated) {
      window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "member");
    } else {
      window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
    }
  } catch {
    // 저장소가 차단된 인앱브라우저에서도 서버 세션을 그대로 사용한다.
  }
}

interface ServerUser {
  id: string;
  nickname: string;
  profileImageUrl?: string | null;
  avatar?: { type: AvatarType; value: string | null };
}

interface AuthState {
  user: CurrentUser;
  pendingSignupProvider?: SocialProvider;
  pendingSignupEmail?: string;
  hasCheckedServerSession: boolean;
  setPendingSignupProvider: (provider?: SocialProvider, email?: string) => void;
  setServerUser: (user?: ServerUser) => void;
  logout: () => void;
  setProfileImage: (avatarUrl?: string) => void;
  setNickname: (nickname: string) => void;
}

const anonymousUser: CurrentUser = { type: "ANONYMOUS" };

export const useAuthStore = create<AuthState>((set) => ({
  user: anonymousUser,
  pendingSignupProvider: undefined,
  pendingSignupEmail: undefined,
  hasCheckedServerSession: false,
  setPendingSignupProvider: (pendingSignupProvider, pendingSignupEmail) =>
    set({ pendingSignupProvider, pendingSignupEmail }),
  setServerUser: (serverUser) => {
    updateAuthSessionHint(Boolean(serverUser));
    set({
      user: serverUser
        ? {
            type: "MEMBER",
            id: serverUser.id,
            nickname: serverUser.nickname,
            avatarUrl: resolveProfileImage(serverUser.profileImageUrl ?? serverUser.avatar?.value),
          }
        : anonymousUser,
      hasCheckedServerSession: true,
    });
  },
  logout: () => {
    updateAuthSessionHint(false);
    set({
      user: anonymousUser,
      pendingSignupProvider: undefined,
      pendingSignupEmail: undefined,
      hasCheckedServerSession: true,
    });
  },
  setProfileImage: (avatarUrl) => set((state) => ({
    user: state.user.type === "MEMBER" ? { ...state.user, avatarUrl } : state.user,
  })),
  setNickname: (nickname) => set((state) => ({
    user: state.user.type === "MEMBER" ? { ...state.user, nickname } : state.user,
  })),
}));
