"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type ChecklistItem = {
  detail: string;
  label: string;
  ok: boolean;
};

export function DevChecklistClient() {
  const { currentUser } = useAuth();
  const [checks, setChecks] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadChecklist = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/dev/checklist", {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json() as { checks?: ChecklistItem[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load production checklist.");
      }

      setChecks(payload.checks ?? []);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Unable to load production checklist.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  const readyCount = checks.filter((item) => item.ok).length;

  return (
    <>
      <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-white/[0.55]">Developer Checklist</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">Production launch readiness</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
              Internal deployment checks for Firebase, Stripe, Vercel environment variables, and subscription sync.
            </p>
          </div>
          <button className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5" type="button" onClick={loadChecklist}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">Status</p>
            <h2 className="text-xl font-semibold text-ink">{readyCount}/{checks.length || 1} checks ready</h2>
          </div>
          <ShieldCheck className="h-5 w-5 text-profit" />
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-loss/25 bg-loss/10 p-4 text-sm font-semibold text-loss">{error}</div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {loading && !checks.length
            ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[1.5rem] bg-zinc-200/80 dark:bg-white/10" />
            ))
            : checks.map((item) => (
              <article key={item.label} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
                <div className="flex items-start gap-3">
                  {item.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-profit" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                  <div>
                    <p className="font-semibold text-ink">{item.label}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{item.detail}</p>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
