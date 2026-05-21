"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Flag, LineChart, Shield, Sparkles, UserCircle2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import { useUserProfile } from "@/components/user-profile-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { hasCompletedOnboardingForSession, markOnboardingCompletedForSession } from "@/lib/onboarding-state";
import { defaultUserProfile, updateUserProfile, type UserProfileInput } from "@/lib/user-profile";

const steps = [
  { key: "welcome", label: "Welcome", icon: Sparkles },
  { key: "profile", label: "Trading profile", icon: UserCircle2 },
  { key: "account", label: "Account setup", icon: Wallet },
  { key: "risk", label: "Risk rules", icon: Shield },
  { key: "defaults", label: "Defaults", icon: Flag },
  { key: "finish", label: "Finish", icon: CheckCircle2 }
] as const;

type WizardForm = Pick<
  UserProfileInput,
  | "tradingExperience"
  | "mainMarket"
  | "accountType"
  | "startingBalance"
  | "accountCurrency"
  | "brokerName"
  | "propFirmName"
  | "maxTradesPerDay"
  | "maxRiskPerTrade"
  | "maxDailyLoss"
  | "maxConsecutiveLosses"
  | "dailyProfitTarget"
  | "defaultSession"
  | "defaultInstrument"
  | "defaultStrategy"
  | "defaultRisk"
> & {
  defaultLotSize: string;
};

function toFormState(profile?: Partial<UserProfileInput> | null): WizardForm {
  return {
    tradingExperience: profile?.tradingExperience ?? defaultUserProfile.tradingExperience,
    mainMarket: profile?.mainMarket ?? defaultUserProfile.mainMarket,
    accountType: profile?.accountType ?? defaultUserProfile.accountType,
    startingBalance: profile?.startingBalance ?? defaultUserProfile.startingBalance,
    accountCurrency: profile?.accountCurrency ?? defaultUserProfile.accountCurrency,
    brokerName: profile?.brokerName ?? defaultUserProfile.brokerName,
    propFirmName: profile?.propFirmName ?? defaultUserProfile.propFirmName,
    maxTradesPerDay: profile?.maxTradesPerDay ?? defaultUserProfile.maxTradesPerDay,
    maxRiskPerTrade: profile?.maxRiskPerTrade ?? defaultUserProfile.maxRiskPerTrade,
    maxDailyLoss: profile?.maxDailyLoss ?? defaultUserProfile.maxDailyLoss,
    maxConsecutiveLosses: profile?.maxConsecutiveLosses ?? defaultUserProfile.maxConsecutiveLosses,
    dailyProfitTarget: profile?.dailyProfitTarget ?? defaultUserProfile.dailyProfitTarget,
    defaultSession: profile?.defaultSession ?? defaultUserProfile.defaultSession,
    defaultInstrument: profile?.defaultInstrument ?? defaultUserProfile.defaultInstrument,
    defaultStrategy: profile?.defaultStrategy ?? defaultUserProfile.defaultStrategy,
    defaultRisk: profile?.defaultRisk ?? defaultUserProfile.defaultRisk,
    defaultLotSize: profile?.defaultLotSize ? String(profile.defaultLotSize) : ""
  };
}

export function OnboardingClient() {
  const { currentUser, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useUserProfile();
  const { isProUser, plan } = useSubscription();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(() => toFormState(defaultUserProfile));
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace("/login?redirect=%2Fonboarding");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (!authLoading && !profileLoading && (profile?.onboardingCompleted || hasCompletedOnboardingForSession())) {
      router.replace("/dashboard");
    }
  }, [authLoading, profile?.onboardingCompleted, profileLoading, router]);

  useEffect(() => {
    if (!profileLoading && !hasInitialized) {
      setForm(toFormState(profile ?? defaultUserProfile));
      setHasInitialized(true);
    }
  }, [hasInitialized, profile, profileLoading]);

  const progress = ((step + 1) / steps.length) * 100;

  const summaryItems = useMemo(
    () => [
      { label: "Experience level", value: form.tradingExperience },
      { label: "Main market", value: form.mainMarket },
      { label: "Account type", value: form.accountType },
      { label: "Starting balance", value: `${form.accountCurrency} ${Number(form.startingBalance).toLocaleString()}` },
      { label: "Broker", value: form.brokerName || "Not specified" },
      { label: "Max trades/day", value: String(form.maxTradesPerDay) },
      { label: "Max risk/trade", value: `${form.maxRiskPerTrade}%` },
      { label: "Max daily loss", value: `${form.maxDailyLoss}%` },
      { label: "Max consecutive losses", value: String(form.maxConsecutiveLosses) },
      { label: "Daily profit target", value: `${form.dailyProfitTarget}%` },
      { label: "Default session", value: form.defaultSession },
      { label: "Default instrument", value: form.defaultInstrument },
      { label: "Default strategy", value: form.defaultStrategy },
      { label: "Default risk", value: `${form.defaultRisk}%` },
      { label: "Default lot size", value: form.defaultLotSize || "Not preset" }
    ],
    [form]
  );

  function updateField<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateCurrentStep() {
    switch (steps[step].key) {
      case "profile":
        if (!form.tradingExperience || !form.mainMarket || !form.accountType) {
          return "Please complete your trading profile before continuing.";
        }
        return "";
      case "account":
        if (!Number.isFinite(Number(form.startingBalance)) || Number(form.startingBalance) <= 0) {
          return "Starting balance must be greater than 0.";
        }
        if (!form.accountCurrency || !form.brokerName.trim()) {
          return "Account currency and broker name are required.";
        }
        return "";
      case "risk":
        if (
          Number(form.maxTradesPerDay) <= 0 ||
          Number(form.maxRiskPerTrade) <= 0 ||
          Number(form.maxDailyLoss) <= 0 ||
          Number(form.maxConsecutiveLosses) <= 0 ||
          Number(form.dailyProfitTarget) <= 0
        ) {
          return "Risk limits must be greater than 0.";
        }
        return "";
      case "defaults":
        if (!form.defaultSession || !form.defaultInstrument.trim() || !form.defaultStrategy.trim() || Number(form.defaultRisk) <= 0) {
          return "Set your default session, instrument, strategy, and risk before finishing.";
        }
        return "";
      default:
        return "";
    }
  }

  function nextStep() {
    const nextError = validateCurrentStep();
    setError(nextError);

    if (nextError) {
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function finishOnboarding() {
    if (!currentUser) {
      setError("You must be signed in to complete onboarding.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await updateUserProfile(currentUser.uid, {
        onboardingCompleted: true,
        tradingExperience: form.tradingExperience,
        mainMarket: form.mainMarket,
        accountType: form.accountType,
        startingBalance: Number(form.startingBalance),
        accountCurrency: form.accountCurrency,
        brokerName: form.brokerName.trim(),
        propFirmName: form.propFirmName.trim(),
        maxTradesPerDay: Number(form.maxTradesPerDay),
        maxRiskPerTrade: Number(form.maxRiskPerTrade),
        maxDailyLoss: Number(form.maxDailyLoss),
        maxConsecutiveLosses: Number(form.maxConsecutiveLosses),
        dailyProfitTarget: Number(form.dailyProfitTarget),
        defaultSession: form.defaultSession,
        defaultInstrument: form.defaultInstrument.trim(),
        defaultStrategy: form.defaultStrategy.trim(),
        defaultRisk: Number(form.defaultRisk),
        defaultLotSize: form.defaultLotSize ? Number(form.defaultLotSize) : null
      });

      trackEvent("onboarding_completed", {
        account_type: form.accountType,
        main_market: form.mainMarket,
        plan_type: plan,
        trading_experience: form.tradingExperience
      });
      void sendWelcomeEmail(currentUser);
      markOnboardingCompletedForSession();
      await refresh();
      router.replace("/dashboard");
    } catch (saveError) {
      trackApiFailure("onboarding_completed", saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save onboarding.");
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || profileLoading || !hasInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_26%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_28%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] px-5 py-4 text-sm font-semibold text-ink shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <LineChart className="h-4 w-4" />
          </div>
          Loading your setup wizard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_26%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_28%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-6 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] lg:w-[360px] xl:w-[390px]">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-premium">
                  <LineChart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold">TradeControl</p>
                  <p className="text-xs font-medium text-white/[0.55]">Journal and risk desk</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div className="mt-10">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-profit">First setup</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal">Build your control room before the first trade.</h1>
              <p className="mt-4 text-sm leading-6 text-white/[0.62]">
                We will set your profile, risk limits, and default trade preferences so the dashboard feels personal from day one.
              </p>
            </div>

            <div className="mt-8">
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-profit transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid gap-3">
                {steps.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = index === step;
                  const isComplete = index < step;
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm font-semibold ${
                        isActive
                          ? "border-profit/35 bg-profit/10 text-white"
                          : isComplete
                            ? "border-white/10 bg-white/[0.08] text-white/88"
                            : "border-white/10 bg-white/[0.04] text-white/[0.5]"
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isActive || isComplete ? "bg-white text-zinc-950" : "bg-white/8 text-white/[0.55]"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p>{item.label}</p>
                        <p className="text-xs font-medium text-white/[0.55]">Step {index + 1} of {steps.length}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[1.4rem] border border-white/10 bg-white/[0.075] p-4 text-sm leading-6 text-white/[0.66]">
            Stripe access, subscription fields, and existing user metadata stay untouched while we save your onboarding preferences.
          </div>
        </section>

        <section className="flex-1 rounded-[2rem] border border-white/[0.55] bg-white/[0.78] p-5 shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-muted">{steps[step].label}</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-normal text-ink">
                {step === 0 && "Welcome to TradeControl"}
                {step === 1 && "Set your trading profile"}
                {step === 2 && "Define the account you trade with"}
                {step === 3 && "Lock in your risk guardrails"}
                {step === 4 && "Choose your default workflow"}
                {step === 5 && "Review your setup before launch"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                {step === 0 && "TradeControl is designed to keep your journaling, risk management, and discipline process in one calm workspace. This quick setup makes the dashboard useful from the moment you land there."}
                {step === 1 && "These details personalize analytics, coach prompts, and default assumptions across the app."}
                {step === 2 && "We use this information for balance-aware risk warnings, cleaner reporting, and account-level context."}
                {step === 3 && "These rules flow into your risk manager, trade entry warnings, and discipline analytics."}
                {step === 4 && "Preload your common session, instrument, strategy, and risk defaults so logging trades stays fast."}
                {step === 5 && "Take one last look, then we will save everything to your Firestore user profile and open the dashboard."}
              </p>
            </div>
            <span className="rounded-full border border-line/60 bg-surface/[0.55] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {Math.round(progress)}% ready
            </span>
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.5rem] border border-loss/20 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">
              {error}
            </div>
          ) : null}

          <div className="mt-8">
            {step === 0 ? <WelcomeStep /> : null}
            {step === 1 ? <TradingProfileStep form={form} onChange={updateField} /> : null}
            {step === 2 ? <AccountSetupStep form={form} onChange={updateField} /> : null}
            {step === 3 ? <RiskRulesStep form={form} onChange={updateField} /> : null}
            {step === 4 ? <DefaultPreferencesStep form={form} onChange={updateField} /> : null}
            {step === 5 ? <FinishStep isProUser={isProUser} plan={plan} summaryItems={summaryItems} /> : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-5 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={step === 0 || isSaving}
              type="button"
              onClick={previousStep}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {step < steps.length - 1 ? (
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
                type="button"
                onClick={nextStep}
              >
                {step === 0 ? "Start setup" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                disabled={isSaving}
                type="button"
                onClick={finishOnboarding}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? "Saving setup..." : "Go to Dashboard"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

async function sendWelcomeEmail(user: { getIdToken: () => Promise<string> }) {
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/email/welcome", {
      headers: { authorization: `Bearer ${token}` },
      method: "POST"
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || "Welcome email trigger failed.");
    }
  } catch (error) {
    trackApiFailure("welcome_email", error);
  }
}

function WelcomeStep() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[1.75rem] border border-white/[0.55] bg-zinc-950 p-6 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06]">
        <h3 className="text-xl font-semibold">A tighter workflow for disciplined traders.</h3>
        <p className="mt-3 text-sm leading-6 text-white/[0.65]">
          TradeControl blends journaling, risk management, daily review, and coaching into one premium workspace. This setup tunes the platform to your market, risk profile, and routine before you start logging trades.
        </p>
      </div>
      <div className="grid gap-4">
        {[
          "Personalized risk warnings tied to your balance and limits.",
          "Trade forms prefilled with your preferred session, instrument, and strategy.",
          "Cleaner analytics, review prompts, and coach insights from day one."
        ].map((item) => (
          <div key={item} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <p className="text-sm font-semibold text-ink">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradingProfileStep({
  form,
  onChange
}: {
  form: WizardForm;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SelectField label="Experience level" value={form.tradingExperience} onChange={(value) => onChange("tradingExperience", value as WizardForm["tradingExperience"])} options={["Beginner", "Intermediate", "Advanced", "Professional"]} />
      <SelectField label="Main market" value={form.mainMarket} onChange={(value) => onChange("mainMarket", value as WizardForm["mainMarket"])} options={["Forex", "Crypto", "Indices", "Stocks", "Commodities"]} />
      <SelectField label="Account type" value={form.accountType} onChange={(value) => onChange("accountType", value as WizardForm["accountType"])} options={["Personal", "Prop Firm", "Demo"]} />
    </div>
  );
}

function AccountSetupStep({
  form,
  onChange
}: {
  form: WizardForm;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="Starting balance" type="number" value={String(form.startingBalance)} onChange={(value) => onChange("startingBalance", Number(value) as WizardForm["startingBalance"])} />
      <SelectField label="Account currency" value={form.accountCurrency} onChange={(value) => onChange("accountCurrency", value as WizardForm["accountCurrency"])} options={["USD", "EUR", "GBP"]} />
      <InputField label="Broker name" value={form.brokerName} onChange={(value) => onChange("brokerName", value as WizardForm["brokerName"])} />
      <InputField label="Prop firm name (optional)" value={form.propFirmName} onChange={(value) => onChange("propFirmName", value as WizardForm["propFirmName"])} placeholder="Optional" />
    </div>
  );
}

function RiskRulesStep({
  form,
  onChange
}: {
  form: WizardForm;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <InputField label="Max trades per day" type="number" value={String(form.maxTradesPerDay)} onChange={(value) => onChange("maxTradesPerDay", Number(value) as WizardForm["maxTradesPerDay"])} />
      <InputField label="Max risk per trade %" type="number" step="0.1" value={String(form.maxRiskPerTrade)} onChange={(value) => onChange("maxRiskPerTrade", Number(value) as WizardForm["maxRiskPerTrade"])} />
      <InputField label="Max daily loss %" type="number" step="0.1" value={String(form.maxDailyLoss)} onChange={(value) => onChange("maxDailyLoss", Number(value) as WizardForm["maxDailyLoss"])} />
      <InputField label="Max consecutive losses" type="number" value={String(form.maxConsecutiveLosses)} onChange={(value) => onChange("maxConsecutiveLosses", Number(value) as WizardForm["maxConsecutiveLosses"])} />
      <InputField label="Daily profit target %" type="number" step="0.1" value={String(form.dailyProfitTarget)} onChange={(value) => onChange("dailyProfitTarget", Number(value) as WizardForm["dailyProfitTarget"])} />
    </div>
  );
}

function DefaultPreferencesStep({
  form,
  onChange
}: {
  form: WizardForm;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField label="Default session" value={form.defaultSession} onChange={(value) => onChange("defaultSession", value as WizardForm["defaultSession"])} options={["Asia", "London", "New York"]} />
      <InputField label="Default instrument" value={form.defaultInstrument} onChange={(value) => onChange("defaultInstrument", value as WizardForm["defaultInstrument"])} />
      <InputField label="Default strategy" value={form.defaultStrategy} onChange={(value) => onChange("defaultStrategy", value as WizardForm["defaultStrategy"])} />
      <InputField label="Default risk %" type="number" step="0.1" value={String(form.defaultRisk)} onChange={(value) => onChange("defaultRisk", Number(value) as WizardForm["defaultRisk"])} />
      <InputField label="Default lot size (optional)" type="number" step="0.01" value={form.defaultLotSize} onChange={(value) => onChange("defaultLotSize", value)} placeholder="Optional preset" />
    </div>
  );
}

function FinishStep({
  isProUser,
  plan,
  summaryItems
}: {
  isProUser: boolean;
  plan: "free" | "pro";
  summaryItems: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/[0.55]">Setup summary</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-normal">Your workspace is ready to feel personal from the first session.</h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
              isProUser
                ? "border-profit/30 bg-profit/10 text-profit"
                : "border-white/10 bg-white/10 text-white/72"
            }`}>
              {isProUser ? "Pro plan active" : `Current plan: ${plan}`}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {summaryItems.slice(0, 8).map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.07] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/[0.45]">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Recommended first action</p>
            <h4 className="mt-2 text-lg font-semibold text-ink">
              {isProUser ? "Log your first trade with screenshots and full review context." : "Log your first trade and let the dashboard learn your workflow."}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted">
              {isProUser
                ? "You already have the full feature set unlocked, so your cleanest first move is to add a trade with notes, rules, and chart evidence."
                : "Start by adding a trade and a daily review. That gives analytics, coaching, and discipline tracking enough signal to become genuinely useful."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950" href="/trades/new">
                Add first trade
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink transition hover:bg-surface" href="/calendar">
                Open daily review
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Plan visibility</p>
            <h4 className="mt-2 text-lg font-semibold text-ink">
              {isProUser ? "Your Pro workspace is ready." : "You can start free and upgrade later without redoing setup."}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted">
              {isProUser
                ? "Advanced analytics, AI coaching depth, screenshot upload, and full calendar insights are available as soon as you land in the dashboard."
                : "Your risk rules and preferences are already saved. When you upgrade, the extra features unlock against the same profile and trading history."}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryItems.slice(8).map((item) => (
          <div key={item.label} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <select
        className="h-12 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink shadow-soft outline-none transition focus:border-profit/35 focus:ring-2 focus:ring-profit/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  label,
  onChange,
  placeholder,
  step,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  type?: "text" | "number";
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        className="h-12 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink shadow-soft outline-none transition focus:border-profit/35 focus:ring-2 focus:ring-profit/15"
        placeholder={placeholder}
        step={step}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
