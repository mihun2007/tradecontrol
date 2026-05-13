"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { TradeForm } from "@/components/trade-form";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { getTrade, updateTrade } from "@/lib/trade-service";
import type { Trade } from "@/lib/trades";

export function EditTradeClient({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const user = currentUser;

    async function loadTrade() {
      try {
        setLoading(true);
        const savedTrade = await getTrade(user.uid, tradeId);
        if (!savedTrade) {
          setError("Trade not found.");
          return;
        }
        setTrade(savedTrade);
      } catch (tradeError) {
        setError(tradeError instanceof Error ? tradeError.message : "Unable to load this trade.");
      } finally {
        setLoading(false);
      }
    }

    void loadTrade();
  }, [authLoading, currentUser, tradeId]);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-6 text-sm font-semibold text-muted shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
        Loading trade details...
      </section>
    );
  }

  if (error || !trade) {
    return (
      <section className="rounded-[2rem] border border-loss/25 bg-loss/10 p-6 text-sm font-semibold text-loss shadow-soft">
        {error || "Trade not found."}
      </section>
    );
  }

  return (
    <TradeForm
      cancelHref={`/trades/${trade.id}`}
      initialTrade={trade}
      mode="edit"
      submitLabel="Update Trade"
      successMessage="Trade updated in Firestore."
      onSubmit={async ({ screenshotFile, trade: tradeData }) => {
        if (!currentUser) {
          throw new Error("You must be signed in before updating a trade.");
        }

        try {
          await updateTrade(currentUser.uid, trade.id, tradeData, screenshotFile, trade.screenshotPath);
          trackEvent("trade_updated", {
            has_new_screenshot: Boolean(screenshotFile),
            instrument: tradeData.instrument,
            result: tradeData.result,
            session: tradeData.session
          });
          if (screenshotFile) {
            trackEvent("screenshot_uploaded", { source: "trade_update" });
          }
        } catch (error) {
          trackApiFailure("trade_updated", error);
          throw error;
        }
      }}
      onSuccess={() => router.push(`/trades/${trade.id}`)}
    />
  );
}
