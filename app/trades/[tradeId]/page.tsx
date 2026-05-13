import { AppShell } from "@/components/app-shell";
import { TradeDetailsClient } from "@/components/trade-details-client";

export default function TradeDetailsPage({ params }: { params: { tradeId: string } }) {
  return (
    <AppShell>
      <TradeDetailsClient tradeId={params.tradeId} />
    </AppShell>
  );
}
