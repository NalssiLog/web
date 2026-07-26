import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "날씨로그",
    short_name: "날씨로그",
    description: "우리 동네 사람들이 직접 전하는 지금 날씨",
    start_url: "/",
    display: "standalone",
    background_color: "#eef9ff",
    theme_color: "#8dd3f7",
    lang: "ko",
    icons: [
      {
        src: "/icon.png",
        sizes: "3000x3000",
        type: "image/png",
      },
    ],
  };
}
