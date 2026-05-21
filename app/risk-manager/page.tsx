import { AppShell } from "@/components/app-shell";
import { RiskManagerClient } from "@/components/risk-manager-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Risk Manager",
  description: "Private TradeControl risk manager for trading rules, exposure, and discipline checks.",
  path: "/risk-manager",
  noIndex: true
});

export default function RiskManagerPage() {
  return (
    <AppShell>
      <RiskManagerClient />
    </AppShell>
  );
}
