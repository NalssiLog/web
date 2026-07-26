import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { MainTabNavigation } from "@/components/main-tab-navigation";

const siteUrl = new URL("https://nalssilog.com");
const siteDescription = "우리 동네 사람들이 직접 전하는 지금 날씨를 사진과 함께 확인하고 제보해 보세요.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "날씨로그",
    template: "%s | 날씨로그",
  },
  description: siteDescription,
  applicationName: "날씨로그",
  keywords: ["날씨로그", "동네 날씨", "실시간 날씨", "날씨 제보", "체감 날씨"],
  authors: [{ name: "날씨로그" }],
  creator: "날씨로그",
  publisher: "날씨로그",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "날씨로그",
    title: "날씨로그",
    description: siteDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "날씨로그" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "날씨로그",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "3000x3000" }],
    apple: [{ url: "/apple-icon.png", sizes: "3000x3000", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  category: "weather",
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
            <MainTabNavigation />
          </div>
        </Providers>
      </body>
    </html>
  );
}
