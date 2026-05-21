import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms", "/disclaimer"],
        disallow: [
          "/api/",
          "/dashboard",
          "/trades",
          "/analytics",
          "/calendar",
          "/risk-manager",
          "/expenses",
          "/ai-coach",
          "/reports",
          "/settings",
          "/onboarding",
          "/login",
          "/register",
          "/forgot-password",
          "/dev/"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
