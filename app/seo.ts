import type { Metadata } from "next";

export const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tradecontrol.app";

export const siteName = "TradeControl";

export const defaultDescription =
  "TradeControl is a professional trading journal, risk manager, analytics dashboard, and AI coaching workspace for disciplined traders.";

export const seoKeywords = [
  "trading journal",
  "trade journal",
  "trading analytics",
  "risk management dashboard",
  "AI trading coach",
  "trading discipline",
  "trade tracking software",
  "trading performance tracker",
  "forex trading journal",
  "futures trading journal",
  "stock trading journal"
];

export const openGraphImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "TradeControl trading journal and risk dashboard"
};

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    keywords: seoKeywords,
    alternates: {
      canonical: path
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      siteName,
      type: "website",
      url: path,
      images: [openGraphImage]
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteName}`,
      description,
      images: [openGraphImage.url]
    },
    ...(noIndex ? noIndexMetadata : {})
  };
}
