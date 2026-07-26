"use client";

import { Camera, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { UserPanel } from "@/components/user-panel";
import { useAuthStore } from "@/store/auth-store";

interface MainTabItem {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
  emphasis?: boolean;
}

const MAIN_TAB_PATHS = new Set(["/", "/mypage"]);

const MAIN_TAB_ITEMS: MainTabItem[] = [
  {
    href: "/",
    label: "홈",
    icon: <Home size={21} />,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/reports/new",
    label: "제보",
    icon: <Camera size={20} />,
    isActive: (pathname) => pathname === "/reports/new",
    emphasis: true,
  },
];

export function MainTabNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [isGuestMenuOpen, setIsGuestMenuOpen] = useState(false);

  if (!MAIN_TAB_PATHS.has(pathname)) return null;

  const profileActive = pathname === "/mypage";
  const profileContent = (
    <span
      className={`flex size-8 items-center justify-center rounded-full bg-white bg-cover bg-center ${
        profileActive ? "ring-2 ring-[#45ace4]" : "ring-1 ring-[#d9e7ee]"
      }`}
      style={user.type === "MEMBER" && user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
      aria-hidden="true"
    >
      {(user.type !== "MEMBER" || !user.avatarUrl) && <UserRound size={17} />}
    </span>
  );

  return (
    <>
      <nav className="main-tab-bar" aria-label="주요 메뉴">
        <div className="grid grid-cols-3 items-end">
          {MAIN_TAB_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center transition-colors ${
                  item.emphasis ? "text-[#268fc7]" : active ? "text-[#268fc7]" : "text-[#718594]"
                }`}
              >
                {item.emphasis
                  ? <span className="flex size-9 items-center justify-center rounded-[14px] bg-[#45ace4] text-white shadow-md shadow-[#45ace4]/20">{item.icon}</span>
                  : item.icon}
              </Link>
            );
          })}
          {user.type === "MEMBER" ? (
            <Link
              href="/mypage"
              aria-label="프로필"
              aria-current={profileActive ? "page" : undefined}
              className={`flex min-h-14 items-center justify-center transition-colors ${
                profileActive ? "text-[#268fc7]" : "text-[#718594]"
              }`}
            >
              {profileContent}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsGuestMenuOpen(true)}
              className="flex min-h-14 items-center justify-center text-[#718594] transition-colors hover:text-[#268fc7]"
              aria-label="로그인 및 서비스 메뉴 열기"
            >
              {profileContent}
            </button>
          )}
        </div>
      </nav>
      <UserPanel open={isGuestMenuOpen} onClose={() => setIsGuestMenuOpen(false)} />
    </>
  );
}
