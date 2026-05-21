import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { LanguageProvider } from "@/components/language-provider";
import { SubscriptionProvider } from "@/components/subscription-provider";
import { UserProfileProvider } from "@/components/user-profile-provider";
import { absoluteUrl, defaultDescription, openGraphImage, seoKeywords, siteName, siteUrl } from "./seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeControl | Trading Journal, Risk Manager and AI Trading Coach",
    template: `%s | ${siteName}`
  },
  description: defaultDescription,
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "finance",
  keywords: seoKeywords,
  referrer: "strict-origin-when-cross-origin",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "TradeControl | Trading Journal, Risk Manager and AI Trading Coach",
    description: defaultDescription,
    siteName,
    type: "website",
    url: "/",
    locale: "en_US",
    images: [openGraphImage]
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeControl | Professional Trading Journal",
    description: defaultDescription,
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
      description: defaultDescription,
      publisher: {
        "@id": absoluteUrl("/#organization")
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": absoluteUrl("/#software"),
      name: siteName,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: defaultDescription,
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          url: absoluteUrl("/pricing")
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "9.99",
          priceCurrency: "USD",
          url: absoluteUrl("/pricing")
        }
      ]
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
