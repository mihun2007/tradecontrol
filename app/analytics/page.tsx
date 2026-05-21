import { AnalyticsClient } from "@/components/analytics-client";
import { AppShell } from "@/components/app-shell";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Analytics",
  description: "Private TradeControl analytics for reviewing trading performance and discipline patterns.",
  path: "/analytics",
  noIndex: true
});

export default function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsClient />
    </AppShell>
  );
}
