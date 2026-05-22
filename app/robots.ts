import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/features", "/blog"],
        disallow: [
          "/dashboard",
          "/trades",
          "/trades/new",
          "/analytics",
          "/ai-coach",
          "/reports",
          "/risk-manager",
          "/expenses",
          "/calendar",
          "/settings"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
