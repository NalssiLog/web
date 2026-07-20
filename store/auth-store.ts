"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PROFILE_IMAGES } from "@/lib/constants";
import type { CurrentUser, SocialProvider } from "@/lib/types";

type MemberUser = Extract<CurrentUser, { type: "MEMBER" }>;
type MemberProfiles = Partial<Record<SocialProvider, MemberUser>>;

interface AuthState {
  user: CurrentUser;
  memberProfiles: MemberProfiles;
  login: (provider: SocialProvider) => void;
  logout: () => void;
  withdraw: () => void;
  setProfileImage: (avatarUrl?: string) => void;
  setNickname: (nickname: string) => void;
  setSocialProviderLinked: (provider: SocialProvider, linked: boolean) => void;
}

const anonymousUser: CurrentUser = { type: "ANONYMOUS" };

const providerProfile: Record<SocialProvider, { email: string; nickname: string }> = {
  NAVER: { email: "weather-neighbor@naver.com", nickname: "초록이웃" },
  KAKAO: { email: "weather-neighbor@kakao.com", nickname: "노란이웃" },
  GOOGLE: { email: "weather-neighbor@gmail.com", nickname: "구름이웃" },
};

const randomDefaultProfile = () =>
  DEFAULT_PROFILE_IMAGES[Math.floor(Math.random() * DEFAULT_PROFILE_IMAGES.length)].src;

const withSavedMember = (memberProfiles: MemberProfiles, user: MemberUser) => ({
  ...memberProfiles,
  [user.provider]: user,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: anonymousUser,
      memberProfiles: {},
      login: (provider) => {
        set((state) => {
          const savedProfile = state.memberProfiles[provider];
          const user: MemberUser = savedProfile ?? {
            type: "MEMBER",
            id: `mock-${provider.toLowerCase()}`,
            provider,
            linkedProviders: [provider],
            avatarUrl: randomDefaultProfile(),
            ...providerProfile[provider],
          };
          return {
            user,
            memberProfiles: savedProfile
              ? state.memberProfiles
              : withSavedMember(state.memberProfiles, user),
          };
        });
      },
      logout: () =>
        set((state) => ({
          user: anonymousUser,
          memberProfiles: state.user.type === "MEMBER"
            ? withSavedMember(state.memberProfiles, state.user)
            : state.memberProfiles,
        })),
      withdraw: () =>
        set((state) => {
          if (state.user.type !== "MEMBER") return { user: anonymousUser };
          const memberProfiles = { ...state.memberProfiles };
          delete memberProfiles[state.user.provider];
          return { user: anonymousUser, memberProfiles };
        }),
      setProfileImage: (avatarUrl) =>
        set((state) => {
          if (state.user.type !== "MEMBER") return state;
          const user = { ...state.user, avatarUrl };
          return { user, memberProfiles: withSavedMember(state.memberProfiles, user) };
        }),
      setNickname: (nickname) =>
        set((state) => {
          if (state.user.type !== "MEMBER") return state;
          const user = { ...state.user, nickname };
          return { user, memberProfiles: withSavedMember(state.memberProfiles, user) };
        }),
      setSocialProviderLinked: (provider, linked) =>
        set((state) => {
          if (state.user.type !== "MEMBER") return state;
          const current = state.user.linkedProviders ?? [state.user.provider];
          const linkedProviders = linked
            ? Array.from(new Set([...current, provider]))
            : current.filter((item) => item !== provider);
          const user = { ...state.user, linkedProviders };
          return { user, memberProfiles: withSavedMember(state.memberProfiles, user) };
        }),
    }),
    {
      name: "your-weather-auth",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState>;
        const memberProfiles = state.memberProfiles ?? {};
        if (state.user?.type !== "MEMBER") return { ...state, user: anonymousUser, memberProfiles };
        const user: MemberUser = state.user.avatarUrl
          ? state.user
          : { ...state.user, avatarUrl: randomDefaultProfile() };
        return { ...state, user, memberProfiles: withSavedMember(memberProfiles, user) };
      },
      partialize: (state) => ({ user: state.user, memberProfiles: state.memberProfiles }),
    },
  ),
);
