import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { formatCurrency, type Trade } from "@/lib/trades";

export function RecentTrades({ trades = [] }: { trades?: Trade[] }) {
  const recentTrades = trades
    .slice()
    .sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date))
    .slice(0, 5);

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted">Recent Trades</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">Latest journal entries</h3>
        </div>
        <Link className="w-fit rounded-2xl border border-line/70 bg-surface/70 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface" href="/trades">
          View all trades
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-line/60">
        <div className="hidden grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr] border-b border-line/60 bg-zinc-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted dark:bg-white/[0.04] md:grid">
          <span>Market</span>
          <span>Side</span>
          <span>Result</span>
          <span>R:R</span>
          <span>Date</span>
        </div>
        <div className="divide-y divide-line/60">
          {recentTrades.length ? recentTrades.map((trade) => {
            const isProfit = trade.profitLoss >= 0;
            return (
              <div key={trade.id} className="grid gap-3 bg-surface/40 px-4 py-4 text-sm sm:px-5 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr] md:items-center">
                <div>
                  <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted md:hidden">Market</span>
                  <p className="font-semibold text-ink">{trade.instrument}</p>
                  <p className="mt-1 text-xs text-muted md:hidden">{trade.date}</p>
                </div>
                <MobileField label="Side" className="text-muted">{trade.type}</MobileField>
                <MobileField label="Result" className={`font-semibold ${isProfit ? "text-profit" : "text-loss"}`}>{formatCurrency(trade.profitLoss)}</MobileField>
                <MobileField label="R:R" className="font-medium text-ink">{trade.rr}:1</MobileField>
                <p className="hidden text-muted md:block">{trade.date}</p>
              </div>
            );
          }) : (
            <div className="bg-surface/40 px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line/70 bg-surface/80 text-muted">
                <Plus className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">No recent trades yet.</p>
              <p className="mt-2 text-sm text-muted">Your newest saved trades will appear here.</p>
              <Link className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950" href="/trades/new">
                <Plus className="h-4 w-4" />
                Add Trade
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MobileField({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <p className={className}>
      <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      {children}
    </p>
  );
}
