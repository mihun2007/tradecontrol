import { AppShell } from "@/components/app-shell";
import { ReportsClient } from "@/components/reports-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Reports",
  description: "Private TradeControl reports for monthly trading performance and process review.",
  path: "/reports",
  noIndex: true
});

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsClient />
    </AppShell>
  );
}
