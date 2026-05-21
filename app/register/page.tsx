import { AuthShell } from "@/components/auth-shell";
import { RegisterClient } from "@/components/register-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Create Account",
  description: "Create a TradeControl account to start tracking trades, risk, emotions, analytics, and expenses.",
  path: "/register",
  noIndex: true
});

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="New account"
      title="Create a trading journal account built around discipline."
      subtitle="Register with Firebase email and password auth. Profile details beyond display name are saved later when Firestore is added."
    >
      <RegisterClient />
    </AuthShell>
  );
}
