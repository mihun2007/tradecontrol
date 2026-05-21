import type { Trade } from "./trades";
import type { UserProfile } from "./user-profile";

export type RiskSettings = {
  accountBalance: number;
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxTradesPerDay: number;
  maxConsecutiveLosses: number;
  dailyProfitTarget: number;
  defaultInstrument: string;
};

export type RiskLevel = "safe" | "warning" | "danger";

export const riskSettingsStorageKey = "tradecontrol-risk-settings";

export const defaultRiskSettings: RiskSettings = {
  accountBalance: 10000,
  maxRiskPerTrade: 1,
  maxDailyLoss: 3,
  maxTradesPerDay: 3,
  maxConsecutiveLosses: 2,
  dailyProfitTarget: 2,
  defaultInstrument: "XAUUSD"
};

export function toSafeNumber(value: string | number, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateRiskAmount(accountBalance: number, riskPercent: number) {
  return Math.max(0, toSafeNumber(accountBalance) * (Math.max(0, toSafeNumber(riskPercent)) / 100));
}

export function calculateStopDistance(entryPrice: number, stopLoss: number) {
  return Math.abs(toSafeNumber(entryPrice) - toSafeNumber(stopLoss));
}

export function calculateSuggestedLotSize(riskAmount: number, stopDistance: number, pointValue: number) {
  const denominator = toSafeNumber(stopDistance) * toSafeNumber(pointValue);

  if (denominator <= 0) {
    return 0;
  }

  return riskAmount / denominator;
}

export function calculateCalculatorResult({
  entryPrice,
  stopLoss,
  takeProfit,
  accountBalance,
  riskPercent,
  pointValue
}: {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  accountBalance: number;
  riskPercent: number;
  pointValue: number;
}) {
  const riskAmount = calculateRiskAmount(accountBalance, riskPercent);
  const stopDistance = calculateStopDistance(entryPrice, stopLoss);
  const suggestedLotSize = calculateSuggestedLotSize(riskAmount, stopDistance, pointValue);
  const estimatedLoss = suggestedLotSize * stopDistance * toSafeNumber(pointValue);
  const rewardDistance = Math.abs(toSafeNumber(takeProfit) - toSafeNumber(entryPrice));
  const riskReward = stopDistance > 0 && rewardDistance > 0 ? rewardDistance / stopDistance : 0;

  return {
    riskAmount,
    stopDistance,
    suggestedLotSize,
    estimatedLoss,
    riskReward
  };
}

export function calculateConsecutiveLosses(trades: Trade[]) {
  let losses = 0;
  const sortedTrades = [...trades].sort((a, b) => b.date.localeCompare(a.date));

  for (const trade of sortedTrades) {
    if (trade.result === "Loss") {
      losses += 1;
      continue;
    }

    if (trade.result === "Win" || trade.result === "Breakeven") {
      break;
    }
  }

  return losses;
}

export function calculateDailyRiskStatus(trades: Trade[], settings: RiskSettings) {
  const tradesTaken = trades.length;
  const dailyProfitLoss = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const consecutiveLosses = calculateConsecutiveLosses(trades);
  const currentDrawdownPercent = dailyProfitLoss < 0 ? Math.abs((dailyProfitLoss / settings.accountBalance) * 100) : 0;
  const dailyProfitPercent = dailyProfitLoss > 0 ? (dailyProfitLoss / settings.accountBalance) * 100 : 0;
  const rulesFollowedPercent = tradesTaken
    ? (trades.filter((trade) => trade.ruleFollowed).length / tradesTaken) * 100
    : 100;

  const stopReasons: string[] = [];
  const warningReasons: string[] = [];

  if (currentDrawdownPercent >= settings.maxDailyLoss) {
    stopReasons.push("Daily loss limit reached");
  }

  if (tradesTaken >= settings.maxTradesPerDay) {
    stopReasons.push("Max trades reached");
  }

  if (consecutiveLosses >= settings.maxConsecutiveLosses) {
    stopReasons.push("Consecutive loss limit reached");
  }

  if (dailyProfitPercent >= settings.dailyProfitTarget) {
    warningReasons.push("Daily profit target reached. Consider protecting profit.");
  }

  if (rulesFollowedPercent < 70) {
    warningReasons.push("Rules followed is under 70%");
  }

  const level: RiskLevel = stopReasons.length ? "danger" : warningReasons.length ? "warning" : "safe";
  const label =
    level === "danger"
      ? "Stop trading today"
      : level === "warning"
        ? "Be careful"
        : "You can trade";

  return {
    tradesTaken,
    dailyProfitLoss,
    consecutiveLosses,
    currentDrawdownPercent,
    rulesFollowedPercent,
    dailyProfitPercent,
    level,
    label,
    stopReasons,
    warningReasons
  };
}

export function riskSettingsFromProfile(profile: UserProfile | null | undefined): RiskSettings {
  if (!profile) {
    return defaultRiskSettings;
  }

  return {
    accountBalance: toSafeNumber(profile.startingBalance, defaultRiskSettings.accountBalance),
    maxRiskPerTrade: toSafeNumber(profile.maxRiskPerTrade, defaultRiskSettings.maxRiskPerTrade),
    maxDailyLoss: toSafeNumber(profile.maxDailyLoss, defaultRiskSettings.maxDailyLoss),
    maxTradesPerDay: toSafeNumber(profile.maxTradesPerDay, defaultRiskSettings.maxTradesPerDay),
    maxConsecutiveLosses: toSafeNumber(profile.maxConsecutiveLosses, defaultRiskSettings.maxConsecutiveLosses),
    dailyProfitTarget: toSafeNumber(profile.dailyProfitTarget, defaultRiskSettings.dailyProfitTarget),
    defaultInstrument: profile.defaultInstrument || defaultRiskSettings.defaultInstrument
  };
}
