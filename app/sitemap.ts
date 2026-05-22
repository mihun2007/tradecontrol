import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/features", priority: 0.8, changeFrequency: "monthly" },
  { path: "/login", priority: 0.5, changeFrequency: "yearly" },
  { path: "/register", priority: 0.6, changeFrequency: "yearly" }
] satisfies Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}>;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
