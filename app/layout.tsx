import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { LanguageProvider } from "@/components/language-provider";
import { SubscriptionProvider } from "@/components/subscription-provider";
import { UserProfileProvider } from "@/components/user-profile-provider";
import { absoluteUrl, openGraphImage, seoKeywords, siteName, siteUrl } from "./seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeControl — Trading Journal & AI Risk Desk for Traders",
    template: `%s | ${siteName}`
  },
  description:
    "Track every trade, analyze performance, and get AI-powered coaching. Built for prop firm and retail traders. Free trading journal with risk management tools.",
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "finance",
  keywords: seoKeywords,
  referrer: "strict-origin-when-cross-origin",
  alternates: {
    canonical: siteUrl
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "TradeControl — Trading Journal & AI Risk Desk for Traders",
    description:
      "Track every trade, analyze performance, and get AI-powered coaching. Built for prop firm and retail traders. Free trading journal with risk management tools.",
    siteName,
    type: "website",
    url: siteUrl,
    locale: "en_US",
    images: [openGraphImage]
  },
  twitter: {
    card: "summary_large_image",
    site: "@tradecontrol",
    title: "TradeControl — Trading Journal & AI Risk Desk for Traders",
    description:
      "Track every trade, analyze performance, and get AI-powered coaching. Built for prop firm and retail traders. Free trading journal with risk management tools.",
    images: [openGraphImage.url]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: siteName,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.svg")
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: siteName,
      url: absoluteUrl("/"),
      description:
        "Track every trade, analyze performance, and get AI-powered coaching. Built for prop firm and retail traders. Free trading journal with risk management tools.",
      publisher: {
        "@id": absoluteUrl("/#organization")
      }
    }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://eu.i.posthog.com" />
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="preconnect" href="https://checkout.stripe.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c")
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <UserProfileProvider>
            <LanguageProvider>
              <Suspense fallback={null}>
                <SubscriptionProvider>
                  <AnalyticsProvider>{children}</AnalyticsProvider>
                </SubscriptionProvider>
              </Suspense>
            </LanguageProvider>
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
