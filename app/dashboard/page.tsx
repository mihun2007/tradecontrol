import { DashboardHome } from "@/components/dashboard-home";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Private TradeControl dashboard for reviewing trading performance, risk, journal activity, and discipline.",
  path: "/dashboard",
  noIndex: true
});

export default function DashboardPage() {
  return <DashboardHome />;
}
