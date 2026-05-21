import { Target, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, type Trade } from "@/lib/trades";
import type { UserProfile } from "@/lib/user-profile";

type MonthlyProgressProps = {
  profile?: UserProfile | null;
  trades?: Trade[];
};

const ringSize = 120;
const ringRadius = 50;
const ringCircumference = 2 * Math.PI * ringRadius;

export function MonthlyProgress({ profile, trades = [] }: MonthlyProgressProps) {
  const progress = buildMonthlyProgress(trades, profile);
  const strokeOffset = ringCircumference * (1 - progress.percent / 100);
  const isNegative = progress.monthlyProfit < 0;
  const isComplete = progress.percent >= 100;

  return (
    <article className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Monthly Progress</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">Profit target</h3>
        </div>
        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${isNegative ? "border-loss/20 bg-loss/10 text-loss" : "border-profit/20 bg-profit/10 text-profit"}`}>
          {isNegative ? <TrendingDown className="h-5 w-5" /> : isComplete ? <Target className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
        </div>
      </div>

      <div className="flex min-h-[240px] flex-col items-center justify-center sm:min-h-[280px]">
        <div className="relative h-44 w-44 sm:h-52 sm:w-52">
          <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${ringSize} ${ringSize}`} role="img" aria-label={`Monthly profit target progress at ${progress.percent.toFixed(0)} percent`}>
            <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="currentColor" className="text-line/80" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={ringRadius}
              fill="none"
              stroke={isNegative ? "#e35050" : "#17a269"}
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              strokeWidth="10"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className={`text-3xl font-semibold tracking-normal sm:text-4xl ${isNegative ? "text-loss" : "text-ink"}`}>
              {progress.percent.toFixed(0)}%
            </p>
            <p className="mt-1 text-sm font-medium text-muted">
              {formatCurrency(progress.monthlyProfit, progress.currency)} of {formatCurrency(progress.monthlyTarget, progress.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
          <p className="text-sm text-muted">Daily average</p>
          <p className={`mt-1 text-lg font-semibold ${progress.dailyAverage < 0 ? "text-loss" : "text-ink"}`}>
            {formatCurrency(progress.dailyAverage, progress.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
          <p className="text-sm text-muted">{progress.targetLeft > 0 ? "Target left" : "Over target"}</p>
          <p className={`mt-1 text-lg font-semibold ${progress.targetLeft > 0 ? "text-ink" : "text-profit"}`}>
            {formatCurrency(progress.targetLeft > 0 ? progress.targetLeft : Math.abs(progress.targetLeft), progress.currency)}
          </p>
        </div>
      </div>
    </article>
  );
}

function buildMonthlyProgress(trades: Trade[], profile?: UserProfile | null, referenceDate = new Date()) {
  const currency = profile?.accountCurrency ?? "USD";
  const accountBalance = safeNumber(profile?.startingBalance, 10000);
  const dailyProfitTargetPercent = safeNumber(profile?.dailyProfitTarget, 2);
  const dailyTarget = accountBalance * (dailyProfitTargetPercent / 100);
  const monthKey = formatMonthKey(referenceDate);
  const tradingDaysInMonth = countWeekdaysInMonth(referenceDate);
  const elapsedTradingDays = countWeekdaysElapsed(referenceDate);
  const monthlyTarget = Math.max(dailyTarget * tradingDaysInMonth, 1);
  const monthTrades = trades.filter((trade) => trade.date.startsWith(monthKey));
  const monthlyProfit = monthTrades.reduce((sum, trade) => sum + safeNumber(trade.profitLoss, 0), 0);
  const dailyAverage = monthlyProfit / Math.max(elapsedTradingDays, 1);
  const targetLeft = monthlyTarget - monthlyProfit;
  const percent = Math.max(0, Math.min(100, (monthlyProfit / monthlyTarget) * 100));

  return {
    currency,
    dailyAverage,
    monthlyProfit,
    monthlyTarget,
    percent,
    targetLeft
  };
}

function safeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function countWeekdaysInMonth(date: Date) {
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1);
  let count = 0;

  while (cursor.getMonth() === date.getMonth()) {
    if (isWeekday(cursor)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function countWeekdaysElapsed(date: Date) {
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let count = 0;

  while (cursor <= today) {
    if (isWeekday(cursor)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}
