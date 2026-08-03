import Image from "next/image";
import type { SocialProvider } from "@/lib/types";

const providerAsset: Readonly<Record<SocialProvider, string>> = {
  APPLE: "/login/애플_로그인.svg",
  GOOGLE: "/login/구글_로그인_원형.svg",
  KAKAO: "/login/카카오_로그인_원형.png",
  NAVER: "/login/네이버_로그인_원형.png",
};

export function SocialIcon({ provider, className = "size-9" }: { provider: SocialProvider; className?: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
      <Image
        alt=""
        className={provider === "APPLE" ? "scale-[1.273] object-contain" : "object-contain"}
        fill
        sizes="44px"
        src={providerAsset[provider]}
      />
    </span>
  );
}
