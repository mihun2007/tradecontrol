"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { Download, Edit3, Eye, ImageIcon, Plus, SlidersHorizontal, X } from "lucide-react";
import { DeleteTradeButton } from "@/components/delete-trade-button";
import { useUserTrades } from "@/hooks/use-user-trades";
import { trackEvent } from "@/lib/analytics";
import { exportTradesToCsv } from "@/lib/csv-export";
import { formatCurrency, type Trade, type TradeResult, type TradeSession } from "@/lib/trades";

type Filters = {
  instrument: string;
  result: "All" | TradeResult;
  session: "All" | TradeSession;
};

const filterSelectStyles =
  "h-11 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink outline-none focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

export function TradesPageClient() {
  const { trades, loading, error, refresh } = useUserTrades();
  const [filters, setFilters] = useState<Filters>({ instrument: "All", result: "All", session: "All" });
  const [previewTrade, setPreviewTrade] = useState<Trade | null>(null);

  const instruments = useMemo(() => ["All", ...Array.from(new Set(trades.map((trade) => trade.instrument)))], [trades]);
  const filteredTrades = trades.filter((trade) => {
    return (
      (filters.instrument === "All" || trade.instrument === filters.instrument) &&
      (filters.result === "All" || trade.result === filters.result) &&
      (filters.session === "All" || trade.session === filters.session)
    );
  });

  const closedTrades = filteredTrades.filter((trade) => trade.result !== "Open");
  const totalProfit = filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const wins = closedTrades.filter((trade) => trade.result === "Win").length;
  const winRate = closedTrades.length ? Math.round((wins / closedTrades.length) * 100) : 0;
  const averageRr = filteredTrades.length
    ? (filteredTrades.reduce((sum, trade) => sum + trade.rr, 0) / filteredTrades.length).toFixed(1)
    : "0.0";
  const rulesFollowed = filteredTrades.length
    ? Math.round((filteredTrades.filter((trade) => trade.ruleFollowed).length / filteredTrades.length) * 100)
    : 0;

  return (
    <>
      {previewTrade?.screenshotUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-zinc-950 p-4 text-white shadow-premium">
            <div className="mb-3 flex items-center justify-between gap-4 px-1">
              <div>
                <p className="text-sm font-semibold text-white/60">Trade screenshot</p>
                <h2 className="text-lg font-semibold">{previewTrade.instrument} {previewTrade.type} · {previewTrade.date}</h2>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white" type="button" onClick={() => setPreviewTrade(null)} aria-label="Close screenshot preview">
                <X className="h-4 w-4" />
              </button>
            </div>
            <img alt={`${previewTrade.instrument} trade screenshot`} className="max-h-[76vh] w-full rounded-[1.5rem] object-contain" src={previewTrade.screenshotUrl} />
          </div>
        </div>
      ) : null}

      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Trades</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Journal history</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.55]">
            Review outcomes, quality, session behavior, and rule discipline across your saved trade log.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!trades.length}
            type="button"
            onClick={() => {
              exportTradesToCsv(trades, "tradecontrol-all-trades.csv");
              trackEvent("csv_exported", { export_scope: "all", trade_count: trades.length });
            }}
          >
            <Download className="h-4 w-4" />
            Export all
          </button>
          <Link
            href="/trades/new"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total P/L" value={formatCurrency(totalProfit)} tone={totalProfit >= 0 ? "profit" : "loss"} />
        <SummaryCard label="Win Rate" value={`${winRate}%`} />
        <SummaryCard label="Average R:R" value={`${averageRr}:1`} />
        <SummaryCard label="Rules Followed" value={`${rulesFollowed}%`} />
      </section>

      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Filters</p>
              <p className="text-sm text-muted">{filteredTrades.length} trades in view</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select className={filterSelectStyles} value={filters.instrument} onChange={(event) => setFilters((current) => ({ ...current, instrument: event.target.value }))}>
              {instruments.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className={filterSelectStyles} value={filters.result} onChange={(event) => setFilters((current) => ({ ...current, result: event.target.value as Filters["result"] }))}>
              {["All", "Win", "Loss", "Breakeven", "Open"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className={filterSelectStyles} value={filters.session} onChange={(event) => setFilters((current) => ({ ...current, session: event.target.value as Filters["session"] }))}>
              {["All", "Asia", "London", "New York"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <button className="h-11 rounded-2xl border border-dashed border-line/80 bg-surface/50 px-4 text-sm font-semibold text-muted" type="button">
              Date range
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-line/70 bg-zinc-950 px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950"
              disabled={!filteredTrades.length}
              type="button"
              onClick={() => {
                exportTradesToCsv(filteredTrades, "tradecontrol-filtered-trades.csv");
                trackEvent("csv_exported", {
                  export_scope: "filtered",
                  instrument_filter: filters.instrument,
                  result_filter: filters.result,
                  session_filter: filters.session,
                  trade_count: filteredTrades.length
                });
              }}
            >
              <Download className="h-4 w-4" />
              Export filtered
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-line/60">
          <div className="hidden grid-cols-[0.78fr_0.74fr_0.5fr_0.62fr_0.62fr_0.62fr_0.48fr_0.64fr_0.48fr_1fr] border-b border-line/60 bg-zinc-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted dark:bg-white/[0.04] xl:grid">
            <span>Date</span>
            <span>Instrument</span>
            <span>Side</span>
            <span>Session</span>
            <span>Result</span>
            <span>P/L</span>
            <span>R:R</span>
            <span>Rules</span>
            <span>Shot</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-line/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="grid gap-3 bg-surface/40 px-4 py-4 sm:px-5 xl:grid-cols-[0.78fr_0.74fr_0.5fr_0.62fr_0.62fr_0.62fr_0.48fr_0.64fr_0.48fr_1fr]">
                  {Array.from({ length: 10 }).map((__, cellIndex) => (
                    <div key={cellIndex} className="h-5 animate-pulse rounded-full bg-zinc-200/80 dark:bg-white/10" />
                  ))}
                </div>
              ))
            ) : error ? (
              <div className="bg-surface/40 px-5 py-8 text-sm font-semibold text-loss">{error}</div>
            ) : filteredTrades.length ? (
              filteredTrades.map((trade) => {
              const isProfit = trade.profitLoss > 0;
              const isLoss = trade.profitLoss < 0;
              return (
                <article key={trade.id} className="grid gap-3 bg-surface/40 px-4 py-4 text-sm sm:px-5 xl:grid-cols-[0.78fr_0.74fr_0.5fr_0.62fr_0.62fr_0.62fr_0.48fr_0.64fr_0.48fr_1fr] xl:items-center">
                  <MobileField label="Date" className="font-medium text-muted">{trade.date}</MobileField>
                  <div className="min-w-0">
                    <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted xl:hidden">Instrument</span>
                    <p className="font-semibold text-ink">{trade.instrument}</p>
                    <p className="mt-1 text-xs text-muted xl:hidden">{trade.strategy}</p>
                  </div>
                  <MobileField label="Side" className="font-medium text-ink">{trade.type}</MobileField>
                  <MobileField label="Session" className="text-muted">{trade.session}</MobileField>
                  <div>
                    <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted xl:hidden">Result</span>
                    <ResultPill result={trade.result} />
                  </div>
                  <MobileField label="P/L" className={`font-semibold ${isProfit ? "text-profit" : isLoss ? "text-loss" : "text-muted"}`}>{formatCurrency(trade.profitLoss)}</MobileField>
                  <MobileField label="R:R" className="font-semibold text-ink">{trade.rr}:1</MobileField>
                  <MobileField label="Rules" className={trade.ruleFollowed ? "font-semibold text-profit" : "font-semibold text-loss"}>
                    {trade.ruleFollowed ? "Followed" : "Broken"}
                  </MobileField>
                  {trade.screenshotUrl ? (
                    <button className="h-11 w-full overflow-hidden rounded-xl border border-line/60 bg-surface/70 sm:w-16" type="button" onClick={() => setPreviewTrade(trade)} aria-label="Open screenshot preview">
                      <img alt="" className="h-full w-full object-cover" src={trade.screenshotUrl} />
                    </button>
                  ) : (
                    <span className="flex h-11 w-full items-center justify-center rounded-xl border border-line/60 bg-surface/60 text-muted sm:w-11">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link className="flex h-11 w-11 items-center justify-center rounded-xl border border-line/60 bg-surface/70 text-ink transition hover:bg-surface focus-visible:ring-4 focus-visible:ring-profit/15" href={`/trades/${trade.id}`} aria-label="View trade">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link className="flex h-11 w-11 items-center justify-center rounded-xl border border-line/60 bg-surface/70 text-ink transition hover:bg-surface focus-visible:ring-4 focus-visible:ring-profit/15" href={`/trades/${trade.id}/edit`} aria-label="Edit trade">
                      <Edit3 className="h-4 w-4" />
                    </Link>
                    <DeleteTradeButton trade={trade} variant="icon" onDeleted={refresh} />
                  </div>
                </article>
              );
              })
            ) : (
              <div className="bg-surface/40 px-5 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line/70 bg-surface/80 text-muted">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink">{trades.length ? "No trades match these filters." : "No trades saved yet."}</p>
                <p className="mt-2 text-sm text-muted">Add your first trade to start building real journal analytics.</p>
                <Link className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950" href="/trades/new">
                  <Plus className="h-4 w-4" />
                  Add Trade
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function MobileField({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <p className={className}>
      <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted xl:hidden">{label}</span>
      {children}
    </p>
  );
}

function SummaryCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "profit" | "loss" | "neutral" }) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-normal ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink"}`}>
        {value}
      </p>
    </article>
  );
}

function ResultPill({ result }: { result: TradeResult }) {
  const tone =
    result === "Win"
      ? "bg-profit/12 text-profit"
      : result === "Loss"
        ? "bg-loss/12 text-loss"
        : "bg-zinc-500/10 text-muted";

  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{result}</span>;
}
