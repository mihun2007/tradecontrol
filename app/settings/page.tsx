import { AppShell } from "@/components/app-shell";
import { SettingsClient } from "@/components/settings-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Settings",
  description: "Private TradeControl settings for configuring profile, risk rules, subscription, and preferences.",
  path: "/settings",
  noIndex: true
});

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsClient />
    </AppShell>
  );
}
