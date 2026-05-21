import { doc, getDoc, serverTimestamp, setDoc, type DocumentData, type FieldValue } from "firebase/firestore";
import { requireFirestoreDb } from "@/lib/firebase";
import type { Emotion, SetupQuality, TradeSession } from "@/lib/trades";

export type NotificationSettings = {
  dailyTradingReminder: boolean;
  dailyReviewReminder: boolean;
  weeklyReport: boolean;
  stopTradingWarnings: boolean;
  ruleViolationAlerts: boolean;
  emailNotificationsEnabled: boolean;
};

export type TradingRules = {
  maxTradesPerDay: number;
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxWeeklyLoss: number;
  maxConsecutiveLosses: number;
  dailyProfitTarget: number;
  minimumSetupQuality: SetupQuality;
};

export type AccountSettings = {
  startingBalance: number;
  accountCurrency: "USD" | "EUR" | "GBP";
  brokerName: string;
  propFirmName: string;
  accountType: "Personal" | "Prop Firm" | "Demo";
};

export type UserProfile = AccountSettings &
  TradingRules & {
    currentPeriodEnd?: string;
    fullName: string;
    email: string;
    isProUser: boolean;
    onboardingCompleted: boolean;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionPlan: "free" | "pro";
    subscriptionStatus: string;
    tradingExperience: "Beginner" | "Intermediate" | "Advanced" | "Professional";
    mainMarket: "Forex" | "Crypto" | "Indices" | "Stocks" | "Commodities";
    defaultSession: TradeSession;
    defaultInstrument: string;
    defaultStrategy: string;
    defaultRisk: number;
    defaultLotSize: number | null;
    defaultEmotion: Emotion;
    notifications: NotificationSettings;
    notificationSettings: NotificationSettings;
    createdAt?: string;
    updatedAt?: string;
  };

export type UserProfileInput = Omit<
  UserProfile,
  | "createdAt"
  | "currentPeriodEnd"
  | "isProUser"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
  | "subscriptionPlan"
  | "subscriptionStatus"
  | "updatedAt"
>;

const defaultSubscriptionFields = {
  currentPeriodEnd: undefined,
  isProUser: false,
  onboardingCompleted: false,
  stripeCustomerId: "",
  stripeSubscriptionId: "",
  subscriptionPlan: "free" as const,
  subscriptionStatus: "free"
};

const protectedSubscriptionFieldNames = [
  "currentPeriodEnd",
  "isProUser",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "subscriptionPlan",
  "subscriptionStatus"
] as const;

const defaultNotifications: NotificationSettings = {
  dailyTradingReminder: true,
  dailyReviewReminder: true,
  weeklyReport: false,
  stopTradingWarnings: true,
  ruleViolationAlerts: true,
  emailNotificationsEnabled: true
};

export const defaultUserProfile: UserProfileInput = {
  fullName: "TradeControl Trader",
  email: "",
  onboardingCompleted: false,
  tradingExperience: "Beginner",
  mainMarket: "Forex",
  startingBalance: 10000,
  accountCurrency: "USD",
  brokerName: "",
  propFirmName: "",
  accountType: "Personal",
  maxTradesPerDay: 3,
  maxRiskPerTrade: 1,
  maxDailyLoss: 3,
  maxWeeklyLoss: 6,
  maxConsecutiveLosses: 2,
  dailyProfitTarget: 2,
  minimumSetupQuality: "B",
  defaultSession: "London",
  defaultInstrument: "XAUUSD",
  defaultStrategy: "Break and Retest",
  defaultRisk: 1,
  defaultLotSize: null,
  defaultEmotion: "Calm",
  notifications: defaultNotifications,
  notificationSettings: defaultNotifications
};

function userDoc(userId: string) {
  if (!userId) {
    throw new Error("You must be signed in to access profile settings.");
  }

  return doc(requireFirestoreDb(), "users", userId);
}

function serializeTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function numberOrDefault(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringOrDefault<T extends string>(value: unknown, fallback: T) {
  return typeof value === "string" && value ? (value as T) : fallback;
}

function nullableNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeUserProfile(data: DocumentData): UserProfile {
  const notificationSettings = normalizeNotificationSettings(data.notificationSettings ?? data.notifications);

  return {
    ...defaultUserProfile,
    currentPeriodEnd: serializeTimestamp(data.currentPeriodEnd),
    fullName: stringOrDefault(data.fullName, defaultUserProfile.fullName),
    email: stringOrDefault(data.email, defaultUserProfile.email),
    isProUser: Boolean(data.isProUser),
    onboardingCompleted: booleanOrDefault(data.onboardingCompleted, defaultSubscriptionFields.onboardingCompleted),
    stripeCustomerId: stringOrDefault(data.stripeCustomerId, defaultSubscriptionFields.stripeCustomerId),
    stripeSubscriptionId: stringOrDefault(data.stripeSubscriptionId, defaultSubscriptionFields.stripeSubscriptionId),
    subscriptionPlan: stringOrDefault(data.subscriptionPlan, defaultSubscriptionFields.subscriptionPlan),
    subscriptionStatus: stringOrDefault(data.subscriptionStatus, defaultSubscriptionFields.subscriptionStatus),
    tradingExperience: stringOrDefault(data.tradingExperience, defaultUserProfile.tradingExperience),
    mainMarket: stringOrDefault(data.mainMarket, defaultUserProfile.mainMarket),
    startingBalance: numberOrDefault(data.startingBalance, defaultUserProfile.startingBalance),
    accountCurrency: stringOrDefault(data.accountCurrency, defaultUserProfile.accountCurrency),
    brokerName: stringOrDefault(data.brokerName, defaultUserProfile.brokerName),
    propFirmName: stringOrDefault(data.propFirmName, defaultUserProfile.propFirmName),
    accountType: stringOrDefault(data.accountType, defaultUserProfile.accountType),
    maxTradesPerDay: numberOrDefault(data.maxTradesPerDay, defaultUserProfile.maxTradesPerDay),
    maxRiskPerTrade: numberOrDefault(data.maxRiskPerTrade, defaultUserProfile.maxRiskPerTrade),
    maxDailyLoss: numberOrDefault(data.maxDailyLoss, defaultUserProfile.maxDailyLoss),
    maxWeeklyLoss: numberOrDefault(data.maxWeeklyLoss, defaultUserProfile.maxWeeklyLoss),
    maxConsecutiveLosses: numberOrDefault(data.maxConsecutiveLosses, defaultUserProfile.maxConsecutiveLosses),
    dailyProfitTarget: numberOrDefault(data.dailyProfitTarget, defaultUserProfile.dailyProfitTarget),
    minimumSetupQuality: stringOrDefault(data.minimumSetupQuality, defaultUserProfile.minimumSetupQuality),
    defaultSession: stringOrDefault(data.defaultSession, defaultUserProfile.defaultSession),
    defaultInstrument: stringOrDefault(data.defaultInstrument, defaultUserProfile.defaultInstrument),
    defaultStrategy: stringOrDefault(data.defaultStrategy, defaultUserProfile.defaultStrategy),
    defaultRisk: numberOrDefault(data.defaultRisk, defaultUserProfile.defaultRisk),
    defaultLotSize: nullableNumber(data.defaultLotSize),
    defaultEmotion: stringOrDefault(data.defaultEmotion, defaultUserProfile.defaultEmotion),
    notifications: notificationSettings,
    notificationSettings,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt)
  };
}

export function profileDefaultsForUser(input: {
  fullName?: string | null;
  email?: string | null;
  accountType?: string | null;
  tradingExperience?: string | null;
}): UserProfile {
  return {
    ...defaultUserProfile,
    ...defaultSubscriptionFields,
    fullName: input.fullName || input.email?.split("@")[0] || defaultUserProfile.fullName,
    email: input.email || "",
    accountType: stringOrDefault(input.accountType, defaultUserProfile.accountType),
    tradingExperience: stringOrDefault(input.tradingExperience, defaultUserProfile.tradingExperience),
    notifications: { ...defaultNotifications },
    notificationSettings: { ...defaultNotifications }
  };
}

export async function getUserProfile(userId: string) {
  const snapshot = await getDoc(userDoc(userId));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeUserProfile(snapshot.data());
}

export async function createUserProfile(userId: string, profileData: Partial<UserProfileInput>) {
  const safeProfileData = stripProtectedSubscriptionFields(profileData);
  const payload: UserProfileInput & { createdAt: FieldValue; updatedAt: FieldValue } = {
    ...defaultUserProfile,
    ...safeProfileData,
    notifications: {
      ...defaultNotifications,
      ...(safeProfileData.notificationSettings ?? safeProfileData.notifications)
    },
    notificationSettings: {
      ...defaultNotifications,
      ...(safeProfileData.notificationSettings ?? safeProfileData.notifications)
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(userDoc(userId), payload);
}

export async function updateUserProfile(userId: string, profileData: Partial<UserProfileInput>) {
  const safeProfileData = stripProtectedSubscriptionFields(profileData);
  const payload: Partial<UserProfileInput> & { updatedAt: FieldValue } = {
    ...safeProfileData,
    updatedAt: serverTimestamp()
  };

  if (safeProfileData.notificationSettings ?? safeProfileData.notifications) {
    const notificationSettings = {
      ...defaultNotifications,
      ...(safeProfileData.notificationSettings ?? safeProfileData.notifications)
    };
    payload.notifications = notificationSettings;
    payload.notificationSettings = notificationSettings;
  }

  await setDoc(
    userDoc(userId),
    payload,
    { merge: true }
  );
}

function stripProtectedSubscriptionFields(profileData: Partial<UserProfileInput>) {
  const safeData = { ...profileData } as Record<string, unknown>;

  for (const fieldName of protectedSubscriptionFieldNames) {
    delete safeData[fieldName];
  }

  return safeData as Partial<UserProfileInput>;
}

function normalizeNotificationSettings(value: unknown): NotificationSettings {
  const data = typeof value === "object" && value ? value as Record<string, unknown> : {};

  return {
    dailyTradingReminder: booleanOrDefault(data.dailyTradingReminder, defaultNotifications.dailyTradingReminder),
    dailyReviewReminder: booleanOrDefault(data.dailyReviewReminder, defaultNotifications.dailyReviewReminder),
    weeklyReport: booleanOrDefault(
      data.weeklyReport ?? data.weeklyPerformanceReport,
      defaultNotifications.weeklyReport
    ),
    stopTradingWarnings: booleanOrDefault(
      data.stopTradingWarnings ?? data.stopTradingWarning,
      defaultNotifications.stopTradingWarnings
    ),
    ruleViolationAlerts: booleanOrDefault(data.ruleViolationAlerts, defaultNotifications.ruleViolationAlerts),
    emailNotificationsEnabled: booleanOrDefault(
      data.emailNotificationsEnabled,
      defaultNotifications.emailNotificationsEnabled
    )
  };
}
