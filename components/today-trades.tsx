import { TradeCard } from "./trade-card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrency, type Trade } from "@/lib/trades";

export function TodayTrades({ trades = [] }: { trades?: Trade[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter((trade) => trade.date === today);
  const netProfit = todayTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Today&apos;s Trades</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">Session log</h3>
        </div>
        <p className={`rounded-full px-3 py-1 text-sm font-semibold ${netProfit >= 0 ? "bg-profit/12 text-profit" : "bg-loss/12 text-loss"}`}>
          {formatCurrency(netProfit)} net
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {todayTrades.length ? (
          todayTrades.map((trade) => (
            <TradeCard
              key={trade.id}
              symbol={trade.instrument}
              side={trade.type}
              amount={formatCurrency(trade.profitLoss)}
              setup={trade.strategy}
              time={(trade.createdAt ? new Date(trade.createdAt) : new Date(`${trade.date}T00:00:00`)).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            />
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-line/70 bg-surface/[0.62] p-6 text-center sm:col-span-2 xl:col-span-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line/70 bg-surface/80 text-muted">
              <Plus className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink">No trades logged today.</p>
            <p className="mt-2 text-sm text-muted">Capture the next setup while the context is still fresh.</p>
            <Link className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950" href="/trades/new">
              <Plus className="h-4 w-4" />
              Add Trade
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
