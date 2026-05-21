import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

const publicRoutes = [
  { path: "/", priority: 1 },
  { path: "/pricing", priority: 0.9 },
  { path: "/disclaimer", priority: 0.5 },
  { path: "/privacy", priority: 0.4 },
  { path: "/terms", priority: 0.4 }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.path === "/" ? "weekly" : "monthly",
    priority: route.priority
  }));
}
