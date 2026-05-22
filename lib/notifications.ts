import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type FieldValue,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { requireFirestoreDb } from "@/lib/firebase";
import type { Trade } from "@/lib/trades";
import type { UserProfile } from "@/lib/user-profile";

export type NotificationType = "info" | "success" | "warning" | "danger";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
};

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
};

export type WeeklyReport = {
  totalTrades: number;
  weeklyProfitLoss: number;
  winRate: number;
  bestInstrument: string;
  mainMistake: string;
  disciplineScore: number;
};

function notificationsCollection() {
  return collection(requireFirestoreDb(), "notifications");
}

function serializeTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function normalizeNotification(snapshot: QueryDocumentSnapshot<DocumentData>): Notification {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    type: ["info", "success", "warning", "danger"].includes(data.type) ? data.type : "info",
    title: typeof data.title === "string" ? data.title : "Notification",
    message: typeof data.message === "string" ? data.message : "",
    read: Boolean(data.read),
    createdAt: serializeTimestamp(data.createdAt)
  };
}

export async function createNotification(input: NewNotification) {
  await addDoc(notificationsCollection(), {
    ...input,
    read: false,
    createdAt: serverTimestamp() as FieldValue
  });
}

export async function getUserNotifications(userId: string) {
  const snapshot = await getDocs(
    query(notificationsCollection(), where("userId", "==", userId), limit(50))
  );

  return sortNotifications(snapshot.docs.map(normalizeNotification)).slice(0, 25);
}

function sortNotifications(notifications: Notification[]) {
  return [...notifications].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(requireFirestoreDb(), "notifications", notificationId), { read: true });
}

export async function sendDailyTradingReminder(userId: string) {
  await createNotification({
    userId,
    type: "info",
    title: "Trading plan check",
    message: "Review your risk limits and session plan before taking the first trade."
  });
}

export async function sendDailyReviewReminder(userId: string) {
  await createNotification({
    userId,
    type: "info",
    title: "Daily review reminder",
    message: "Your trading review is waiting. Capture emotions, mistakes, and tomorrow's focus while the session is fresh."
  });
}

export async function sendWeeklyReport(userId: string, report: WeeklyReport) {
  await createNotification({
    userId,
    type: "success",
    title: "Weekly report available",
    message: `Weekly P/L: ${formatSignedCurrency(report.weeklyProfitLoss)} · Win rate: ${report.winRate.toFixed(1)}% · Discipline score: ${report.disciplineScore}/100.`
  });
}

export async function sendStopTradingWarning(userId: string, reason: string) {
  await createNotification({
    userId,
    type: "danger",
    title: "Stop trading warning",
    message: reason
  });
}

export async function sendRuleViolationAlert(userId: string, message: string) {
  await createNotification({
    userId,
    type: "warning",
    title: "Rule violation alert",
    message
  });
}

export function buildWeeklyReport(trades: Trade[]): WeeklyReport {
  const weekStart = startOfWeek(new Date());
  const weeklyTrades = trades.filter((trade) => new Date(`${trade.date}T00:00:00`) >= weekStart);
  const closedTrades = weeklyTrades.filter((trade) => trade.result !== "Open");
  const wins = closedTrades.filter((trade) => trade.result === "Win").length;
  const weeklyProfitLoss = weeklyTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;
  const instrumentTotals = weeklyTrades.reduce<Record<string, number>>((totals, trade) => {
    totals[trade.instrument] = (totals[trade.instrument] ?? 0) + trade.profitLoss;
    return totals;
  }, {});
  const bestInstrument =
    Object.entries(instrumentTotals).sort(([, left], [, right]) => right - left)[0]?.[0] ?? "No trades yet";
  const ruleBreaks = weeklyTrades.filter((trade) => !trade.ruleFollowed).length;
  const emotionalTrades = weeklyTrades.filter((trade) => ["Fear", "Greed", "Revenge", "FOMO", "Anxious"].includes(trade.emotion)).length;
  const mainMistake = ruleBreaks
    ? "Breaking written rules"
    : emotionalTrades
      ? "Emotion-led execution"
      : weeklyTrades.length
        ? "No dominant mistake logged"
        : "No weekly data yet";
  const cleanTrades = weeklyTrades.filter((trade) => trade.ruleFollowed).length;
  const disciplineScore = weeklyTrades.length ? Math.round((cleanTrades / weeklyTrades.length) * 100) : 100;

  return {
    totalTrades: weeklyTrades.length,
    weeklyProfitLoss,
    winRate,
    bestInstrument,
    mainMistake,
    disciplineScore
  };
}

export function evaluateNotificationTriggers({
  hasDailyReview,
  profile,
  trades,
  userId
}: {
  hasDailyReview: boolean;
  profile: UserProfile | null;
  trades: Trade[];
  userId: string;
}) {
  const settings = profile?.notificationSettings;

  if (!settings || !settings.emailNotificationsEnabled) {
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const todaysTrades = trades.filter((trade) => trade.date === today);
  const dailyProfitLoss = todaysTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const drawdownPercent =
    dailyProfitLoss < 0 && profile?.startingBalance ? Math.abs((dailyProfitLoss / profile.startingBalance) * 100) : 0;
  const triggers: Array<{ key: string; run: () => Promise<void> }> = [];

  if (settings.stopTradingWarnings && profile && drawdownPercent >= profile.maxDailyLoss) {
    triggers.push({
      key: `${userId}:stop-loss:${today}`,
      run: () => sendStopTradingWarning(userId, `Daily loss limit reached (${drawdownPercent.toFixed(1)}%). Stop trading and protect your account.`)
    });
  }

  if (settings.stopTradingWarnings && profile && todaysTrades.length > profile.maxTradesPerDay) {
    triggers.push({
      key: `${userId}:max-trades:${today}`,
      run: () => sendStopTradingWarning(userId, `Max trades exceeded today (${todaysTrades.length}/${profile.maxTradesPerDay}). Pause before taking another setup.`)
    });
  }

  if (settings.ruleViolationAlerts && todaysTrades.some((trade) => !trade.ruleFollowed)) {
    triggers.push({
      key: `${userId}:rule-break:${today}`,
      run: () => sendRuleViolationAlert(userId, "At least one trade today was marked as rule-breaking. Review the reason before continuing.")
    });
  }

  if (settings.dailyReviewReminder && todaysTrades.length > 0 && !hasDailyReview) {
    triggers.push({
      key: `${userId}:daily-review:${today}`,
      run: () => sendDailyReviewReminder(userId)
    });
  }

  if (settings.dailyTradingReminder) {
    triggers.push({
      key: `${userId}:daily-trading:${today}`,
      run: () => sendDailyTradingReminder(userId)
    });
  }

  if (settings.weeklyReport) {
    const weekKey = startOfWeek(new Date()).toISOString().slice(0, 10);
    triggers.push({
      key: `${userId}:weekly-report:${weekKey}`,
      run: () => sendWeeklyReport(userId, buildWeeklyReport(trades))
    });
  }

  return triggers;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = next.getDate() - day + (day === 0 ? -6 : 1);
  next.setDate(diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatSignedCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(Math.abs(value));

  return `${value >= 0 ? "+" : "-"}${formatted}`;
}
