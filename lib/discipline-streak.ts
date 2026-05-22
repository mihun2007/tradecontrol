import type { Trade } from "@/lib/trades";

export type DisciplineStreakStats = {
  bestStreak: number;
  currentStreak: number;
  isPersonalRecord: boolean;
  lastCleanTradingDay: string;
  lastTradingDay: string;
};

export const emptyDisciplineStreak: DisciplineStreakStats = {
  bestStreak: 0,
  currentStreak: 0,
  isPersonalRecord: false,
  lastCleanTradingDay: "",
  lastTradingDay: ""
};

export function calculateDisciplineStreak(trades: Pick<Trade, "date" | "ruleFollowed">[]): DisciplineStreakStats {
  if (!trades.length) {
    return emptyDisciplineStreak;
  }

  const tradesByDate = new Map<string, Pick<Trade, "date" | "ruleFollowed">[]>();

  trades.forEach((trade) => {
    if (!trade.date) {
      return;
    }

    const dayTrades = tradesByDate.get(trade.date) ?? [];
    dayTrades.push(trade);
    tradesByDate.set(trade.date, dayTrades);
  });

  const tradingDays = Array.from(tradesByDate.entries())
    .map(([date, dayTrades]) => ({
      date,
      isClean: dayTrades.every((trade) => trade.ruleFollowed === true)
    }))
    .sort((first, second) => first.date.localeCompare(second.date));

  if (!tradingDays.length) {
    return emptyDisciplineStreak;
  }

  let bestStreak = 0;
  let runningStreak = 0;
  let lastCleanTradingDay = "";

  tradingDays.forEach((day) => {
    if (day.isClean) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
      lastCleanTradingDay = day.date;
      return;
    }

    runningStreak = 0;
  });

  let currentStreak = 0;

  for (let index = tradingDays.length - 1; index >= 0; index -= 1) {
    if (!tradingDays[index].isClean) {
      break;
    }

    currentStreak += 1;
  }

  return {
    bestStreak,
    currentStreak,
    isPersonalRecord: currentStreak >= 10 && currentStreak === bestStreak,
    lastCleanTradingDay,
    lastTradingDay: tradingDays[tradingDays.length - 1].date
  };
}
