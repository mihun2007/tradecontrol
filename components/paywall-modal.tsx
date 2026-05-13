"use client";

import { CheckCircle2, Lock, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSubscription } from "@/components/subscription-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";

type PaywallModalProps = {
  description?: string;
  lockedFeature?: string;
  onClose: () => void;
  open: boolean;
};

const unlockedFeatures = [
  "Unlimited trades and daily entries",
  "Full AI Coach insights",
  "Advanced analytics and calendar insights",
  "Screenshot upload for every trade"
];

export function PaywallModal({ description, lockedFeature = "Pro feature", onClose, open }: PaywallModalProps) {
  const { startCheckout } = useSubscription();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setError("");
      setLoading(false);
    } else {
      trackEvent("paywall_shown", { locked_feature: lockedFeature });
    }
  }, [lockedFeature, open]);

  if (!open) {
    return null;
  }

  async function handleUpgrade() {
    setError("");
    setLoading(true);
    try {
      trackEvent("checkout_started", { locked_feature: lockedFeature, source: "paywall_modal" });
      await startCheckout();
    } catch (checkoutError) {
      trackApiFailure("stripe_checkout", checkoutError, { source: "paywall_modal" });
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start Stripe Checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-md">
      <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-white p-5 shadow-premium dark:bg-zinc-950 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-profit">Upgrade to Pro</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">{lockedFeature}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {description || "This feature is locked on the Free plan. Upgrade to unlock the full TradeControl workflow."}
              </p>
            </div>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {unlockedFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-3 rounded-[1.25rem] border border-line/60 bg-surface/60 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-profit" />
              <p className="text-sm font-semibold text-ink">{feature}</p>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-loss/25 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950" disabled={loading} type="button" onClick={handleUpgrade}>
            <Sparkles className="h-4 w-4" />
            {loading ? "Opening Checkout..." : "Upgrade to Pro"}
          </button>
          <Link className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 px-5 text-sm font-semibold text-ink transition hover:bg-surface" href="/pricing" onClick={onClose}>
            View pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
