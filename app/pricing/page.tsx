import { AppShell } from "@/components/app-shell";
import { PricingClient } from "@/components/pricing-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Pricing — TradeControl Trading Journal",
  description:
    "Start free or upgrade to Pro. Get unlimited AI coaching, advanced analytics, and pattern detection for serious traders.",
  path: "/pricing"
});

const pricingFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is TradeControl free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. TradeControl has a free plan for traders who want to start journaling trades, reviewing basic performance, and building discipline."
      }
    },
    {
      "@type": "Question",
      name: "What is a trading journal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A trading journal is a structured record of your trades, setups, results, emotions, risk decisions, and lessons so you can analyze performance and improve your process."
      }
    },
    {
      "@type": "Question",
      name: "Does TradeControl work for prop firm traders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. TradeControl is built for prop firm and retail traders who need trade tracking, risk rules, performance analytics, and discipline review."
      }
    },
    {
      "@type": "Question",
      name: "What does the AI Coach do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI Coach reviews your trading journal context and helps you understand discipline, emotional patterns, repeated mistakes, risk behavior, and process improvements. It does not provide financial advice or trading signals."
      }
    },
    {
      "@type": "Question",
      name: "Can I import trades from MT4/MT5?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. TradeControl supports importing trade history from CSV and XLSX files, including MT4 and MT5 style exports."
      }
    }
  ]
};

export default function PricingPage() {
  return (
    <>
      <script
        id="pricing-faq-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingFaqJsonLd).replace(/</g, "\\u003c")
        }}
      />
      <AppShell>
        <PricingClient />
      </AppShell>
    </>
  );
}
