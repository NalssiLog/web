import type { MetadataRoute } from "next";

const publicRoutes = ["", "/privacy-policy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicRoutes.map((route, index) => ({
    url: `https://nalssilog.com${route}`,
    lastModified,
    changeFrequency: index === 0 ? "hourly" : "monthly",
    priority: index === 0 ? 1 : 0.4,
  }));
}
