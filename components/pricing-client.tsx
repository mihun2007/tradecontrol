"use client";

import { CheckCircle2, Crown, Lock, Sparkles, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSubscription } from "@/components/subscription-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";

const freeFeatures = [
  "5 trades per day",
  "50 trades total",
  "Basic dashboard",
  "Limited analytics",
  "10 AI Coach messages per day"
];

const proFeatures = [
  "Unlimited trades",
  "Full AI Coach",
  "Advanced analytics",
  "Screenshot upload",
  "Full calendar insights",
  "All features unlocked"
];

export function PricingClient() {
  const { isProUser, loading, openCustomerPortal, startCheckout, subscriptionStatus } = useSubscription();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState<"checkout" | "portal" | "">("");

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");

    if (checkoutState === "cancelled") {
      setNotice("Checkout was cancelled. Your current plan is unchanged.");
    }
  }, [searchParams]);

  async function upgrade() {
    setError("");
    setLoadingAction("checkout");
    try {
      trackEvent("checkout_started", { source: "pricing_page" });
      await startCheckout();
    } catch (checkoutError) {
      trackApiFailure("stripe_checkout", checkoutError);
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to open Stripe Checkout.");
      setLoadingAction("");
    }
  }

  async function manageBilling() {
    setError("");
    setLoadingAction("portal");
    try {
      trackEvent("manage_billing_clicked", { source: "pricing_page" });
      await openCustomerPortal();
    } catch (portalError) {
      trackApiFailure("stripe_customer_portal", portalError);
      setError(portalError instanceof Error ? portalError.message : "Unable to open Stripe Customer Portal.");
      setLoadingAction("");
    }
  }

  return (
    <>
      {notice ? (
        <div className="fixed right-4 top-24 z-50 flex items-center gap-3 rounded-2xl border border-profit/20 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-premium dark:bg-white dark:text-zinc-950">
          <CheckCircle2 className="h-4 w-4 text-profit" />
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="fixed right-4 top-24 z-50 rounded-2xl border border-loss/25 bg-loss px-4 py-3 text-sm font-semibold text-white shadow-premium">
          {error}
        </div>
      ) : null}

      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Subscription</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Choose your TradeControl plan.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
            Start with basic journaling, then unlock unlimited trades, screenshots, advanced analytics, and full coaching when you are ready.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/75">
          <Crown className="h-4 w-4 text-profit" />
          Current plan: {loading ? "Checking..." : isProUser ? "Pro" : "Free"} · {loading ? "syncing" : subscriptionStatus}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <PlanCard
          actionLabel={!isProUser ? "Current Free Plan" : "Downgrade in Billing Portal"}
          description="For testing the core trading journal with clear limits."
          features={freeFeatures}
          icon={Lock}
          muted
          price="$0"
          title="Free"
          disabled={loading || Boolean(loadingAction)}
          onAction={isProUser ? manageBilling : () => setNotice("You are already on the Free plan.")}
        />
        <PlanCard
          actionLabel={
            loading
              ? "Checking plan..."
              : isProUser
                ? (loadingAction === "portal" ? "Opening Portal..." : "Manage Billing")
                : loadingAction === "checkout"
                  ? "Opening Checkout..."
                  : "Upgrade to Pro"
          }
          description="For traders who want the full journal, risk, review, and coaching workflow."
          features={proFeatures}
          highlighted
          icon={Sparkles}
          price="$9.99/month"
          title="Pro"
          disabled={loading || Boolean(loadingAction)}
          onAction={isProUser ? manageBilling : upgrade}
        />
      </section>

      <p className="rounded-[1.4rem] border border-profit/20 bg-profit/[0.08] px-5 py-4 text-sm font-medium leading-6 text-ink dark:text-white/78">
        Subscriptions unlock software features only. TradeControl does not provide financial advice or trading signals.
      </p>

      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Feature comparison</p>
            <h2 className="text-xl font-semibold text-ink">What unlocks with Pro</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {proFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-3 rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
              <CheckCircle2 className="h-4 w-4 text-profit" />
              <p className="text-sm font-semibold text-ink">{feature}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PlanCard({
  actionLabel,
  description,
  disabled,
  features,
  highlighted,
  icon: Icon,
  muted,
  onAction,
  price,
  title
}: {
  actionLabel: string;
  description: string;
  disabled?: boolean;
  features: string[];
  highlighted?: boolean;
  icon: typeof Crown;
  muted?: boolean;
  onAction: () => void;
  price: string;
  title: string;
}) {
  return (
    <article className={`rounded-[2rem] border p-5 shadow-premium backdrop-blur-2xl sm:p-6 ${highlighted ? "border-profit/30 bg-zinc-950 text-white" : "border-white/[0.55] bg-white/[0.72] text-ink dark:border-white/10 dark:bg-white/[0.055]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${highlighted ? "bg-white text-zinc-950" : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
          <p className={`mt-2 text-sm leading-6 ${highlighted ? "text-white/60" : "text-muted"}`}>{description}</p>
        </div>
        {highlighted ? (
          <span className="rounded-full border border-profit/30 bg-profit/10 px-3 py-1 text-xs font-bold text-profit">Best value</span>
        ) : null}
      </div>
      <p className={`mt-6 text-4xl font-semibold ${highlighted ? "text-white" : muted ? "text-muted" : "text-ink"}`}>{price}</p>
      <div className="mt-6 grid gap-3">
        {features.map((feature) => (
          <div key={feature} className={`flex items-center gap-3 rounded-[1.25rem] border p-3 ${highlighted ? "border-white/10 bg-white/[0.075]" : "border-line/60 bg-surface/[0.55]"}`}>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-profit" />
            <p className={`text-sm font-semibold ${highlighted ? "text-white/78" : "text-ink"}`}>{feature}</p>
          </div>
        ))}
      </div>
      <button className={`mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${highlighted ? "bg-white text-zinc-950" : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"}`} disabled={disabled} type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </article>
  );
}
