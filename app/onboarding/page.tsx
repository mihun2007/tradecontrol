import { OnboardingClient } from "@/components/onboarding-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Onboarding",
  description: "Private TradeControl onboarding for setting up trading profile, rules, and workflow preferences.",
  path: "/onboarding",
  noIndex: true
});

export default function OnboardingPage() {
  return <OnboardingClient />;
}
