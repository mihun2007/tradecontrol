import { AppShell } from "@/components/app-shell";
import { TradeDetailsClient } from "@/components/trade-details-client";
import { pageMetadata } from "../../seo";

export const metadata = pageMetadata({
  title: "Trade Details",
  description: "Private TradeControl trade detail view for journal notes, screenshots, risk, and performance.",
  path: "/trades",
  noIndex: true
});

export default function TradeDetailsPage({ params }: { params: { tradeId: string } }) {
  return (
    <AppShell>
      <TradeDetailsClient tradeId={params.tradeId} />
    </AppShell>
  );
}
