import { AppShell } from "@/components/app-shell";
import { EditTradeClient } from "@/components/edit-trade-client";

export default function EditTradePage({ params }: { params: { tradeId: string } }) {
  return (
    <AppShell>
      <EditTradeClient tradeId={params.tradeId} />
    </AppShell>
  );
}
