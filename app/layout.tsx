import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SubscriptionProvider } from "@/components/subscription-provider";
import { UserProfileProvider } from "@/components/user-profile-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "TradeControl | Trading Journal and Risk Dashboard",
    template: "%s | TradeControl"
  },
  description: "Track trades, control risk, review emotions, and improve trading discipline with TradeControl.",
  applicationName: "TradeControl",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "TradeControl | Trading Journal and Risk Dashboard",
    description: "A premium journaling, analytics, and discipline tool for process-first traders.",
    siteName: "TradeControl",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeControl",
    description: "Master your trading discipline with one professional dashboard."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <UserProfileProvider>
            <Suspense fallback={null}>
              <SubscriptionProvider>
                <AnalyticsProvider>{children}</AnalyticsProvider>
              </SubscriptionProvider>
            </Suspense>
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
