"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/[0.55] bg-white/[0.82] p-6 text-center shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-loss/10 text-loss">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-ink">Something needs a refresh.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          TradeControl hit an unexpected app error. Your account data is safe; try refreshing this view.
        </p>
        <button
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
          type="button"
          onClick={reset}
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </section>
    </main>
  );
}
