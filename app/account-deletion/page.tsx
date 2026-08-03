import type { Metadata } from "next";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SERVICE_CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "계정 및 데이터 삭제 요청",
  description: "로그인 없이 날씨로그 계정 또는 비회원 제보 데이터의 삭제를 요청하는 방법을 안내합니다.",
  alternates: { canonical: "/account-deletion" },
};

const deletionRequestHref = `mailto:${SERVICE_CONTACT_EMAIL}?subject=${encodeURIComponent("[날씨로그] 계정 또는 데이터 삭제 요청")}&body=${encodeURIComponent("요청 유형(회원 계정/비회원 제보):\n알고 있는 가입 정보 또는 제보 링크:\n요청 내용:\n")}`;

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen px-5 pb-10">
      <header className="safe-top compact-page-header grid grid-cols-[36px_1fr_36px] items-center pb-2">
        <Link href="/" className="header-back-button" aria-label="홈으로 돌아가기">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-center text-lg font-extrabold">계정 및 데이터 삭제 요청</h1>
        <span />
      </header>

      <div className="rounded-[22px] border-2 border-[#d2e3ec] p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-[#45ace4]">
            <ShieldCheck size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">로그인하지 않아도 요청할 수 있어요</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#526a7a]">
              앱을 삭제했거나 로그인할 수 없는 경우에도 아래 공식 이메일로 회원 계정 또는 비회원 제보 데이터의 삭제를 요청할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[18px] border-2 border-[#d2e3ec] p-4 text-sm font-semibold leading-6 text-[#526a7a]">
          <p className="font-extrabold text-[#173144]">알고 있는 정보만 알려주세요</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-[#45ace4]">
            <li>회원: 가입한 소셜 서비스, 이메일 또는 닉네임</li>
            <li>비회원: 삭제할 제보의 링크, 동네 또는 작성 시각</li>
            <li>요청하려는 삭제 범위</li>
          </ul>
          <p className="mt-3 text-xs text-[#718594]">비밀번호, 인증번호, 소셜 토큰은 보내지 마세요.</p>
        </div>

        <a
          href={deletionRequestHref}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#45ace4] px-4 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#299bd8]"
        >
          <Mail size={17} />
          이메일로 삭제 요청하기
        </a>

        <p className="mt-3 break-all text-center text-xs font-bold text-[#718594]">
          {SERVICE_CONTACT_EMAIL}
        </p>
        <p className="mt-5 text-xs font-semibold leading-5 text-[#718594]">
          날씨로그 팀은 전달받은 정보로 요청 대상과 소유 여부를 확인한 뒤 삭제 절차를 안내합니다. 확인에 필요한 정보가 부족하면 추가 확인을 요청할 수 있으며, 법령상 보관이 필요한 정보는 개인정보처리방침에 따릅니다.
        </p>
        <Link href="/privacy" className="mt-3 block text-center text-xs font-extrabold text-[#238fc9] hover:underline">
          개인정보처리방침 확인하기
        </Link>
      </div>
    </main>
  );
}
