import type { Trade } from "@/lib/trades";

export type EquityPoint = {
  tradeId: string;
  date: string;
  balance: number;
  profitLoss: number;
};

export type EquityCurve = {
  startingBalance: number;
  points: EquityPoint[];
  netProfit: number;
  maxDrawdown: number;
};

const defaultStartingBalance = 10000;

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function timeValue(value?: string) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortTradesChronologically(trades: Trade[]) {
  return [...trades].sort((first, second) => {
    const dateOrder = first.date.localeCompare(second.date);

    if (dateOrder !== 0) {
      return dateOrder;
    }

    const firstTime = timeValue(first.createdAt ?? first.updatedAt);
    const secondTime = timeValue(second.createdAt ?? second.updatedAt);

    if (firstTime !== secondTime) {
      return firstTime - secondTime;
    }

    return first.id.localeCompare(second.id);
  });
}

export function buildEquityCurve(trades: Trade[], startingBalance = defaultStartingBalance): EquityCurve {
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdown = 0;

  const points = sortTradesChronologically(trades)
    .map((trade) => {
      const profitLoss = safeNumber(trade.profitLoss);
      balance += profitLoss;
      peak = Math.max(peak, balance);
      maxDrawdown = Math.min(maxDrawdown, balance - peak);

      return {
        tradeId: trade.id,
        date: trade.date,
        balance,
        profitLoss
      };
    });

  return {
    startingBalance,
    points,
    netProfit: points.reduce((sum, point) => sum + point.profitLoss, 0),
    maxDrawdown
  };
}

export function buildDailyProfitBuckets(trades: Trade[], referenceDate = new Date()) {
  const monday = new Date(referenceDate);
  const day = monday.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - distanceFromMonday);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = formatLocalDateKey(date);
    const dayTrades = trades.filter((trade) => trade.date === key);

    return {
      date: key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      profitLoss: dayTrades.reduce((sum, trade) => sum + safeNumber(trade.profitLoss), 0),
      trades: dayTrades.length
    };
  });
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildLinePoints(values: number[]) {
  if (!values.length) {
    return "";
  }

  if (values.length === 1) {
    return "50,50";
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = Math.max(1, rawMax - rawMin);
  const domainPadding = Math.max(rawRange * 0.18, Math.abs(values[0] ?? 0) * 0.015, 100);
  const min = rawMin - domainPadding;
  const max = rawMax + domainPadding;
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = 3 + (index / (values.length - 1)) * 94;
      const y = 88 - ((value - min) / range) * 76;
      return `${x},${y}`;
    })
    .join(" ");
}
