"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { useAuth } from "./auth-provider";
import { AuthError, AuthField, authInputClass, authSelectClass, getAuthErrorMessage } from "./auth-form-ui";

export function RegisterClient() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "Personal",
    experience: "Beginner",
    acceptedLegal: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.acceptedLegal) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    try {
      await register(form);
      router.replace("/onboarding");
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-medium text-muted">Create account</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal text-ink">Start your trading control room</h2>
      </div>
      <AuthError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Full name">
          <input className={authInputClass} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required />
        </AuthField>
        <AuthField label="Email">
          <input className={authInputClass} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
        </AuthField>
        <AuthField label="Password">
          <input className={authInputClass} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
        </AuthField>
        <AuthField label="Confirm password">
          <input className={authInputClass} type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
        </AuthField>
        <AuthField label="Account type">
          <select className={authSelectClass} value={form.accountType} onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value }))}>
            {["Personal", "Prop Firm", "Demo"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </AuthField>
        <AuthField label="Trading experience">
          <select className={authSelectClass} value={form.experience} onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))}>
            {["Beginner", "Intermediate", "Advanced", "Professional"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </AuthField>
      </div>
      <p className="rounded-2xl border border-line/60 bg-surface/[0.55] px-4 py-3 text-sm leading-6 text-muted">
        Your starter profile and default trading rules will be created in Firestore after signup.
      </p>
      <label className="flex items-start gap-3 rounded-2xl border border-line/60 bg-surface/[0.55] px-4 py-3 text-sm font-medium leading-6 text-muted">
        <input
          checked={form.acceptedLegal}
          className="mt-1 h-4 w-4 rounded border-line text-profit accent-profit"
          onChange={(event) => setForm((current) => ({ ...current, acceptedLegal: event.target.checked }))}
          required
          type="checkbox"
        />
        <span>
          I agree to the{" "}
          <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950" disabled={isLoading} type="submit">
        <UserPlus className="h-4 w-4" />
        {isLoading ? "Creating account..." : "Create Account"}
      </button>
      <p className="text-center text-sm font-medium text-muted">
        Already have an account?{" "}
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
