import { AiCoachClient } from "@/components/ai-coach-client";
import { AppShell } from "@/components/app-shell";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "AI Trading Coach",
  description: "Private TradeControl AI coach for reviewing trading journal patterns, mistakes, bias, and next actions.",
  path: "/ai-coach",
  noIndex: true
});

export default function AiCoachPage() {
  return (
    <AppShell>
      <AiCoachClient />
    </AppShell>
  );
}
