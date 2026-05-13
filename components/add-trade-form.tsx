"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PaywallModal } from "@/components/paywall-modal";
import { useSubscription } from "@/components/subscription-provider";
import { TradeForm } from "@/components/trade-form";
import { useUserTrades } from "@/hooks/use-user-trades";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { createTrade } from "@/lib/trade-service";
import { useState } from "react";

export function AddTradeForm() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { isProUser } = useSubscription();
  const { trades } = useUserTrades();
  const [paywall, setPaywall] = useState<{ description: string; title: string } | null>(null);

  function checkFreeLimits(tradeDate: string) {
    if (isProUser) {
      return null;
    }

    if (trades.length >= 50) {
      trackEvent("trade_limit_reached", { limit_type: "free_total_trades", plan_type: "free", total_trades: trades.length });
      void notifyFreeLimitReached("Free plan total limit reached: 50 total trades are already saved.");
      setPaywall({
        title: "Free trade limit reached",
        description: "The Free plan includes up to 50 total trades. Upgrade to Pro for unlimited journaling."
      });
      return "Free plan limit reached: upgrade to Pro to save more than 50 trades.";
    }

    const dailyTrades = trades.filter((trade) => trade.date === tradeDate).length;
    if (dailyTrades >= 5) {
      trackEvent("overtrading_detected", { daily_trades: dailyTrades, limit: 5, plan_type: "free" });
      void notifyFreeLimitReached("Free plan daily limit reached: 5 trades are already saved for today.");
      setPaywall({
        title: "Daily trade limit reached",
        description: "The Free plan includes 5 trades per day. Upgrade to Pro for unlimited entries."
      });
      return "Free plan daily limit reached: upgrade to Pro to save more than 5 trades today.";
    }

    return null;
  }

  return (
    <>
      <PaywallModal
        description={paywall?.description}
        lockedFeature={paywall?.title}
        open={Boolean(paywall)}
        onClose={() => setPaywall(null)}
      />
      <TradeForm
        cancelHref="/trades"
        mode="create"
        submitLabel="Save Trade"
        successMessage="Trade saved to Firestore."
        onLimitCheck={checkFreeLimits}
        onSubmit={async ({ screenshotFile, trade }) => {
          if (!currentUser) {
            throw new Error("You must be signed in before saving a trade.");
          }

          try {
            await createTrade(currentUser.uid, trade, screenshotFile);
            trackEvent("trade_created", {
              has_screenshot: Boolean(screenshotFile),
              instrument: trade.instrument,
              result: trade.result,
              session: trade.session,
              setup_quality: trade.setupQuality,
              total_trades_created: trades.length + 1
            });
            if (screenshotFile) {
              trackEvent("screenshot_uploaded", { source: "trade_create" });
            }
          } catch (error) {
            trackApiFailure("trade_created", error);
            throw error;
          }
        }}
        onSuccess={() => router.push("/trades")}
      />
    </>
  );

  async function notifyFreeLimitReached(reason: string) {
    if (!currentUser) {
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/email/free-limit-reached", {
        body: JSON.stringify({ reason }),
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Free limit email trigger failed.");
      }
    } catch (error) {
      trackApiFailure("free_limit_email", error);
    }
  }
}
