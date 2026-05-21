import { AppShell } from "@/components/app-shell";
import { EditTradeClient } from "@/components/edit-trade-client";
import { pageMetadata } from "../../../seo";

export const metadata = pageMetadata({
  title: "Edit Trade",
  description: "Private TradeControl form for editing a trading journal entry.",
  path: "/trades",
  noIndex: true
});

export default function EditTradePage({ params }: { params: { tradeId: string } }) {
  return (
    <AppShell>
      <EditTradeClient tradeId={params.tradeId} />
    </AppShell>
  );
}
