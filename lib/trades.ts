export type TradeResult = "Win" | "Loss" | "Breakeven" | "Open";
export type TradeSession = "Asia" | "London" | "New York";
export type TradeType = "Buy" | "Sell";
export type SetupQuality = "A+" | "A" | "B" | "C";
export type Emotion = "Calm" | "Fear" | "Greed" | "Revenge" | "FOMO" | "Anxious" | "Confident" | "Unknown";

export type TradeSide = TradeType;
export type TradingSession = TradeSession;

export type Trade = {
  id: string;
  date: string;
  session: TradeSession;
  instrument: string;
  tradeType: TradeType;
  type: TradeType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  result: TradeResult;
  profitLoss: number;
  strategy: string;
  setupQuality: SetupQuality;
  emotion: Emotion;
  ruleFollowed: boolean | null;
  notes: string;
  screenshotUrl: string;
  screenshotPath: string;
  createdAt?: string;
  updatedAt?: string;
  rr: number;
};

export type NewTrade = {
  date: string;
  session: TradeSession;
  instrument: string;
  tradeType: TradeType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  result: TradeResult;
  profitLoss: number;
  strategy: string;
  setupQuality: SetupQuality;
  emotion: Emotion;
  ruleFollowed: boolean | null;
  notes: string;
  screenshotUrl: string;
  screenshotPath: string;
  rr: number;
};

export const tradeStorageKey = "tradecontrol-trades";

export function formatCurrency(value: number, currency = "USD") {
  return `${value >= 0 ? "+" : "-"}${new Intl.NumberFormat("en-US", {
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(Math.abs(value))}`;
}

export function calculateRiskReward(entry: number, stopLoss: number, takeProfit: number) {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);

  if (!risk || !reward) {
    return 0;
  }

  return Number((reward / risk).toFixed(2));
}
