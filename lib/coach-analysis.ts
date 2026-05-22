import type { DailyReview, EmotionalState } from "@/lib/daily-reviews";
import type { Expense } from "@/lib/expenses";
import type { Trade } from "@/lib/trades";
import { formatCurrency } from "@/lib/trades";
import type { UserProfile } from "@/lib/user-profile";

type ProfitBucket = {
  name: string;
  profit: number;
  trades: number;
  winRate: number;
};

type RiskViolation = {
  date: string;
  label: string;
  detail: string;
};

export type CoachAnalysis = {
  averageRiskControl: number;
  bestBehavior: string;
  bestInstrument: ProfitBucket | null;
  bestSession: ProfitBucket | null;
  disciplineScore: number;
  expenseTotal: number;
  mainMistake: string;
  netAfterExpenses: number;
  netProfit: number;
  overtradingDays: string[];
  profitByInstrument: ProfitBucket[];
  profitBySession: ProfitBucket[];
  recentReview: DailyReview | null;
  riskViolations: RiskViolation[];
  ruleCompliance: number;
  suggestedRule: string;
  totalExpenses: number;
  totalTrades: number;
  weakestEmotion: string;
  winRate: number;
  worstSession: ProfitBucket | null;
};

export function calculateWinRate(trades: Trade[]) {
  const closedTrades = trades.filter((trade) => trade.result !== "Open");
  if (!closedTrades.length) return 0;

  const wins = closedTrades.filter((trade) => trade.result === "Win" || trade.profitLoss > 0).length;
  return Math.round((wins / closedTrades.length) * 100);
}

export function calculateNetProfit(trades: Trade[]) {
  return trades.reduce((total, trade) => total + safeNumber(trade.profitLoss), 0);
}

export function calculateProfitByInstrument(trades: Trade[]) {
  return bucketProfit(trades, (trade) => trade.instrument || "Unknown");
}

export function calculateProfitBySession(trades: Trade[]) {
  return bucketProfit(trades, (trade) => trade.session || "Unknown");
}

export function findMostCommonMistake(dailyReviews: DailyReview[]) {
  const counts = new Map<string, number>();

  dailyReviews.forEach((review) => {
    const mistake = normalizeJournalText(review.mainMistake);
    if (!mistake) return;
    counts.set(mistake, (counts.get(mistake) ?? 0) + 1);
  });

  return Array.from(counts.entries()).sort((first, second) => second[1] - first[1])[0]?.[0] || "Not enough data";
}

export function findWeakestEmotion(dailyReviews: DailyReview[], trades: Trade[]) {
  const emotionLosses = new Map<string, { count: number; pnl: number }>();

  trades.forEach((trade) => {
    const emotion = trade.emotion || "Unknown";
    const current = emotionLosses.get(emotion) ?? { count: 0, pnl: 0 };
    emotionLosses.set(emotion, {
      count: current.count + 1,
      pnl: current.pnl + safeNumber(trade.profitLoss)
    });
  });

  dailyReviews.forEach((review) => {
    const penalty = review.dailyRating === "Dangerous" ? -2 : review.dailyRating === "Bad" ? -1 : 0;
    if (!penalty) return;

    const current = emotionLosses.get(review.emotionalState) ?? { count: 0, pnl: 0 };
    emotionLosses.set(review.emotionalState, {
      count: current.count + 1,
      pnl: current.pnl + penalty
    });
  });

  const weakest = Array.from(emotionLosses.entries())
    .filter(([, value]) => value.count > 0)
    .sort((first, second) => first[1].pnl - second[1].pnl)[0];

  return weakest?.[0] || "Not enough emotion data yet";
}

export function calculateRuleCompliance(trades: Trade[], dailyReviews: DailyReview[]) {
  const tradeScores = trades.map((trade) => (trade.ruleFollowed ? 1 : 0));
  const reviewScores = dailyReviews.flatMap((review) => [
    review.followedPlan,
    review.respectedRisk,
    review.noRevengeTrading,
    review.stoppedAtLimit,
    review.journaledEveryTrade
  ]).map((followed) => (followed ? 1 : 0));

  const scores: number[] = [...tradeScores, ...reviewScores];
  if (!scores.length) return 0;

  return Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 100);
}

export function findOvertradingDays(trades: Trade[], settings?: UserProfile | null) {
  const maxTrades = settings?.maxTradesPerDay || 3;
  const byDate = groupBy(trades, (trade) => trade.date);

  return Array.from(byDate.entries())
    .filter(([, dayTrades]) => dayTrades.length > maxTrades)
    .map(([date]) => date);
}

export function detectRiskRuleViolations(trades: Trade[], settings?: UserProfile | null) {
  const startingBalance = settings?.startingBalance || 10000;
  const maxRisk = settings?.maxRiskPerTrade || 1;
  const riskCap = startingBalance * (maxRisk / 100);
  const maxDailyLoss = startingBalance * ((settings?.maxDailyLoss || 3) / 100);
  const violations: RiskViolation[] = [];

  trades.forEach((trade) => {
    if (safeNumber(trade.riskAmount) > riskCap) {
      violations.push({
        date: trade.date,
        label: "Risk per trade exceeded",
        detail: `${trade.instrument} risked ${formatCurrency(trade.riskAmount)} above the ${maxRisk}% cap.`
      });
    }

    if (!trade.ruleFollowed) {
      violations.push({
        date: trade.date,
        label: "Rule not followed",
        detail: `${trade.instrument} was marked as outside the trading plan.`
      });
    }
  });

  groupBy(trades, (trade) => trade.date).forEach((dayTrades, date) => {
    const dayPnl = calculateNetProfit(dayTrades);
    if (dayPnl < -maxDailyLoss) {
      violations.push({
        date,
        label: "Daily loss limit exceeded",
        detail: `${formatCurrency(dayPnl)} passed the configured daily loss limit.`
      });
    }
  });

  return violations;
}

export function buildCoachAnalysis(input: {
  dailyReviews: DailyReview[];
  expenses: Expense[];
  profile?: UserProfile | null;
  trades: Trade[];
}): CoachAnalysis {
  const { dailyReviews, expenses, profile, trades } = input;
  const profitByInstrument = calculateProfitByInstrument(trades);
  const profitBySession = calculateProfitBySession(trades);
  const bestInstrument = maxProfitBucket(profitByInstrument);
  const sortedSessions = [...profitBySession].sort((first, second) => second.profit - first.profit);
  const bestSession = sortedSessions[0] ?? null;
  const worstSession = [...profitBySession].sort((first, second) => first.profit - second.profit)[0] ?? null;
  const riskViolations = detectRiskRuleViolations(trades, profile);
  const ruleCompliance = calculateRuleCompliance(trades, dailyReviews);
  const overtradingDays = findOvertradingDays(trades, profile);
  const recentReview = [...dailyReviews].sort((first, second) => second.date.localeCompare(first.date))[0] ?? null;
  const totalExpenses = expenses.reduce((total, expense) => total + safeNumber(expense.amount), 0);
  const netProfit = calculateNetProfit(trades);
  const disciplineScore = calculateDisciplineScore(ruleCompliance, riskViolations.length, overtradingDays.length);
  const bestBehavior = findBestBehavior(dailyReviews, trades, ruleCompliance, bestSession?.name);
  const mainMistake = findMostCommonMistake(dailyReviews);

  return {
    averageRiskControl: Math.max(0, Math.min(100, Math.round(100 - riskViolations.length * 12))),
    bestBehavior,
    bestInstrument,
    bestSession,
    disciplineScore,
    expenseTotal: totalExpenses,
    mainMistake,
    netAfterExpenses: netProfit - totalExpenses,
    netProfit,
    overtradingDays,
    profitByInstrument,
    profitBySession,
    recentReview,
    riskViolations,
    ruleCompliance,
    suggestedRule: buildSuggestedRule(recentReview, riskViolations, overtradingDays, profile),
    totalExpenses,
    totalTrades: trades.length,
    weakestEmotion: findWeakestEmotion(dailyReviews, trades),
    winRate: calculateWinRate(trades),
    worstSession
  };
}

export function generateCoachResponse(message: string, analysis: CoachAnalysis, profile?: UserProfile | null) {
  const normalized = message.toLowerCase();
  const currency = profile?.accountCurrency || "USD";

  if (!analysis.totalTrades && !analysis.recentReview) {
    return "Add trades and daily reviews to unlock personalized coaching. Once you journal a few sessions, I can summarize discipline, emotional patterns, risk behavior, and repeated mistakes.";
  }

  if (normalized.includes("week") || normalized.includes("summarize") || normalized.includes("analyze my week")) {
    return [
      `This period shows ${formatCurrency(analysis.netProfit, currency)} net trading P/L with a ${analysis.winRate}% win rate across ${analysis.totalTrades} trades.`,
      `Best instrument: ${analysis.bestInstrument?.name ?? "not enough data"}. Worst session: ${analysis.worstSession?.name ?? "not enough data"}.`,
      `Main mistake: ${analysis.mainMistake}. Discipline score: ${analysis.disciplineScore}%.`,
      "Focus on repeating the cleanest process behavior, not predicting the next move."
    ].join(" ");
  }

  if (normalized.includes("lost") || normalized.includes("loss") || normalized.includes("lose") || normalized.includes("why did i lose")) {
    const losingTrades = analysis.totalTrades ? "losing trades cluster around" : "loss data is still thin, but watch";
    return [
      `Your ${losingTrades} ${analysis.weakestEmotion} emotion, ${analysis.worstSession?.name ?? "lower-quality"} sessions, and ${analysis.riskViolations.length} risk or rule violation(s).`,
      `Net trading P/L is ${formatCurrency(analysis.netProfit, currency)} and rule compliance is ${analysis.ruleCompliance}%.`,
      "The practical fix is behavioral: reduce trade count after a loss, verify the setup checklist before entry, and stop when the daily limit is reached."
    ].join(" ");
  }

  if (normalized.includes("tomorrow") || normalized.includes("plan")) {
    return [
      `Tomorrow's discipline plan: max ${profile?.maxTradesPerDay ?? 3} trades, max ${profile?.maxRiskPerTrade ?? 1}% risk per trade, and focus first on ${analysis.bestSession?.name ?? profile?.defaultSession ?? "your cleanest session"}.`,
      `Avoid: ${analysis.mainMistake}.`,
      `Rule: ${analysis.suggestedRule}`,
      "This is journaling guidance only, not a buy/sell plan."
    ].join(" ");
  }

  if (normalized.includes("mistake") || normalized.includes("habit")) {
    return `Your most visible mistake pattern is: ${analysis.mainMistake}. Overtrading appeared on ${analysis.overtradingDays.length} day(s), and rule compliance is ${analysis.ruleCompliance}%. Turn the mistake into one binary rule for the next session.`;
  }

  if (normalized.includes("emotion") || normalized.includes("fear") || normalized.includes("greed") || normalized.includes("fomo") || normalized.includes("revenge")) {
    return `Your weakest emotional context is ${analysis.weakestEmotion}. If that state appears before entry, reduce risk, pause, or skip the trade. The goal is to separate market analysis from emotional urgency.`;
  }

  if (normalized.includes("expense") || normalized.includes("cost")) {
    return `Your recorded trading expenses total ${formatCurrency(analysis.totalExpenses, currency)}, leaving real net profit at ${formatCurrency(analysis.netAfterExpenses, currency)}. Keep the coaching focus on whether costs support a repeatable process.`;
  }

  return [
    `Based on your journal, current discipline score is ${analysis.disciplineScore}% with ${analysis.ruleCompliance}% rule compliance.`,
    `Best session: ${analysis.bestSession?.name ?? "not enough data"}. Strongest instrument: ${analysis.bestInstrument?.name ?? "not enough data"}.`,
    `Main process focus: ${analysis.suggestedRule}`
  ].join(" ");
}

function bucketProfit(trades: Trade[], keyForTrade: (trade: Trade) => string): ProfitBucket[] {
  return Array.from(groupBy(trades, keyForTrade).entries())
    .map(([name, bucketTrades]) => ({
      name,
      profit: calculateNetProfit(bucketTrades),
      trades: bucketTrades.length,
      winRate: calculateWinRate(bucketTrades)
    }))
    .sort((first, second) => second.profit - first.profit);
}

function groupBy<T>(items: T[], keyForItem: (item: T) => string) {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    const key = keyForItem(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });

  return grouped;
}

function maxProfitBucket(buckets: ProfitBucket[]) {
  return buckets.length ? [...buckets].sort((first, second) => second.profit - first.profit)[0] : null;
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateDisciplineScore(ruleCompliance: number, riskViolationCount: number, overtradingDayCount: number) {
  if (!ruleCompliance) return 0;
  return Math.max(0, Math.min(100, ruleCompliance - riskViolationCount * 4 - overtradingDayCount * 6));
}

function inferBestBehavior(ruleCompliance: number, bestSession?: string) {
  if (ruleCompliance >= 85) return "You are preserving process quality by following the majority of your rules.";
  if (bestSession) return `Your cleanest behavior appears when you keep trades concentrated in the ${bestSession} session.`;
  return "Not enough data";
}

function findBestBehavior(dailyReviews: DailyReview[], trades: Trade[], ruleCompliance: number, bestSession?: string) {
  const explicitBestDecision = [...dailyReviews]
    .sort((first, second) => second.date.localeCompare(first.date))
    .map((review) => normalizeJournalText(review.bestDecision))
    .find(Boolean);

  if (explicitBestDecision) {
    return explicitBestDecision;
  }

  const cleanReviewCount = dailyReviews.filter((review) => (
    review.followedPlan &&
    review.respectedRisk &&
    review.noRevengeTrading &&
    review.stoppedAtLimit &&
    review.journaledEveryTrade
  )).length;

  if (cleanReviewCount) {
    return "You are consistently marking clean discipline in your daily reviews.";
  }

  const ruleFollowedTrades = trades.filter((trade) => trade.ruleFollowed);
  if (trades.length >= 3 && ruleFollowedTrades.length / trades.length >= 0.8) {
    return "You are preserving process quality by following the majority of your trade rules.";
  }

  if (trades.length && bestSession) {
    return `Your cleanest behavior appears when you keep trades concentrated in the ${bestSession} session.`;
  }

  return inferBestBehavior(ruleCompliance, bestSession);
}

function normalizeJournalText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length < 2) {
    return "";
  }

  return normalized;
}

function buildSuggestedRule(recentReview: DailyReview | null, riskViolations: RiskViolation[], overtradingDays: string[], profile?: UserProfile | null) {
  if (recentReview?.emotionalState === ("Revenge" satisfies EmotionalState)) {
    return "After any loss, take a mandatory 10-minute pause before scanning again.";
  }

  if (overtradingDays.length) {
    return `Stop trading immediately after ${profile?.maxTradesPerDay ?? 3} completed trades.`;
  }

  if (riskViolations.length) {
    return `Before entry, confirm risk is at or below ${profile?.maxRiskPerTrade ?? 1}% of account balance.`;
  }

  if (recentReview?.planForTomorrow) {
    return recentReview.planForTomorrow;
  }

  return "Only take confirmed setups that pass risk, invalidation, and rule checks.";
}
