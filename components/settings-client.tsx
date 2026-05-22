"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ElementType } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Crown,
  Database,
  Download,
  FileText,
  Globe2,
  MessageCircle,
  Moon,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { FeedbackForm } from "@/components/feedback-form";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { useSubscription } from "@/components/subscription-provider";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useUserTrades } from "@/hooks/use-user-trades";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { getUserFeedbackSubmissions, type Feedback, type FeedbackStatus, type FeedbackType } from "@/lib/feedback";
import { defaultLanguage, languageOptions, type AppLanguage } from "@/lib/languages";
import { riskSettingsStorageKey } from "@/lib/risk";
import { createUserProfile, updateUserProfile, type UserProfile, type UserProfileInput } from "@/lib/user-profile";
import { tradeStorageKey } from "@/lib/trades";

type SettingsForm = {
  fullName: string;
  email: string;
  experience: "Beginner" | "Intermediate" | "Advanced" | "Professional";
  mainMarket: "Forex" | "Crypto" | "Indices" | "Stocks" | "Commodities";
  startingBalance: string;
  accountCurrency: "USD" | "EUR" | "GBP";
  brokerName: string;
  propFirmName: string;
  accountType: "Personal" | "Prop Firm" | "Demo";
  maxTradesPerDay: string;
  maxRiskPerTrade: string;
  maxDailyLoss: string;
  maxWeeklyLoss: string;
  maxConsecutiveLosses: string;
  dailyProfitTarget: string;
  minimumSetupQuality: "A+" | "A" | "B" | "C";
  defaultSession: "Asia" | "London" | "New York";
  defaultInstrument: string;
  defaultStrategy: string;
  defaultRiskPercent: string;
  defaultLotSize: string;
  notifications: Record<NotificationKey, boolean>;
  appearance: "light" | "dark" | "system";
  preferredLanguage: AppLanguage;
};

type NotificationKey =
  | "dailyTradingReminder"
  | "dailyReviewReminder"
  | "weeklyReport"
  | "stopTradingWarnings"
  | "ruleViolationAlerts"
  | "emailNotificationsEnabled";

const expenseStorageKey = "tradecontrol-expenses";

const defaultSettings: SettingsForm = {
  fullName: "Mihun Trader",
  email: "trader@tradecontrol.app",
  experience: "Intermediate",
  mainMarket: "Forex",
  startingBalance: "10000",
  accountCurrency: "USD",
  brokerName: "TradeControl Markets",
  propFirmName: "",
  accountType: "Prop Firm",
  maxTradesPerDay: "3",
  maxRiskPerTrade: "1",
  maxDailyLoss: "3",
  maxWeeklyLoss: "6",
  maxConsecutiveLosses: "2",
  dailyProfitTarget: "2",
  minimumSetupQuality: "B",
  defaultSession: "London",
  defaultInstrument: "XAUUSD",
  defaultStrategy: "Break and Retest",
  defaultRiskPercent: "1",
  defaultLotSize: "",
  notifications: {
    dailyTradingReminder: true,
    dailyReviewReminder: true,
    weeklyReport: false,
    stopTradingWarnings: true,
    ruleViolationAlerts: true,
    emailNotificationsEnabled: true
  },
  appearance: "system",
  preferredLanguage: defaultLanguage
};

const inputClass =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

const selectClass =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

const instruments = ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30", "BTCUSD", "GBPJPY", "USOIL"];
const strategies = ["Break and Retest", "Liquidity Sweep", "Order Block", "Fair Value Gap", "Trend Continuation", "Opening Range"];

const russianLanguageOptionLabels: Record<AppLanguage, string> = {
  en: "Английский - Английский",
  ro: "Румынский - Румынский",
  ru: "Русский - Русский",
  es: "Испанский - Испанский",
  fr: "Французский - Французский",
  de: "Немецкий - Немецкий",
  it: "Итальянский - Итальянский",
  pt: "Португальский - Португальский"
};

const notificationLabels: { key: NotificationKey; label: string; detail: string }[] = [
  { key: "emailNotificationsEnabled", label: "Email notifications enabled", detail: "Master switch for transactional reminders and lifecycle emails." },
  { key: "dailyTradingReminder", label: "Daily trading reminder", detail: "Reserved for future pre-session email and in-app reminders." },
  { key: "stopTradingWarnings", label: "Stop trading warnings", detail: "Warn when limits are close or reached." },
  { key: "dailyReviewReminder", label: "Daily review reminder", detail: "Send review nudges only when email notifications are enabled." },
  { key: "weeklyReport", label: "Weekly report", detail: "Send a summarized weekly report without raw notes or full trade history." },
  { key: "ruleViolationAlerts", label: "Rule violation alerts", detail: "Highlight rule breaks without sharing sensitive journal notes." }
];

export function SettingsClient() {
  const { currentUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isProUser, openCustomerPortal, startCheckout, subscriptionStatus } = useSubscription();
  const { profile, loading, error: profileError, isUsingDefaults, refresh } = useUserProfile();
  const { trades } = useUserTrades();
  const [form, setForm] = useState<SettingsForm>(defaultSettings);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("tradecontrol-theme") as SettingsForm["appearance"] | null;

    if (profile) {
      setForm({ ...formFromProfile(profile), appearance: storedTheme ?? "system", preferredLanguage: profile.preferredLanguage ?? language });
      return;
    }

    setForm((current) => ({ ...current, appearance: storedTheme ?? "system", preferredLanguage: language }));
  }, [language, profile]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateNotification(key: NotificationKey, value: boolean) {
    setForm((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value }
    }));
  }

  function updateAppearance(appearance: SettingsForm["appearance"]) {
    update("appearance", appearance);
    applyTheme(appearance);
    setNotice(`${appearanceLabel(appearance)} theme applied.`);
  }

  function updateLanguage(languageCode: AppLanguage) {
    update("preferredLanguage", languageCode);
    setLanguage(languageCode);
    setNotice(t("settings.language.applied"));
  }

  async function saveSettings(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");

    if (!currentUser) {
      setError("You must be signed in to save settings.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = profileInputFromForm(form);
      if (isUsingDefaults) {
        await createUserProfile(currentUser.uid, payload);
      } else {
        await updateUserProfile(currentUser.uid, payload);
      }
      applyTheme(form.appearance);
      await refresh();
      setNotice("Settings saved to Firestore.");
    } catch (saveError) {
      trackApiFailure("settings_save", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function exportTradesCsv() {
    const headers = ["Date", "Instrument", "Type", "Session", "Result", "Profit/Loss", "Strategy", "Rules Followed", "Notes"];
    const rows = trades.map((trade) => [
      trade.date,
      trade.instrument,
      trade.type,
      trade.session,
      trade.result,
      String(trade.profitLoss),
      trade.strategy,
      formatRuleFollowed(trade.ruleFollowed),
      trade.notes
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tradecontrol-trades.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice(trades.length ? "CSV export prepared." : "CSV export prepared with headers only.");
  }

  function exportJournalPdf() {
    const popup = window.open("", "_blank", "width=980,height=720");

    if (!popup) {
      setError("Allow pop-ups to export the journal as PDF.");
      return;
    }

    popup.opener = null;
    popup.document.write(buildJournalPrintHtml(form.fullName, trades));
    popup.document.close();
    popup.focus();
    popup.print();
    setNotice("Printable journal opened. Choose Save as PDF in the print dialog.");
  }

  function clearMockData() {
    window.localStorage.removeItem(tradeStorageKey);
    window.localStorage.removeItem(expenseStorageKey);
    window.localStorage.removeItem(riskSettingsStorageKey);
    setIsClearConfirmOpen(false);
    setNotice("Local mock data cleared. Firestore records were not deleted.");
  }

  async function handleBillingAction() {
    setError("");
    setBillingLoading(true);
    try {
      if (isProUser) {
        trackEvent("manage_billing_clicked", { source: "settings_page" });
        await openCustomerPortal();
      } else {
        trackEvent("checkout_started", { source: "settings_page" });
        await startCheckout();
      }
    } catch (billingError) {
      trackApiFailure(isProUser ? "stripe_customer_portal" : "stripe_checkout", billingError, {
        source: "settings_page"
      });
      setError(billingError instanceof Error ? billingError.message : "Unable to open Stripe billing.");
      setBillingLoading(false);
    }
  }

  return (
    <div className="contents">
      {notice ? (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border border-profit/20 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-premium dark:bg-white dark:text-zinc-950">
          <CheckCircle2 className="h-4 w-4 text-profit" />
          {notice}
        </div>
      ) : null}
      {error || profileError ? (
        <div className="fixed right-4 top-20 z-50 rounded-2xl border border-loss/25 bg-loss px-4 py-3 text-sm font-semibold text-white shadow-premium">
          {error || profileError}
        </div>
      ) : null}
      {isClearConfirmOpen ? (
        <ConfirmClearModal
          onCancel={() => setIsClearConfirmOpen(false)}
          onConfirm={clearMockData}
        />
      ) : null}

      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Configure your trading control center.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
            Manage profile details, account defaults, risk rules, reminders, appearance, and app defaults from Firestore.
          </p>
          {isUsingDefaults ? (
            <p className="mt-3 w-fit rounded-full border border-amber-400/25 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200">
              Using safe defaults until you save your Firestore profile.
            </p>
          ) : null}
        </div>
        <button className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving || loading} type="button" onClick={() => void saveSettings()}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </section>

      {loading ? (
        <section className="rounded-[1.5rem] border border-line/60 bg-surface/60 p-4 text-sm font-semibold text-muted">
          Loading your Firestore profile settings...
        </section>
      ) : null}

      <Card eyebrow="Current Plan" title={isProUser ? "Pro plan active" : "Free plan"} icon={Crown}>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm leading-6 text-muted">
              {isProUser
                ? "Unlimited trades, full AI Coach, advanced analytics, screenshots, and full calendar insights are unlocked."
                : "Free includes 5 trades per day, 50 trades total, limited analytics, no screenshots, and 10 AI Coach messages per day."}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Stripe status: {subscriptionStatus}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Unlimited trades", "Advanced analytics", "Screenshot upload", "Full AI Coach"].map((feature) => (
                <span key={feature} className={`rounded-full px-3 py-1 text-xs font-bold ${isProUser ? "bg-profit/12 text-profit" : "bg-zinc-500/10 text-muted"}`}>
                  {feature}
                </span>
              ))}
            </div>
          </div>
          <button
            className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950"
            type="button"
            disabled={billingLoading}
            onClick={handleBillingAction}
          >
            <Sparkles className="h-4 w-4" />
            {billingLoading ? "Opening Stripe..." : isProUser ? "Manage Billing" : "Upgrade to Pro"}
          </button>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card eyebrow="Profile Settings" title="Trader identity" icon={UserRound}>
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-5 lg:w-44">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-zinc-950 text-2xl font-semibold text-white shadow-premium dark:bg-white dark:text-zinc-950">
                {initials(form.fullName)}
              </div>
              <p className="text-center text-xs font-semibold text-muted">Avatar placeholder</p>
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className={inputClass} value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
              </Field>
              <Field label="Trading experience level">
                <select className={selectClass} value={form.experience} onChange={(event) => update("experience", event.target.value as SettingsForm["experience"])}>
                  {["Beginner", "Intermediate", "Advanced", "Professional"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Main market">
                <select className={selectClass} value={form.mainMarket} onChange={(event) => update("mainMarket", event.target.value as SettingsForm["mainMarket"])}>
                  {["Forex", "Crypto", "Indices", "Stocks", "Commodities"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        <Card eyebrow="Account Settings" title="Capital and broker defaults" icon={WalletCards}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Starting balance">
              <input className={inputClass} inputMode="decimal" value={form.startingBalance} onChange={(event) => update("startingBalance", event.target.value)} />
            </Field>
            <Field label="Account currency">
              <select className={selectClass} value={form.accountCurrency} onChange={(event) => update("accountCurrency", event.target.value as SettingsForm["accountCurrency"])}>
                {["USD", "EUR", "GBP"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Broker name">
              <input className={inputClass} value={form.brokerName} onChange={(event) => update("brokerName", event.target.value)} />
            </Field>
            <Field label="Prop firm name optional">
              <input className={inputClass} placeholder="Optional" value={form.propFirmName} onChange={(event) => update("propFirmName", event.target.value)} />
            </Field>
            <Field label="Account type">
              <select className={selectClass} value={form.accountType} onChange={(event) => update("accountType", event.target.value as SettingsForm["accountType"])}>
                {["Personal", "Prop Firm", "Demo"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card eyebrow="Trading Plan Rules" title="Risk limits used across the app" icon={ShieldCheck}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Max trades per day">
              <input className={inputClass} inputMode="numeric" value={form.maxTradesPerDay} onChange={(event) => update("maxTradesPerDay", event.target.value)} />
            </Field>
            <Field label="Max risk per trade %">
              <input className={inputClass} inputMode="decimal" value={form.maxRiskPerTrade} onChange={(event) => update("maxRiskPerTrade", event.target.value)} />
            </Field>
            <Field label="Max daily loss %">
              <input className={inputClass} inputMode="decimal" value={form.maxDailyLoss} onChange={(event) => update("maxDailyLoss", event.target.value)} />
            </Field>
            <Field label="Max weekly loss %">
              <input className={inputClass} inputMode="decimal" value={form.maxWeeklyLoss} onChange={(event) => update("maxWeeklyLoss", event.target.value)} />
            </Field>
            <Field label="Max consecutive losses">
              <input className={inputClass} inputMode="numeric" value={form.maxConsecutiveLosses} onChange={(event) => update("maxConsecutiveLosses", event.target.value)} />
            </Field>
            <Field label="Daily profit target %">
              <input className={inputClass} inputMode="decimal" value={form.dailyProfitTarget} onChange={(event) => update("dailyProfitTarget", event.target.value)} />
            </Field>
            <Field label="Minimum setup quality allowed">
              <select className={selectClass} value={form.minimumSetupQuality} onChange={(event) => update("minimumSetupQuality", event.target.value as SettingsForm["minimumSetupQuality"])}>
                {["A+", "A", "B", "C"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card eyebrow="Default Trading Preferences" title="New trade presets" icon={SlidersHorizontal}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default session">
              <select className={selectClass} value={form.defaultSession} onChange={(event) => update("defaultSession", event.target.value as SettingsForm["defaultSession"])}>
                {["Asia", "London", "New York"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Default instrument">
              <select className={selectClass} value={form.defaultInstrument} onChange={(event) => update("defaultInstrument", event.target.value)}>
                {instruments.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Default strategy">
              <select className={selectClass} value={form.defaultStrategy} onChange={(event) => update("defaultStrategy", event.target.value)}>
                {strategies.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Default risk %">
              <input className={inputClass} inputMode="decimal" value={form.defaultRiskPercent} onChange={(event) => update("defaultRiskPercent", event.target.value)} />
            </Field>
            <Field label="Default lot size optional">
              <input className={inputClass} inputMode="decimal" placeholder="Optional" value={form.defaultLotSize} onChange={(event) => update("defaultLotSize", event.target.value)} />
            </Field>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card eyebrow="Email & Notification Settings" title="Trading discipline reminders" icon={Bell}>
          <div className="mb-4 rounded-2xl border border-profit/15 bg-profit/[0.06] p-4">
            <p className="text-sm font-semibold text-ink">Professional emails, controlled by you.</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              TradeControl sends concise onboarding, billing, retention, and discipline emails. Reports and reminders respect your email preferences and never include raw journal notes.
            </p>
          </div>
          <div className="grid gap-3">
            {notificationLabels.map((item) => (
              <ToggleRow
                key={item.key}
                checked={form.notifications[item.key]}
                detail={item.detail}
                label={item.label}
                onChange={(checked) => updateNotification(item.key, checked)}
              />
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card eyebrow="Appearance Settings" title="Theme preference" icon={Sun}>
            <div className="grid gap-3 sm:grid-cols-3">
              <ThemeChoice icon={Sun} label="Light" selected={form.appearance === "light"} onClick={() => updateAppearance("light")} />
              <ThemeChoice icon={Moon} label="Dark" selected={form.appearance === "dark"} onClick={() => updateAppearance("dark")} />
              <ThemeChoice icon={Settings} label="System" selected={form.appearance === "system"} onClick={() => updateAppearance("system")} />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">Saved appearance uses the same local theme key as the topbar toggle.</p>
          </Card>

          <Card eyebrow={t("settings.language.eyebrow")} title={t("settings.language.title")} icon={Globe2}>
            <p className="mb-4 text-sm leading-6 text-muted">{t("settings.language.description")}</p>
            <Field label={t("settings.language.field")}>
              <select className={selectClass} value={form.preferredLanguage} onChange={(event) => updateLanguage(event.target.value as AppLanguage)}>
                {languageOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {language === "ru" ? russianLanguageOptionLabels[item.code] : `${item.label} - ${item.nativeName}`}
                  </option>
                ))}
              </select>
            </Field>
            <p className="mt-4 text-sm leading-6 text-muted">{t("settings.language.note")}</p>
          </Card>

          <Card eyebrow="Data Settings" title="Exports and local placeholders" icon={Database}>
            <div className="grid gap-3 sm:grid-cols-3">
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5" type="button" onClick={exportTradesCsv}>
                <Download className="h-4 w-4" />
                Export trades as CSV
              </button>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5" type="button" onClick={exportJournalPdf}>
                <FileText className="h-4 w-4" />
                Export journal as PDF
              </button>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-loss/20 bg-loss/[0.08] px-4 text-sm font-semibold text-loss transition hover:-translate-y-0.5 hover:bg-loss/[0.14]" type="button" onClick={() => setIsClearConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Clear mock data
              </button>
            </div>
          </Card>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Save Settings</p>
          <h2 className="mt-1 text-xl font-semibold">Apply profile, rules, defaults, and appearance to Firestore.</h2>
        </div>
        <button className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving || loading} type="button" onClick={() => void saveSettings()}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </section>

      <FeedbackSettingsSection />
    </div>
  );
}

function FeedbackSettingsSection() {
  const { currentUser } = useAuth();
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    void loadFeedbackItems();
  }, [currentUser?.uid]);

  async function loadFeedbackItems() {
    if (!currentUser?.uid) {
      setFeedbackItems([]);
      return;
    }

    setLoadingFeedback(true);
    try {
      const submissions = await getUserFeedbackSubmissions(currentUser.uid);
      setFeedbackItems(submissions);
    } catch (feedbackError) {
      trackApiFailure("feedback_settings_list", feedbackError);
    } finally {
      setLoadingFeedback(false);
    }
  }

  return (
    <Card eyebrow="Feedback & Suggestions" title="Tell us what to improve" icon={MessageCircle}>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">
        Tell us what you love, what's broken, or what you wish TradeControl could do.
      </p>

      <FeedbackForm onSuccess={() => void loadFeedbackItems()} />

      <p className="mt-4 text-sm leading-6 text-muted">
        Your feedback is private and goes directly to the TradeControl team.
      </p>

      <div className="mt-6 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">Recent feedback</h3>
          {loadingFeedback ? <span className="text-xs font-semibold text-muted">Loading...</span> : null}
        </div>

        {feedbackItems.length ? (
          <div className="grid gap-2">
            {feedbackItems.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <FeedbackTypeBadge type={item.type} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{truncateFeedbackMessage(item.message)}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{formatFeedbackDate(item.createdAt)}</p>
                </div>
                <FeedbackStatusBadge status={item.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4 text-sm font-semibold text-muted">
            No feedback submitted yet.
          </div>
        )}
      </div>
    </Card>
  );
}

function FeedbackTypeBadge({ type }: { type: FeedbackType }) {
  const styles: Record<FeedbackType, string> = {
    bug: "border-loss/20 bg-loss/10 text-loss",
    feature_request: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    general: "border-zinc-500/20 bg-zinc-500/10 text-muted",
    complaint: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    praise: "border-profit/20 bg-profit/10 text-profit"
  };

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${styles[type]}`}>
      {feedbackTypeLabel(type)}
    </span>
  );
}

function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const styles: Record<FeedbackStatus, string> = {
    new: "border-profit/20 bg-profit/10 text-profit",
    reviewed: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    in_progress: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    done: "border-zinc-500/20 bg-zinc-500/10 text-muted"
  };

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold sm:justify-self-end ${styles[status]}`}>
      {feedbackStatusLabel(status)}
    </span>
  );
}

function feedbackTypeLabel(type: FeedbackType) {
  const labels: Record<FeedbackType, string> = {
    bug: "Bug",
    feature_request: "Feature Request",
    general: "General",
    complaint: "Complaint",
    praise: "Praise"
  };

  return labels[type];
}

function feedbackStatusLabel(status: FeedbackStatus) {
  const labels: Record<FeedbackStatus, string> = {
    new: "New",
    reviewed: "Reviewed",
    in_progress: "In Progress",
    done: "Done"
  };

  return labels[status];
}

function truncateFeedbackMessage(message: string) {
  return message.length > 60 ? `${message.slice(0, 60)}...` : message;
}

function formatFeedbackDate(createdAt?: string) {
  if (!createdAt) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(createdAt));
}

function ConfirmClearModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="clear-data-title">
      <div className="w-full max-w-md rounded-[2rem] border border-white/[0.55] bg-white p-5 text-ink shadow-premium dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-loss/10 text-loss">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="clear-data-title" className="text-lg font-semibold">Clear local mock data?</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                This removes only old local placeholder data from this browser. It will not delete your Firestore trades, expenses, profile, Stripe billing, or account.
              </p>
            </div>
          </div>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/70 bg-surface/70 text-muted transition hover:text-ink" type="button" onClick={onCancel} aria-label="Close clear data confirmation">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="h-11 rounded-2xl border border-line/70 bg-surface/70 text-sm font-semibold text-ink" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-loss px-4 text-sm font-semibold text-white shadow-premium" type="button" onClick={onConfirm}>
            <Trash2 className="h-4 w-4" />
            Clear Local Data
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ children, eyebrow, icon: Icon, title }: { children: React.ReactNode; eyebrow: string; icon: ElementType; title: string }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted">{eyebrow}</p>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      {children}
    </label>
  );
}

function ToggleRow({ checked, detail, label, onChange }: { checked: boolean; detail: string; label: string; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
      <div>
        <p className="font-semibold text-ink">{label}</p>
        <p className="mt-1 text-sm leading-5 text-muted">{detail}</p>
      </div>
      <button
        aria-pressed={checked}
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${checked ? "bg-profit" : "bg-zinc-300 dark:bg-white/15"}`}
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow-soft transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function ThemeChoice({ icon: Icon, label, onClick, selected }: { icon: ElementType; label: string; onClick: () => void; selected: boolean }) {
  return (
    <button
      className={`flex h-20 flex-col items-center justify-center gap-2 rounded-[1.25rem] border text-sm font-bold transition ${
        selected
          ? "border-zinc-950 bg-zinc-950 text-white shadow-premium dark:border-white dark:bg-white dark:text-zinc-950"
          : "border-line/70 bg-surface/70 text-muted hover:text-ink"
      }`}
      type="button"
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function applyTheme(theme: SettingsForm["appearance"]) {
  window.localStorage.setItem("tradecontrol-theme", theme);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", shouldUseDark);
}

function appearanceLabel(theme: SettingsForm["appearance"]) {
  if (theme === "light") return "Light";
  if (theme === "dark") return "Dark";
  return "System";
}

function formFromProfile(profile: UserProfile): SettingsForm {
  return {
    fullName: profile.fullName,
    email: profile.email,
    experience: profile.tradingExperience,
    mainMarket: profile.mainMarket,
    startingBalance: String(profile.startingBalance),
    accountCurrency: profile.accountCurrency,
    brokerName: profile.brokerName,
    propFirmName: profile.propFirmName,
    accountType: profile.accountType,
    maxTradesPerDay: String(profile.maxTradesPerDay),
    maxRiskPerTrade: String(profile.maxRiskPerTrade),
    maxDailyLoss: String(profile.maxDailyLoss),
    maxWeeklyLoss: String(profile.maxWeeklyLoss),
    maxConsecutiveLosses: String(profile.maxConsecutiveLosses),
    dailyProfitTarget: String(profile.dailyProfitTarget),
    minimumSetupQuality: profile.minimumSetupQuality,
    defaultSession: profile.defaultSession,
    defaultInstrument: profile.defaultInstrument,
    defaultStrategy: profile.defaultStrategy,
    defaultRiskPercent: String(profile.defaultRisk),
    defaultLotSize: profile.defaultLotSize ? String(profile.defaultLotSize) : "",
    notifications: profile.notificationSettings,
    appearance: "system",
    preferredLanguage: profile.preferredLanguage
  };
}

function profileInputFromForm(form: SettingsForm): UserProfileInput {
  return {
    fullName: form.fullName,
    email: form.email,
    onboardingCompleted: true,
    tradingExperience: form.experience,
    mainMarket: form.mainMarket,
    startingBalance: safeNumber(form.startingBalance, 10000),
    accountCurrency: form.accountCurrency,
    brokerName: form.brokerName,
    propFirmName: form.propFirmName,
    accountType: form.accountType,
    maxTradesPerDay: safeNumber(form.maxTradesPerDay, 3),
    maxRiskPerTrade: safeNumber(form.maxRiskPerTrade, 1),
    maxDailyLoss: safeNumber(form.maxDailyLoss, 3),
    maxWeeklyLoss: safeNumber(form.maxWeeklyLoss, 6),
    maxConsecutiveLosses: safeNumber(form.maxConsecutiveLosses, 2),
    dailyProfitTarget: safeNumber(form.dailyProfitTarget, 2),
    minimumSetupQuality: form.minimumSetupQuality,
    defaultSession: form.defaultSession,
    defaultInstrument: form.defaultInstrument,
    defaultStrategy: form.defaultStrategy,
    defaultRisk: safeNumber(form.defaultRiskPercent, 1),
    defaultLotSize: form.defaultLotSize ? safeNumber(form.defaultLotSize, 0) : null,
    defaultEmotion: "Calm",
    notifications: form.notifications,
    notificationSettings: form.notifications,
    preferredLanguage: form.preferredLanguage
  };
}

function safeNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TC";
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function buildJournalPrintHtml(displayName: string, trades: ReturnType<typeof useUserTrades>["trades"]) {
  const generatedAt = new Date().toLocaleString();
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const rows = trades.length
    ? trades.map((trade) => `
      <tr>
        <td>${escapeHtml(trade.date)}</td>
        <td>${escapeHtml(trade.instrument)}</td>
        <td>${escapeHtml(trade.type)}</td>
        <td>${escapeHtml(trade.session)}</td>
        <td>${escapeHtml(trade.result)}</td>
        <td class="${trade.profitLoss >= 0 ? "profit" : "loss"}">${escapeHtml(String(trade.profitLoss))}</td>
        <td>${escapeHtml(`${trade.rr}:1`)}</td>
        <td>${formatRuleFollowed(trade.ruleFollowed)}</td>
        <td>${escapeHtml(trade.strategy)}</td>
        <td>${escapeHtml(trade.notes || "")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="10" class="empty">No trades available yet.</td></tr>`;

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>TradeControl Journal Export</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 40px; color: #111827; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; }
          header { margin-bottom: 28px; border-bottom: 1px solid #d9e0ea; padding-bottom: 20px; }
          h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
          p { margin: 6px 0 0; color: #64748b; font-size: 13px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
          .card { border: 1px solid #d9e0ea; border-radius: 18px; background: white; padding: 16px; }
          .label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          .value { margin-top: 6px; font-size: 20px; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 16px; background: white; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; vertical-align: top; font-size: 11px; }
          th { background: #111827; color: white; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
          .profit { color: #15803d; font-weight: 800; }
          .loss { color: #dc2626; font-weight: 800; }
          .empty { padding: 28px; text-align: center; color: #64748b; }
          @media print {
            body { background: white; padding: 24px; }
            .card, table { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>TradeControl Journal Export</h1>
          <p>Trader: ${escapeHtml(displayName || "TradeControl Trader")} · Generated: ${escapeHtml(generatedAt)}</p>
          <p>TradeControl is a journaling and discipline tool, not financial advice.</p>
        </header>
        <section class="summary">
          <div class="card"><div class="label">Trades</div><div class="value">${trades.length}</div></div>
          <div class="card"><div class="label">Net P/L</div><div class="value ${totalProfit >= 0 ? "profit" : "loss"}">${escapeHtml(String(totalProfit))}</div></div>
          <div class="card"><div class="label">Rules Followed</div><div class="value">${trades.length ? Math.round((trades.filter((trade) => trade.ruleFollowed).length / trades.length) * 100) : 0}%</div></div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Instrument</th>
              <th>Side</th>
              <th>Session</th>
              <th>Result</th>
              <th>P/L</th>
              <th>R:R</th>
              <th>Rules</th>
              <th>Strategy</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRuleFollowed(value: boolean | null) {
  return value === true ? "Yes" : value === false ? "No" : "Unknown";
}
