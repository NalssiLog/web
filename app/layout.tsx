import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "너의 날씨는",
  description: "우리 동네 사람들이 직접 전하는 지금 날씨",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6fbff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div className="app-shell">
            {children}
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
