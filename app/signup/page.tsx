import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "회원가입",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupForm />;
}
