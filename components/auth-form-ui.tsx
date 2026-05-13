import type { ReactNode } from "react";

export const authInputClass =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

export const authSelectClass =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

export function AuthField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      {children}
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-loss/20 bg-loss/[0.08] px-4 py-3 text-sm font-semibold text-loss">
      {message}
    </div>
  );
}

export function AuthSuccess({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-profit/20 bg-profit/[0.08] px-4 py-3 text-sm font-semibold text-profit">
      {message}
    </div>
  );
}

export function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";

  if (message.includes("Firebase is not configured")) {
    return message;
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("auth/user-not-found")) {
    return "No account exists for this email.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "An account already exists for this email.";
  }

  if (message.includes("auth/weak-password")) {
    return "Password should be at least 6 characters.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Enter a valid email address.";
  }

  return message;
}
