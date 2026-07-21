"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PROFILE_IMAGES, MOCK_SOCIAL_PROFILES } from "@/lib/constants";
import type { CurrentUser, SocialProvider } from "@/lib/types";

type MemberUser = Extract<CurrentUser, { type: "MEMBER" }>;
type MemberProfiles = Partial<Record<SocialProvider, MemberUser>>;

interface AuthState {
  user: CurrentUser;
  memberProfiles: MemberProfiles;
  pendingSignupProvider?: SocialProvider;
  login: (provider: SocialProvider) => void;
  signup: (provider: SocialProvider, name: string, nickname: string) => void;
  linkAndLogin: (provider: SocialProvider, sourceProvider: SocialProvider) => void;
  setPendingSignupProvider: (provider?: SocialProvider) => void;
  logout: () => void;
  withdraw: () => void;
  setProfileImage: (avatarUrl?: string) => void;
  setNickname: (nickname: string) => void;
  setSocialProviderLinked: (provider: SocialProvider, linked: boolean) => void;
}

const anonymousUser: CurrentUser = { type: "ANONYMOUS" };

const randomDefaultProfile = () =>
  DEFAULT_PROFILE_IMAGES[Math.floor(Math.random() * DEFAULT_PROFILE_IMAGES.length)].src;

const withSavedMember = (memberProfiles: MemberProfiles, user: MemberUser) => {
  const nextProfiles = { ...memberProfiles };
  const providers = new Set([user.provider, ...(user.linkedProviders ?? [])]);
  providers.forEach((provider) => {
    nextProfiles[provider] = user;
  });
  return nextProfiles;
};

const createMember = (
  provider: SocialProvider,
  name = MOCK_SOCIAL_PROFILES[provider].name,
  nickname = MOCK_SOCIAL_PROFILES[provider].nickname,
): MemberUser => ({
  type: "MEMBER",
  id: `mock-${provider.toLowerCase()}`,
  provider,
  linkedProviders: [provider],
  avatarUrl: randomDefaultProfile(),
  email: MOCK_SOCIAL_PROFILES[provider].email,
  name,
  nickname,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: anonymousUser,
      memberProfiles: {},
      pendingSignupProvider: undefined,
      login: (provider) => {
        set((state) => {
          const savedProfile = state.memberProfiles[provider];
          const user: MemberUser = savedProfile
            ? { ...savedProfile, provider, email: MOCK_SOCIAL_PROFILES[provider].email, name: savedProfile.name ?? MOCK_SOCIAL_PROFILES[provider].name }
            : createMember(provider);
          return {
            user,
            pendingSignupProvider: undefined,
            memberProfiles: withSavedMember(state.memberProfiles, user),
          };
        });
      },
      signup: (provider, name, nickname) =>
        set((state) => {
          const user = createMember(provider, name, nickname);
          return {
            user,
            pendingSignupProvider: undefined,
            memberProfiles: withSavedMember(state.memberProfiles, user),
          };
        }),
      linkAndLogin: (provider, sourceProvider) =>
        set((state) => {
          const sourceProfile = state.memberProfiles[sourceProvider];
          if (!sourceProfile) return state;
          const linkedProviders = Array.from(new Set([
            ...(sourceProfile.linkedProviders ?? [sourceProvider]),
            sourceProvider,
            provider,
          ]));
          const user: MemberUser = {
            ...sourceProfile,
            provider,
            email: MOCK_SOCIAL_PROFILES[provider].email,
            linkedProviders,
          };
          return {
            user,
            pendingSignupProvider: undefined,
            memberProfiles: withSavedMember(state.memberProfiles, user),
          };
        }),
      setPendingSignupProvider: (pendingSignupProvider) => set({ pendingSignupProvider }),
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
          const providers = new Set([state.user.provider, ...(state.user.linkedProviders ?? [])]);
          providers.forEach((provider) => delete memberProfiles[provider]);
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
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState>;
        const memberProfiles = state.memberProfiles ?? {};
        if (state.user?.type !== "MEMBER") return { ...state, user: anonymousUser, memberProfiles };
        const user: MemberUser = {
          ...state.user,
          name: state.user.name ?? MOCK_SOCIAL_PROFILES[state.user.provider].name,
          avatarUrl: state.user.avatarUrl ?? randomDefaultProfile(),
        };
        return { ...state, user, memberProfiles: withSavedMember(memberProfiles, user) };
      },
      partialize: (state) => ({ user: state.user, memberProfiles: state.memberProfiles }),
    },
  ),
);
