import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordClient } from "@/components/forgot-password-client";
import { pageMetadata } from "../seo";

export const metadata = pageMetadata({
  title: "Reset Password",
  description: "Reset access to your TradeControl account.",
  path: "/forgot-password",
  noIndex: true
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Reset password"
      title="Get back into your trading dashboard."
      subtitle="Enter your account email and Firebase will send a secure password reset link."
    >
      <ForgotPasswordClient />
    </AuthShell>
  );
}
