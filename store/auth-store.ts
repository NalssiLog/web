"use client";

import { create } from "zustand";
import { resolveProfileImage } from "@/lib/constants";
import type { AvatarType, CurrentUser, SocialProvider } from "@/lib/types";

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
  setServerUser: (serverUser) => set({
    user: serverUser
      ? {
          type: "MEMBER",
          id: serverUser.id,
          nickname: serverUser.nickname,
          avatarUrl: resolveProfileImage(serverUser.profileImageUrl ?? serverUser.avatar?.value),
        }
      : anonymousUser,
    hasCheckedServerSession: true,
  }),
  logout: () => set({
    user: anonymousUser,
    pendingSignupProvider: undefined,
    pendingSignupEmail: undefined,
    hasCheckedServerSession: true,
  }),
  setProfileImage: (avatarUrl) => set((state) => ({
    user: state.user.type === "MEMBER" ? { ...state.user, avatarUrl } : state.user,
  })),
  setNickname: (nickname) => set((state) => ({
    user: state.user.type === "MEMBER" ? { ...state.user, nickname } : state.user,
  })),
}));
