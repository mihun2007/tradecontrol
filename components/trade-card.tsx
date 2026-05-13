import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type TradeCardProps = {
  symbol: string;
  side: "Buy" | "Sell";
  amount: string;
  setup: string;
  time: string;
};

export function TradeCard({ symbol, side, amount, setup, time }: TradeCardProps) {
  const isProfit = amount.startsWith("+");
  const Icon = isProfit ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="rounded-[1.5rem] border border-line/60 bg-surface/[0.62] p-4 shadow-soft backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{symbol}</p>
          <p className="mt-1 text-sm font-medium text-muted">{side} · {setup}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${isProfit ? "bg-profit/12 text-profit" : "bg-loss/12 text-loss"}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className={`text-2xl font-semibold ${isProfit ? "text-profit" : "text-loss"}`}>{amount}</p>
        <p className="text-sm text-muted">{time}</p>
      </div>
    </article>
  );
}
