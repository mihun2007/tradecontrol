import { AppShell } from "@/components/app-shell";
import { TradingCalendarClient } from "@/components/trading-calendar-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Trading Calendar",
  description: "Private TradeControl calendar for reviewing trading consistency, streaks, red days, and emotional patterns.",
  path: "/calendar",
  noIndex: true
});

export default function CalendarPage() {
  return (
    <AppShell>
      <TradingCalendarClient />
    </AppShell>
  );
}
