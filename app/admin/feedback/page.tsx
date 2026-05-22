import { AppShell } from "@/components/app-shell";
import { AdminFeedbackClient } from "@/components/admin-feedback-client";
import { pageMetadata } from "@/app/seo";

export const metadata = pageMetadata({
  title: "Feedback Dashboard",
  description: "Protected TradeControl admin dashboard for reviewing feedback submissions.",
  path: "/admin/feedback",
  noIndex: true
});

export default function AdminFeedbackPage() {
  return (
    <AppShell>
      <AdminFeedbackClient />
    </AppShell>
  );
}
