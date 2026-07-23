import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/mypage", "/signup", "/reports/new"],
    },
    sitemap: "https://nalssilog.com/sitemap.xml",
    host: "https://nalssilog.com",
  };
}
