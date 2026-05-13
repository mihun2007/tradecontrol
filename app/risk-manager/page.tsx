import { AppShell } from "@/components/app-shell";
import { RiskManagerClient } from "@/components/risk-manager-client";

export default function RiskManagerPage() {
  return (
    <AppShell>
      <RiskManagerClient />
    </AppShell>
  );
}
