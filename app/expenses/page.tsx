import { AppShell } from "@/components/app-shell";
import { ExpensesClient } from "@/components/expenses-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Trading Expenses",
  description: "Private TradeControl expense tracker for commissions, tools, data, platforms, and education costs.",
  path: "/expenses",
  noIndex: true
});

export default function ExpensesPage() {
  return (
    <AppShell>
      <ExpensesClient />
    </AppShell>
  );
}
