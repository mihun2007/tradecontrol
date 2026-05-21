"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "./auth-provider";
import { AuthError, AuthField, AuthSuccess, authInputClass, getAuthErrorMessage } from "./auth-form-ui";

export function ForgotPasswordClient() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess("Password reset email sent. Check your inbox for the Firebase reset link.");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-medium text-muted">Password reset</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal text-ink">Recover access</h2>
      </div>
      <AuthError message={error} />
      <AuthSuccess message={success} />
      <AuthField label="Email">
        <input className={authInputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </AuthField>
      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950" disabled={isLoading} type="submit">
        <Mail className="h-4 w-4" />
        {isLoading ? "Sending..." : "Send Reset Email"}
      </button>
      <Link className="text-center text-sm font-semibold text-ink underline-offset-4 hover:underline" href="/login">
        Back to login
      </Link>
    </form>
  );
}
