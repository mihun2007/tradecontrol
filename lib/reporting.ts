import type { DailyReview } from "@/lib/daily-reviews";
import type { Expense } from "@/lib/expenses";
import type { Trade } from "@/lib/trades";

export type MonthlyReportSummary = {
  averageRiskReward: number;
  bestInstrument: string;
  bestSession: string;
  emotionalSummary: string;
  expensesTotal: number;
  mainMistake: string;
  month: number;
  netProfit: number;
  realNetProfitAfterExpenses: number;
  ruleCompliance: number;
  totalTrades: number;
  winRate: number;
  worstInstrument: string;
  worstSession: string;
  year: number;
};

export function buildMonthlyReportSummary(input: {
  expenses: Expense[];
  month: number;
  reviews: DailyReview[];
  trades: Trade[];
  year: number;
}): MonthlyReportSummary {
  const monthKey = `${input.year}-${String(input.month).padStart(2, "0")}`;
  const monthTrades = input.trades.filter((trade) => trade.date.startsWith(monthKey));
  const monthExpenses = input.expenses.filter((expense) => expense.date.startsWith(monthKey));
  const monthReviews = input.reviews.filter((review) => review.date.startsWith(monthKey));
  const closedTrades = monthTrades.filter((trade) => trade.result !== "Open");
  const winningTrades = closedTrades.filter((trade) => trade.result === "Win" || trade.profitLoss > 0);
  const netProfit = monthTrades.reduce((sum, trade) => sum + safeNumber(trade.profitLoss), 0);
  const expensesTotal = monthExpenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);
  const ruleChecks = [
    ...monthTrades.map((trade) => trade.ruleFollowed),
    ...monthReviews.flatMap((review) => [
      review.followedPlan,
      review.respectedRisk,
      review.noRevengeTrading,
      review.stoppedAtLimit,
      review.journaledEveryTrade
    ])
  ];

  return {
    averageRiskReward: average(monthTrades.map((trade) => safeNumber(trade.rr)).filter(Boolean)),
    bestInstrument: bestBucket(monthTrades, (trade) => trade.instrument, "best"),
    bestSession: bestBucket(monthTrades, (trade) => trade.session, "best"),
    emotionalSummary: mostCommon([
      ...monthTrades.map((trade) => trade.emotion),
      ...monthReviews.map((review) => review.emotionalState)
    ]) || "Not enough emotion data",
    expensesTotal,
    mainMistake: mostCommon(monthReviews.map((review) => review.mainMistake).filter(Boolean)) || "Not enough review data",
    month: input.month,
    netProfit,
    realNetProfitAfterExpenses: netProfit - expensesTotal,
    ruleCompliance: ruleChecks.length ? Math.round((ruleChecks.filter(Boolean).length / ruleChecks.length) * 100) : 0,
    totalTrades: monthTrades.length,
    winRate: closedTrades.length ? Math.round((winningTrades.length / closedTrades.length) * 100) : 0,
    worstInstrument: bestBucket(monthTrades, (trade) => trade.instrument, "worst"),
    worstSession: bestBucket(monthTrades, (trade) => trade.session, "worst"),
    year: input.year
  };
}

export function getAvailableReportMonths(input: {
  expenses: Expense[];
  reviews: DailyReview[];
  trades: Trade[];
}) {
  const months = new Set<string>();
  input.trades.forEach((trade) => months.add(trade.date.slice(0, 7)));
  input.expenses.forEach((expense) => months.add(expense.date.slice(0, 7)));
  input.reviews.forEach((review) => months.add(review.date.slice(0, 7)));

  if (!months.size) {
    months.add(new Date().toISOString().slice(0, 7));
  }

  return Array.from(months)
    .sort()
    .reverse()
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        month,
        year
      };
    });
}

function bestBucket(trades: Trade[], getKey: (trade: Trade) => string, mode: "best" | "worst") {
  const buckets = new Map<string, number>();
  trades.forEach((trade) => {
    const key = getKey(trade) || "Unknown";
    buckets.set(key, (buckets.get(key) ?? 0) + safeNumber(trade.profitLoss));
  });

  const sorted = Array.from(buckets.entries()).sort((a, b) => mode === "best" ? b[1] - a[1] : a[1] - b[1]);
  return sorted[0]?.[0] || "Not enough data";
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
