import { AnalyticsClient } from "@/components/analytics-client";
import { AppShell } from "@/components/app-shell";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsClient />
    </AppShell>
  );
}
