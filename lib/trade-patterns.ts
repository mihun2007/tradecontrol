import type { Trade } from "@/lib/trades";
import { formatCurrency } from "@/lib/trades";

export type DetectedPatternTone = "success" | "warning" | "info";

export type DetectedPattern = {
  id: string;
  insight: string;
  stat: string;
  tone: DetectedPatternTone;
};

type Bucket = {
  key: string;
  trades: Trade[];
  totalProfit: number;
  averageProfit: number;
  winRate: number;
};

const MIN_TRADES_FOR_DETECTION = 10;
const MIN_OCCURRENCES = 3;
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function detectTradePatterns(trades: Trade[], currency = "USD"): DetectedPattern[] {
  const closedTrades = trades.filter((trade) => trade.result !== "Open");

  if (trades.length < MIN_TRADES_FOR_DETECTION || closedTrades.length < MIN_OCCURRENCES) {
    return [];
  }

  const patterns: DetectedPattern[] = [];
  const overallWinRate = calculateWinRate(closedTrades);

  const worstDay = buildBuckets(closedTrades, (trade) => getDayName(trade.date))
    .filter((bucket) => bucket.trades.length >= MIN_OCCURRENCES)
    .sort((left, right) => left.averageProfit - right.averageProfit)[0];

  if (worstDay && worstDay.averageProfit < 0) {
    patterns.push({
      id: "worst-day",
      insight: `You lose most on ${worstDay.key} — avg P&L is ${formatCurrency(worstDay.averageProfit, currency)}.`,
      stat: `${worstDay.trades.length} trades · ${formatCurrency(worstDay.totalProfit, currency)} total P&L`,
      tone: "warning"
    });
  }

  const instrumentBuckets = buildBuckets(closedTrades, (trade) => normalizeLabel(trade.instrument, "Unknown instrument"))
    .filter((bucket) => bucket.trades.length >= MIN_OCCURRENCES);

  const bestInstrument = [...instrumentBuckets].sort((left, right) => right.totalProfit - left.totalProfit)[0];
  if (bestInstrument && bestInstrument.totalProfit > 0) {
    patterns.push({
      id: "best-instrument",
      insight: `Your most profitable instrument is ${bestInstrument.key} with ${bestInstrument.winRate}% win rate.`,
      stat: `${bestInstrument.trades.length} trades · ${formatCurrency(bestInstrument.totalProfit, currency)} total P&L`,
      tone: "success"
    });
  }

  const worstInstrument = [...instrumentBuckets].sort((left, right) => left.totalProfit - right.totalProfit)[0];
  if (worstInstrument && worstInstrument.totalProfit < 0) {
    patterns.push({
      id: "worst-instrument",
      insight: `You lose most on ${worstInstrument.key} — consider avoiding it.`,
      stat: `${worstInstrument.trades.length} trades · ${formatCurrency(worstInstrument.totalProfit, currency)} total P&L`,
      tone: "warning"
    });
  }

  const revengeTrades = findTradesAfterLosingDays(closedTrades);
  const revengeWinRate = calculateWinRate(revengeTrades);
  if (revengeTrades.length >= MIN_OCCURRENCES && revengeWinRate < overallWinRate) {
    patterns.push({
      id: "revenge-signal",
      insight: `You placed ${revengeTrades.length} trades on days after a loss. Those trades had a ${revengeWinRate}% win rate — below your average.`,
      stat: `Overall win rate ${overallWinRate}% · ${revengeTrades.length} trades after loss days`,
      tone: "warning"
    });
  }

  const anxiousTrades = closedTrades.filter((trade) => String(trade.emotion).toLowerCase() === "anxious");
  const anxiousWinRate = calculateWinRate(anxiousTrades);
  if (anxiousTrades.length >= MIN_OCCURRENCES && anxiousWinRate < overallWinRate) {
    patterns.push({
      id: "emotion-anxious",
      insight: `Trades logged when emotion was 'Anxious' have a ${anxiousWinRate}% win rate vs your ${overallWinRate}% overall average.`,
      stat: `${anxiousTrades.length} anxious trades · ${formatCurrency(sumProfit(anxiousTrades), currency)} total P&L`,
      tone: "warning"
    });
  }

  const overtrading = getOvertradingStats(closedTrades);
  if (
    overtrading.highActivityDays >= MIN_OCCURRENCES &&
    overtrading.lowActivityTrades >= MIN_OCCURRENCES &&
    overtrading.highActivityWinRate < overtrading.lowActivityWinRate
  ) {
    patterns.push({
      id: "overtrading-signal",
      insight: `On days with 3+ trades, your win rate drops to ${overtrading.highActivityWinRate}%. Your best results come from 1-2 trades/day.`,
      stat: `${overtrading.highActivityDays} high-activity days · ${overtrading.highActivityTrades} trades`,
      tone: "warning"
    });
  }

  const yesRuleTrades = closedTrades.filter((trade) => trade.ruleFollowed === true);
  const noRuleTrades = closedTrades.filter((trade) => trade.ruleFollowed === false);
  if (yesRuleTrades.length >= MIN_OCCURRENCES && noRuleTrades.length >= MIN_OCCURRENCES) {
    const yesWinRate = calculateWinRate(yesRuleTrades);
    const noWinRate = calculateWinRate(noRuleTrades);
    patterns.push({
      id: "rule-compliance",
      insight: `Trades where Rule Followed = Yes have ${yesWinRate}% win rate. Rule Followed = No trades have ${noWinRate}% win rate.`,
      stat: `${yesRuleTrades.length} rule-followed · ${noRuleTrades.length} rule-broken`,
      tone: yesWinRate >= noWinRate ? "success" : "warning"
    });
  }

  return patterns;
}

function buildBuckets(trades: Trade[], getKey: (trade: Trade) => string): Bucket[] {
  const grouped = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = getKey(trade);
    grouped.set(key, [...(grouped.get(key) ?? []), trade]);
  }

  return Array.from(grouped.entries()).map(([key, rows]) => {
    const totalProfit = sumProfit(rows);
    return {
      key,
      trades: rows,
      totalProfit,
      averageProfit: totalProfit / rows.length,
      winRate: calculateWinRate(rows)
    };
  });
}

function getDayName(date: string) {
  const parsedDate = parseTradeDate(date);
  return dayNames[parsedDate.getDay()] ?? "Unknown day";
}

function findTradesAfterLosingDays(trades: Trade[]) {
  const tradesByDate = groupTradesByDate(trades);
  const losingNextDates = new Set<string>();

  for (const [date, dayTrades] of Array.from(tradesByDate.entries())) {
    if (sumProfit(dayTrades) < 0) {
      losingNextDates.add(addDays(date, 1));
    }
  }

  return trades.filter((trade) => losingNextDates.has(normalizeDateKey(trade.date)));
}

function getOvertradingStats(trades: Trade[]) {
  const tradesByDate = groupTradesByDate(trades);
  const highActivityTrades: Trade[] = [];
  const lowActivityTrades: Trade[] = [];
  let highActivityDays = 0;

  for (const dayTrades of Array.from(tradesByDate.values())) {
    if (dayTrades.length >= 3) {
      highActivityDays += 1;
      highActivityTrades.push(...dayTrades);
    } else if (dayTrades.length >= 1) {
      lowActivityTrades.push(...dayTrades);
    }
  }

  return {
    highActivityDays,
    highActivityTrades: highActivityTrades.length,
    highActivityWinRate: calculateWinRate(highActivityTrades),
    lowActivityTrades: lowActivityTrades.length,
    lowActivityWinRate: calculateWinRate(lowActivityTrades)
  };
}

function groupTradesByDate(trades: Trade[]) {
  const grouped = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = normalizeDateKey(trade.date);
    grouped.set(key, [...(grouped.get(key) ?? []), trade]);
  }

  return grouped;
}

function normalizeDateKey(date: string) {
  return parseTradeDate(date).toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const parsedDate = parseTradeDate(date);
  parsedDate.setDate(parsedDate.getDate() + days);
  return parsedDate.toISOString().slice(0, 10);
}

function parseTradeDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
}

function calculateWinRate(trades: Trade[]) {
  if (!trades.length) {
    return 0;
  }

  return Math.round((trades.filter((trade) => trade.result === "Win" || trade.profitLoss > 0).length / trades.length) * 100);
}

function sumProfit(trades: Trade[]) {
  return trades.reduce((sum, trade) => sum + (Number.isFinite(trade.profitLoss) ? trade.profitLoss : 0), 0);
}

function normalizeLabel(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized || fallback;
}
