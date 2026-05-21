import { AppShell } from "@/components/app-shell";
import { DevChecklistClient } from "@/components/dev-checklist-client";
import { pageMetadata } from "../../seo";

export const metadata = pageMetadata({
  title: "Production Checklist",
  description: "Private production checklist for TradeControl deployment readiness.",
  path: "/dev/checklist",
  noIndex: true
});

export default function DevChecklistPage() {
  return (
    <AppShell>
      <DevChecklistClient />
    </AppShell>
  );
}
