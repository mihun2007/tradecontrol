"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "./auth-provider";
import { AuthError, AuthField, authInputClass, getAuthErrorMessage } from "./auth-form-ui";

export function LoginClient() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.replace(searchParams.get("redirect") || "/dashboard");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-medium text-muted">Welcome back</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal text-ink">Sign in to TradeControl</h2>
      </div>
      <AuthError message={error} />
      <AuthField label="Email">
        <input className={authInputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </AuthField>
      <AuthField label="Password">
        <input className={authInputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </AuthField>
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
          <input className="h-4 w-4 rounded border-line accent-profit" checked={rememberMe} type="checkbox" onChange={(event) => setRememberMe(event.target.checked)} />
          Remember me
        </label>
        <Link className="text-sm font-semibold text-ink underline-offset-4 hover:underline" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950" disabled={isLoading} type="submit">
        <LogIn className="h-4 w-4" />
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
      <p className="text-center text-sm font-medium text-muted">
        New to TradeControl?{" "}
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
