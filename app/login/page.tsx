import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginClient } from "@/components/login-client";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in and keep your trading process protected."
      subtitle="TradeControl now uses Firebase Authentication for real email and password login. Add your Firebase config values to enable live auth."
    >
      <Suspense fallback={null}>
        <LoginClient />
      </Suspense>
    </AuthShell>
  );
}
