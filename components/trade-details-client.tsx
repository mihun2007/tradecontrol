"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Edit3, ImageIcon, ShieldCheck, Target, TrendingDown, TrendingUp } from "lucide-react";
import { DeleteTradeButton } from "@/components/delete-trade-button";
import { useAuth } from "@/components/auth-provider";
import { getTrade } from "@/lib/trade-service";
import { calculateRiskReward, formatCurrency, type Trade } from "@/lib/trades";

export function TradeDetailsClient({ tradeId }: { tradeId: string }) {
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
        setError("");
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

  const rr = useMemo(() => {
    if (!trade) {
      return 0;
    }

    return trade.rr || calculateRiskReward(trade.entryPrice, trade.stopLoss, trade.takeProfit);
  }, [trade]);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-6 text-sm font-semibold text-muted shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
        Loading trade details...
      </section>
    );
  }

  if (error || !trade) {
    return (
      <section className="rounded-[2rem] border border-loss/25 bg-loss/10 p-6 shadow-soft">
        <p className="text-sm font-semibold text-loss">{error || "Trade not found."}</p>
        <Link className="mt-4 inline-flex h-11 items-center rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950" href="/trades">
          Back to trades
        </Link>
      </section>
    );
  }

  const isProfit = trade.profitLoss > 0;
  const isLoss = trade.profitLoss < 0;

  return (
    <>
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white" href="/trades">
            <ArrowLeft className="h-4 w-4" />
            Back to trades
          </Link>
          <p className="text-sm font-medium text-white/[0.55]">Trade Details</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">{trade.instrument} {trade.type}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.55]">
            Review the full execution record, risk profile, psychology, and screenshot evidence for this trade.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5"
            href={`/trades/${trade.id}/edit`}
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Link>
          <DeleteTradeButton trade={trade} onDeleted={() => router.push("/trades")} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Profit/Loss" value={formatCurrency(trade.profitLoss)} tone={isProfit ? "profit" : isLoss ? "loss" : "neutral"} icon={isProfit ? TrendingUp : TrendingDown} />
        <Metric label="Risk/Reward" value={`${rr}:1`} icon={Target} />
        <Metric label="Result" value={trade.result} tone={trade.result === "Win" ? "profit" : trade.result === "Loss" ? "loss" : "neutral"} icon={ShieldCheck} />
        <Metric label="Trade Date" value={trade.date} icon={CalendarDays} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-5">
            <div>
              <p className="text-sm font-semibold text-ink">Execution</p>
              <p className="mt-1 text-sm text-muted">Price levels, sizing, and risk captured at entry.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${trade.ruleFollowed === true ? "bg-profit/12 text-profit" : trade.ruleFollowed === false ? "bg-loss/12 text-loss" : "bg-zinc-500/10 text-muted"}`}>
              {trade.ruleFollowed === true ? "Rules followed" : trade.ruleFollowed === false ? "Rules broken" : "Rules unknown"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Date" value={trade.date} />
            <Detail label="Session" value={trade.session} />
            <Detail label="Instrument" value={trade.instrument} />
            <Detail label="Buy/Sell" value={trade.type} />
            <Detail label="Entry price" value={trade.entryPrice} />
            <Detail label="Stop loss" value={trade.stopLoss} />
            <Detail label="Take profit" value={trade.takeProfit} />
            <Detail label="Lot size" value={trade.lotSize} />
            <Detail label="Risk amount" value={formatCurrency(trade.riskAmount)} />
            <Detail label="Strategy" value={trade.strategy} />
            <Detail label="Setup quality" value={trade.setupQuality} />
            <Detail label="Emotion" value={trade.emotion} />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-sm font-semibold text-ink">Screenshot</p>
            {trade.screenshotUrl ? (
              <Image
                alt={`${trade.instrument} screenshot`}
                className="mt-4 max-h-[420px] w-full rounded-[1.5rem] object-contain shadow-soft"
                height={520}
                sizes="(min-width: 1280px) 420px, 100vw"
                src={trade.screenshotUrl}
                unoptimized
                width={840}
              />
            ) : (
              <div className="mt-4 flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-surface/50 text-center">
                <ImageIcon className="h-8 w-8 text-muted" />
                <p className="mt-3 text-sm font-semibold text-ink">No screenshot attached</p>
                <p className="mt-1 max-w-xs text-sm text-muted">Edit this trade to add a chart screenshot.</p>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
            <p className="text-sm font-semibold text-ink">Audit trail</p>
            <div className="mt-4 grid gap-3">
              <Detail label="Created" value={formatDateTime(trade.createdAt)} />
              <Detail label="Updated" value={formatDateTime(trade.updatedAt)} />
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <p className="text-sm font-semibold text-ink">Journal Notes</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{trade.notes || "No notes saved for this trade."}</p>
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value ?? "N/A"}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, tone = "neutral", value }: { icon: ElementType; label: string; tone?: "profit" | "loss" | "neutral"; value: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <p className={`mt-4 text-2xl font-semibold ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink"}`}>{value}</p>
    </article>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
