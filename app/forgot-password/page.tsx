import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordClient } from "@/components/forgot-password-client";

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
