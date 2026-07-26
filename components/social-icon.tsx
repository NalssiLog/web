import Image from "next/image";
import type { SocialProvider } from "@/lib/types";

export function SocialIcon({ provider, className = "size-9" }: { provider: SocialProvider; className?: string }) {
  if (provider === "NAVER") {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
        <Image src="/login/네이버_로그인_원형.png" alt="" fill sizes="44px" className="object-contain" />
      </span>
    );
  }
  if (provider === "KAKAO") {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
        <Image src="/login/카카오_로그인_원형.png" alt="" fill sizes="44px" className="object-contain" />
      </span>
    );
  }
  return <span className={`flex shrink-0 items-center justify-center rounded-full border border-[#e2e8ec] bg-white text-sm font-black ${className}`}><span className="bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_42%,#fbbc05_0_67%,#ea4335_0_84%,#4285f4_0)] bg-clip-text text-transparent">G</span></span>;
}
