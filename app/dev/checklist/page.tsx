import { AppShell } from "@/components/app-shell";
import { DevChecklistClient } from "@/components/dev-checklist-client";

export const metadata = {
  title: "Production Checklist"
};

export default function DevChecklistPage() {
  return (
    <AppShell>
      <DevChecklistClient />
    </AppShell>
  );
}
