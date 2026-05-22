import type { Metadata } from "next";

export const siteUrl = "https://tradecontrol.xyz";

export const siteName = "TradeControl";

export const defaultDescription =
  "TradeControl is a professional trading journal, risk manager, analytics dashboard, and AI coaching workspace for disciplined traders.";

export const seoKeywords = [
  "trading journal",
  "prop firm journal",
  "trade tracker",
  "AI trading coach",
  "risk management",
  "FTMO journal",
  "forex journal",
  "trade journal",
  "trading analytics",
  "risk management dashboard",
  "trading discipline",
  "trade tracking software",
  "trading performance tracker",
  "futures trading journal",
  "stock trading journal"
];

export const openGraphImage = {
  url: "https://tradecontrol.xyz/opengraph-image",
  width: 1200,
  height: 630,
  alt: "TradeControl — Trading Journal and AI Risk Desk"
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
  keywords = seoKeywords,
  noIndex = false
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title: {
      absolute: title
    },
    description,
    keywords,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
      url,
      images: [openGraphImage]
    },
    twitter: {
      card: "summary_large_image",
      site: "@tradecontrol",
      title,
      description,
      images: [openGraphImage.url]
    },
    ...(noIndex ? noIndexMetadata : {})
  };
}
