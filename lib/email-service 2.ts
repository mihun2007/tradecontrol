import "server-only";

import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import {
  abandonedCheckoutReminderTemplate,
  dailyReviewReminderTemplate,
  freeLimitReachedTemplate,
  subscriptionActivatedEmailTemplate,
  weeklyReportTemplate,
  welcomeEmailTemplate,
  type EmailTemplate
} from "@/lib/email-templates";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { logError } from "@/lib/logger";
import { buildWeeklyReport, type WeeklyReport } from "@/lib/notifications";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { getEmailFromAddress, getResendClient } from "@/lib/resend";
import type { Trade } from "@/lib/trades";
import { normalizeUserProfile, type NotificationSettings, type UserProfile } from "@/lib/user-profile";

type EmailKind =
  | "abandonedCheckout"
  | "dailyReviewReminder"
  | "freeLimitReached"
  | "subscriptionActivated"
  | "weeklyReport"
  | "welcome";

type SendEmailOptions = {
  dedupeKey?: string;
  force?: boolean;
  kind: EmailKind;
  template: EmailTemplate;
  userId: string;
};

const preferenceByKind: Partial<Record<EmailKind, keyof NotificationSettings>> = {
  dailyReviewReminder: "dailyReviewReminder",
  weeklyReport: "weeklyReport"
};

export async function sendWelcomeEmail(userId: string) {
  const context = await loadUserEmailContext(userId);
  return sendUserEmail({
    dedupeKey: "welcome",
    kind: "welcome",
    template: welcomeEmailTemplate({ displayName: context.displayName }),
    userId
  });
}

export async function sendSubscriptionActivatedEmail(userId: string) {
  const context = await loadUserEmailContext(userId);
  return sendUserEmail({
    dedupeKey: "subscription-activated",
    kind: "subscriptionActivated",
    template: subscriptionActivatedEmailTemplate({ displayName: context.displayName }),
    userId
  });
}

export async function sendDailyReviewReminderEmail(userId: string) {
  const context = await loadUserEmailContext(userId);
  return sendUserEmail({
    dedupeKey: `daily-review-${new Date().toISOString().slice(0, 10)}`,
    kind: "dailyReviewReminder",
    template: dailyReviewReminderTemplate(context.displayName),
    userId
  });
}

export async function sendWeeklyReportEmail(userId: string, report?: WeeklyReport) {
  const context = await loadUserEmailContext(userId);
  const weeklyReport = report ?? buildWeeklyReport(await loadUserTrades(userId));
  return sendUserEmail({
    dedupeKey: `weekly-report-${weekKey(new Date())}`,
    kind: "weeklyReport",
    template: weeklyReportTemplate(weeklyReport, context.displayName),
    userId
  });
}

export async function sendFreeLimitReachedEmail(userId: string, reason: string) {
  const context = await loadUserEmailContext(userId);
  const limitKey = reason.toLowerCase().includes("daily") ? "daily" : "total";
  return sendUserEmail({
    dedupeKey: `free-limit-${limitKey}-${new Date().toISOString().slice(0, 10)}`,
    kind: "freeLimitReached",
    template: freeLimitReachedTemplate(reason, context.displayName),
    userId
  });
}

export async function sendAbandonedCheckoutReminderEmail(userId: string) {
  const context = await loadUserEmailContext(userId);
  return sendUserEmail({
    dedupeKey: `abandoned-checkout-${new Date().toISOString().slice(0, 10)}`,
    kind: "abandonedCheckout",
    template: abandonedCheckoutReminderTemplate(context.displayName),
    userId
  });
}

async function sendUserEmail({ dedupeKey, force = false, kind, template, userId }: SendEmailOptions) {
  const context = await loadUserEmailContext(userId);

  if (!context.email) {
    return { sent: false, skipped: "missing_email" as const };
  }

  if (!force && !canSendEmail(kind, context.profile?.notificationSettings)) {
    return { sent: false, skipped: "preferences_disabled" as const };
  }

  const emailLogRef = dedupeKey ? userEmailLogRef(userId, dedupeKey) : null;
  if (emailLogRef) {
    const existing = await emailLogRef.get();
    if (existing.exists) {
      return { sent: false, skipped: "already_sent" as const };
    }
  }

  const response = await getResendClient().emails.send({
    from: getEmailFromAddress(),
    html: template.html,
    subject: template.subject,
    text: template.text,
    to: context.email
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (emailLogRef) {
    await emailLogRef.set({
      emailId: response.data?.id ?? "",
      kind,
      sentAt: FieldValue.serverTimestamp(),
      subject: template.subject
    });
  }

  captureEmailEvent(userId, "email_sent", { email_kind: kind });
  captureEmailEvent(userId, emailEventName(kind), { email_kind: kind });

  return { emailId: response.data?.id ?? "", sent: true as const };
}

async function loadUserEmailContext(userId: string) {
  const [profileSnapshot, authUser] = await Promise.all([
    getAdminDb().collection("users").doc(userId).get(),
    getAdminAuth().getUser(userId).catch(() => null)
  ]);
  const profile = profileSnapshot.exists ? normalizeUserProfile(profileSnapshot.data() as DocumentData) : null;
  const email = profile?.email || authUser?.email || "";
  const displayName = profile?.fullName || authUser?.displayName || email.split("@")[0] || "Trader";

  return { displayName, email, profile };
}

function canSendEmail(kind: EmailKind, settings?: UserProfile["notificationSettings"]) {
  if (!settings?.emailNotificationsEnabled) {
    return kind === "subscriptionActivated";
  }

  const preferenceKey = preferenceByKind[kind];
  return preferenceKey ? Boolean(settings[preferenceKey]) : true;
}

function userEmailLogRef(userId: string, dedupeKey: string) {
  return getAdminDb().collection("users").doc(userId).collection("emailLog").doc(dedupeKey);
}

async function loadUserTrades(userId: string): Promise<Trade[]> {
  const snapshot = await getAdminDb().collection("users").doc(userId).collection("trades").get();
  return snapshot.docs.map((doc) => tradeFromData(doc.id, doc.data()));
}

function tradeFromData(id: string, data: DocumentData): Trade {
  const entryPrice = Number(data.entryPrice) || 0;
  const stopLoss = Number(data.stopLoss) || 0;
  const takeProfit = Number(data.takeProfit) || 0;

  return {
    createdAt: serializeTimestamp(data.createdAt),
    date: typeof data.date === "string" ? data.date : new Date().toISOString().slice(0, 10),
    emotion: data.emotion || "Calm",
    entryPrice,
    id,
    instrument: data.instrument || "XAUUSD",
    lotSize: Number(data.lotSize) || 0,
    notes: "",
    profitLoss: Number(data.profitLoss) || 0,
    result: data.result || "Open",
    riskAmount: Number(data.riskAmount) || 0,
    rr: Number(data.rr) || 0,
    ruleFollowed: Boolean(data.ruleFollowed),
    screenshotPath: "",
    screenshotUrl: "",
    session: data.session || "London",
    setupQuality: data.setupQuality || "A",
    stopLoss,
    strategy: data.strategy || "Manual entry",
    takeProfit,
    tradeType: data.tradeType || data.type || "Buy",
    type: data.tradeType || data.type || "Buy",
    updatedAt: serializeTimestamp(data.updatedAt)
  };
}

function serializeTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function emailEventName(kind: EmailKind) {
  if (kind === "freeLimitReached") return "free_limit_email_sent";
  if (kind === "weeklyReport") return "weekly_report_email_sent";
  if (kind === "welcome") return "welcome_email_sent";
  return `${kind}_email_sent`;
}

function captureEmailEvent(userId: string, event: string, properties: Record<string, string>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  try {
    getPostHogServerClient().capture({
      distinctId: userId,
      event,
      properties
    });
  } catch (error) {
    logError("PostHog email event capture failed", error);
  }
}

function weekKey(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = next.getDate() - day + (day === 0 ? -6 : 1);
  next.setDate(diff);
  return next.toISOString().slice(0, 10);
}
