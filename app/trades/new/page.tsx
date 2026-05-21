import { AddTradeForm } from "@/components/add-trade-form";
import { AppShell } from "@/components/app-shell";
import { pageMetadata } from "../../seo";

export const metadata = pageMetadata({
  title: "New Journal Entry",
  description: "Private TradeControl form for adding a new trading journal entry.",
  path: "/trades/new",
  noIndex: true
});

export default function NewTradePage() {
  return (
    <AppShell>
      <AddTradeForm />
    </AppShell>
  );
}
