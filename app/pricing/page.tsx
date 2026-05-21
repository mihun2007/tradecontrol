import { AppShell } from "@/components/app-shell";
import { PricingClient } from "@/components/pricing-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Compare TradeControl Free and Pro plans for trading journaling, risk management, analytics, screenshot uploads, and AI coaching.",
  path: "/pricing"
});

export default function PricingPage() {
  return (
    <AppShell>
      <PricingClient />
    </AppShell>
  );
}
