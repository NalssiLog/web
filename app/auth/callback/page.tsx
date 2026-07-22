import { Suspense } from "react";
import { AuthCallbackScreen } from "@/components/auth-callback-screen";

export default function AuthCallbackPage() {
  return <Suspense fallback={<main className="min-h-[75dvh]" />}><AuthCallbackScreen /></Suspense>;
}
