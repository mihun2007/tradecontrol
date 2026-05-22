import "server-only";

import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import type { DailyReview } from "@/lib/daily-reviews";
import type { Expense } from "@/lib/expenses";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Trade } from "@/lib/trades";
import type { UserProfile } from "@/lib/user-profile";

export type SelectedTimeRange = "7D" | "30D" | "90D" | "ALL";

export type AiCoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export type AiConversationSummary = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TradingCoachSummary = {
  averageLoss: number;
  averageRiskReward: number;
  averageWin: number;
  bestInstrument: string;
  bestSession: string;
  dailyReviewPatterns: string[];
  expensesTotal: number;
  maxDrawdown: number;
  mostCommonEmotion: string;
  mostCommonMistakes: string[];
  netProfit: number;
  overtradingDays: string[];
  profitFactor: number;
  realNetProfitAfterExpenses: number;
  ruleCompliancePercent: number;
  totalTrades: number;
  winRate: number;
  worstInstrument: string;
  worstSession: string;
};

type LoadedCoachData = {
  dailyReviews: DailyReview[];
  expenses: Expense[];
  profile: Partial<UserProfile>;
  subscriptionPlan: "free" | "pro";
  subscriptionStatus: string;
  trades: Trade[];
};

export const AI_COACH_SYSTEM_PROMPT = `You are TradeControl AI Coach, a trading journal and discipline assistant.
Your role is to analyze the user's trading behavior, risk control, emotions, journaling, and performance patterns.
You do not provide financial advice, buy/sell signals, price predictions, trade entries, or guaranteed outcomes.
You help the user improve discipline, process quality, risk management, emotional control, and review habits.
If the user asks for a signal, market prediction, or direct instruction to buy/sell, refuse politely and redirect to risk management, journaling, or educational explanation.
If the user asks an educational trading concept question, explain the concept plainly first, then connect it to journaling, risk, or discipline.
Always answer clearly, practically, and professionally.
Use the user's own journal data when available.
Be concise but useful.
Include a risk disclaimer when the answer touches trading decisions.

Use this response structure:
Short summary
Key observations
Main risks/mistakes
Practical improvement plan
Suggested rule for next session
Disclaimer when needed`;

const allowedRanges: SelectedTimeRange[] = ["7D", "30D", "90D", "ALL"];

export function normalizeTimeRange(value: unknown): SelectedTimeRange {
  return typeof value === "string" && allowedRanges.includes(value as SelectedTimeRange)
    ? value as SelectedTimeRange
    : "30D";
}

export function isProPlan(profile: Partial<UserProfile>) {
  return Boolean(profile.isProUser) || profile.subscriptionPlan === "pro" || profile.subscriptionStatus === "active" || profile.subscriptionStatus === "trialing";
}

export async function loadCoachData(userId: string, requestedRange: SelectedTimeRange, isProUser: boolean): Promise<LoadedCoachData & { effectiveRange: SelectedTimeRange }> {
  const effectiveRange = isProUser ? requestedRange : requestedRange === "7D" ? "7D" : "30D";
  const [profileSnapshot, tradesSnapshot, expensesSnapshot, reviewsSnapshot] = await Promise.all([
    userRef(userId).get(),
    userRef(userId).collection("trades").get(),
    userRef(userId).collection("expenses").get(),
    userRef(userId).collection("dailyReviews").get()
  ]);
  const profile = profileSnapshot.data() as Partial<UserProfile> | undefined ?? {};
  const filteredTrades = filterByRange(tradesSnapshot.docs.map((doc) => tradeFromData(doc.id, doc.data())), effectiveRange);
  const filteredExpenses = filterByRange(expensesSnapshot.docs.map((doc) => expenseFromData(doc.id, doc.data())), effectiveRange);
  const filteredReviews = filterByRange(reviewsSnapshot.docs.map((doc) => reviewFromData(doc.id, doc.data())), effectiveRange);

  return {
    dailyReviews: filteredReviews,
    effectiveRange,
    expenses: filteredExpenses,
    profile,
    subscriptionPlan: isProPlan(profile) ? "pro" : "free",
    subscriptionStatus: profile.subscriptionStatus || "free",
    trades: filteredTrades
  };
}

export function buildTradingCoachSummary(input: {
  dailyReviews: DailyReview[];
  expenses: Expense[];
  profile: Partial<UserProfile>;
  trades: Trade[];
}): TradingCoachSummary {
  const closedTrades = input.trades.filter((trade) => trade.result !== "Open");
  const winningTrades = closedTrades.filter((trade) => trade.profitLoss > 0 || trade.result === "Win");
  const losingTrades = closedTrades.filter((trade) => trade.profitLoss < 0 || trade.result === "Loss");
  const grossProfit = winningTrades.reduce((sum, trade) => sum + safeNumber(trade.profitLoss), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + safeNumber(trade.profitLoss), 0));
  const netProfit = input.trades.reduce((sum, trade) => sum + safeNumber(trade.profitLoss), 0);
  const expensesTotal = input.expenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);
  const rules = input.trades.map((trade) => trade.ruleFollowed);
  const reviewRules = input.dailyReviews.flatMap((review) => [
    review.followedPlan,
    review.respectedRisk,
    review.noRevengeTrading,
    review.stoppedAtLimit,
    review.journaledEveryTrade
  ]);
  const allRules = [...rules, ...reviewRules];

  return {
    averageLoss: average(losingTrades.map((trade) => Math.abs(safeNumber(trade.profitLoss)))),
    averageRiskReward: average(input.trades.map((trade) => safeNumber(trade.rr)).filter(Boolean)),
    averageWin: average(winningTrades.map((trade) => safeNumber(trade.profitLoss))),
    bestInstrument: bucketBest(input.trades, (trade) => trade.instrument, "best"),
    bestSession: bucketBest(input.trades, (trade) => trade.session, "best"),
    dailyReviewPatterns: buildReviewPatterns(input.dailyReviews),
    expensesTotal,
    maxDrawdown: calculateMaxDrawdown(input.trades),
    mostCommonEmotion: mostCommon([
      ...input.trades.map((trade) => String(trade.emotion)),
      ...input.dailyReviews.map((review) => String(review.emotionalState))
    ]) || "Not enough data",
    mostCommonMistakes: topCounts(input.dailyReviews.map((review) => review.mainMistake).filter(Boolean), 3),
    netProfit,
    overtradingDays: findOvertradingDays(input.trades, input.profile.maxTradesPerDay || 3),
    profitFactor: grossLoss ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? grossProfit : 0,
    realNetProfitAfterExpenses: netProfit - expensesTotal,
    ruleCompliancePercent: allRules.length ? Math.round((allRules.filter(Boolean).length / allRules.length) * 100) : 0,
    totalTrades: input.trades.length,
    winRate: closedTrades.length ? Math.round((winningTrades.length / closedTrades.length) * 100) : 0,
    worstInstrument: bucketBest(input.trades, (trade) => trade.instrument, "worst"),
    worstSession: bucketBest(input.trades, (trade) => trade.session, "worst")
  };
}

export function buildCoachPrompt(input: {
  effectiveRange: SelectedTimeRange;
  isProUser: boolean;
  recentMessages: AiCoachMessage[];
  summary: TradingCoachSummary;
  userMessage: string;
}) {
  return [
    `Subscription: ${input.isProUser ? "Pro" : "Free"}`,
    `Analysis time range: ${input.effectiveRange}`,
    "Server-side journal summary:",
    JSON.stringify(input.summary, null, 2),
    input.recentMessages.length
      ? `Recent conversation context:\n${input.recentMessages.map((message) => `${message.role}: ${message.content}`).join("\n")}`
      : "Recent conversation context: none",
    `User message: ${input.userMessage}`,
    !input.isProUser ? "Free plan instruction: keep the answer basic, concise, and avoid deep 90D/ALL analysis." : "Pro plan instruction: provide deeper pattern analysis when useful."
  ].join("\n\n");
}

export async function getDailyUsage(userId: string) {
  const reference = usageRef(userId);
  const snapshot = await reference.get();
  return Number(snapshot.data()?.count) || 0;
}

export async function getAiUsageStatus(userId: string) {
  const [profileSnapshot, usage] = await Promise.all([
    userRef(userId).get(),
    getDailyUsage(userId)
  ]);
  const isProUser = isProPlan(profileSnapshot.data() as Partial<UserProfile> | undefined ?? {});
  return {
    dailyLimit: isProUser ? 100 : 10,
    dailyUsage: usage
  };
}

export async function incrementDailyUsage(userId: string) {
  await usageRef(userId).set({
    count: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function listConversations(userId: string): Promise<AiConversationSummary[]> {
  const snapshot = await userRef(userId).collection("aiConversations").orderBy("updatedAt", "desc").limit(12).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title || "AI Coach conversation",
    createdAt: serializeDate(doc.data().createdAt),
    updatedAt: serializeDate(doc.data().updatedAt)
  }));
}

export async function listConversationMessages(userId: string, conversationId: string): Promise<AiCoachMessage[]> {
  if (!conversationId) return [];
  const snapshot = await conversationRef(userId, conversationId).collection("messages").orderBy("createdAt", "asc").limit(30).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    role: doc.data().role === "user" ? "user" : "assistant",
    content: doc.data().content || "",
    createdAt: serializeDate(doc.data().createdAt)
  }));
}

export async function saveConversationTurn(input: {
  assistantContent: string;
  conversationId?: string;
  title: string;
  userContent: string;
  userId: string;
}) {
  const conversation = input.conversationId
    ? conversationRef(input.userId, input.conversationId)
    : userRef(input.userId).collection("aiConversations").doc();

  await conversation.set({
    title: input.title,
    ...(input.conversationId ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  const messages = conversation.collection("messages");
  const userMessage = messages.doc();
  const assistantMessage = messages.doc();

  await Promise.all([
    userMessage.set({
      role: "user",
      content: input.userContent,
      createdAt: FieldValue.serverTimestamp()
    }),
    assistantMessage.set({
      role: "assistant",
      content: input.assistantContent,
      createdAt: FieldValue.serverTimestamp()
    })
  ]);

  return conversation.id;
}

export async function deleteConversation(userId: string, conversationId: string) {
  const conversation = conversationRef(userId, conversationId);
  const messages = await conversation.collection("messages").get();
  await Promise.all(messages.docs.map((doc) => doc.ref.delete()));
  await conversation.delete();
}

function userRef(userId: string) {
  return getAdminDb().collection("users").doc(userId);
}

function usageRef(userId: string) {
  return userRef(userId).collection("aiUsage").doc(new Date().toISOString().slice(0, 10));
}

function conversationRef(userId: string, conversationId: string) {
  return userRef(userId).collection("aiConversations").doc(conversationId);
}

function filterByRange<T extends { date: string }>(items: T[], range: SelectedTimeRange) {
  if (range === "ALL") return items;
  const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  const thresholdKey = threshold.toISOString().slice(0, 10);
  return items.filter((item) => item.date >= thresholdKey);
}

function tradeFromData(id: string, data: DocumentData): Trade {
  return {
    id,
    date: data.date || new Date().toISOString().slice(0, 10),
    session: data.session || "London",
    instrument: data.instrument || "Unknown",
    tradeType: data.tradeType || data.type || "Buy",
    type: data.type || data.tradeType || "Buy",
    entryPrice: safeNumber(data.entryPrice),
    stopLoss: safeNumber(data.stopLoss),
    takeProfit: safeNumber(data.takeProfit),
    lotSize: safeNumber(data.lotSize),
    riskAmount: safeNumber(data.riskAmount),
    result: data.result || "Open",
    profitLoss: safeNumber(data.profitLoss),
    strategy: data.strategy || "Manual",
    setupQuality: data.setupQuality || "B",
    emotion: data.emotion || "Calm",
    ruleFollowed: Boolean(data.ruleFollowed),
    notes: data.notes || "",
    screenshotUrl: "",
    screenshotPath: "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
    rr: safeNumber(data.rr)
  };
}

function expenseFromData(id: string, data: DocumentData): Expense {
  return {
    id,
    date: data.date || new Date().toISOString().slice(0, 10),
    category: data.category || "Other",
    amount: safeNumber(data.amount),
    status: data.status || "Paid",
    notes: data.notes || "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt)
  };
}

function reviewFromData(id: string, data: DocumentData): DailyReview {
  return {
    id,
    date: data.date || id,
    followedPlan: Boolean(data.followedPlan),
    respectedRisk: Boolean(data.respectedRisk),
    noRevengeTrading: Boolean(data.noRevengeTrading),
    stoppedAtLimit: Boolean(data.stoppedAtLimit),
    journaledEveryTrade: Boolean(data.journaledEveryTrade),
    emotionalState: data.emotionalState || "Calm",
    dailyRating: data.dailyRating || "Good",
    mainMistake: data.mainMistake || "",
    bestDecision: data.bestDecision || "",
    lessonLearned: data.lessonLearned || "",
    planForTomorrow: data.planForTomorrow || "",
    notes: data.notes || "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt)
  };
}

function serializeDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return typeof value === "string" ? value : undefined;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bucketBest(trades: Trade[], key: (trade: Trade) => string, direction: "best" | "worst") {
  const buckets = new Map<string, number>();
  trades.forEach((trade) => {
    const bucket = key(trade) || "Unknown";
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + safeNumber(trade.profitLoss));
  });
  const sorted = Array.from(buckets.entries()).sort((first, second) => direction === "best" ? second[1] - first[1] : first[1] - second[1]);
  return sorted[0]?.[0] || "Not enough data";
}

function mostCommon(values: string[]) {
  return topCounts(values.filter(Boolean), 1)[0] || "";
}

function topCounts(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries()).sort((first, second) => second[1] - first[1]).slice(0, limit).map(([value]) => value);
}

function findOvertradingDays(trades: Trade[], maxTradesPerDay: number) {
  const counts = new Map<string, number>();
  trades.forEach((trade) => counts.set(trade.date, (counts.get(trade.date) ?? 0) + 1));
  return Array.from(counts.entries()).filter(([, count]) => count > maxTradesPerDay).map(([date]) => date);
}

function calculateMaxDrawdown(trades: Trade[]) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  [...trades].sort((first, second) => first.date.localeCompare(second.date)).forEach((trade) => {
    equity += safeNumber(trade.profitLoss);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });
  return Number(maxDrawdown.toFixed(2));
}

function buildReviewPatterns(reviews: DailyReview[]) {
  if (!reviews.length) return ["No daily reviews logged in this range."];
  const respectedRisk = reviews.filter((review) => review.respectedRisk).length;
  const journaled = reviews.filter((review) => review.journaledEveryTrade).length;
  return [
    `${respectedRisk}/${reviews.length} reviews marked risk respected.`,
    `${journaled}/${reviews.length} reviews marked every trade journaled.`,
    `Most common review emotion: ${mostCommon(reviews.map((review) => review.emotionalState)) || "Not enough data"}.`
  ];
}
