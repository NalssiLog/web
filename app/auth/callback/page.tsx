import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCallbackScreen } from "@/components/auth-callback-screen";

export const metadata: Metadata = {
  title: "로그인 확인",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return <Suspense fallback={<main className="min-h-[75dvh]" />}><AuthCallbackScreen /></Suspense>;
}
