import { AppShell } from "@/components/app-shell";
import { TradesPageClient } from "@/components/trades-page-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Trade Journal",
  description: "Private TradeControl journal for logging trades, screenshots, notes, emotions, and execution quality.",
  path: "/trades",
  noIndex: true
});

export default function TradesPage() {
  return (
    <AppShell>
      <TradesPageClient />
    </AppShell>
  );
}
