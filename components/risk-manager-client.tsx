"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  Gauge,
  LockKeyhole,
  Save,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingDown,
  WalletCards
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  calculateCalculatorResult,
  calculateDailyRiskStatus,
  defaultRiskSettings,
  toSafeNumber,
  type RiskLevel,
  type RiskSettings
} from "@/lib/risk";
import { useUserTrades } from "@/hooks/use-user-trades";
import { formatCurrency } from "@/lib/trades";
import { createUserProfile, updateUserProfile, type UserProfile } from "@/lib/user-profile";

type SettingsForm = Record<keyof RiskSettings, string>;

const instruments = ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30", "BTCUSD"];
const rules = [
  "Risk max 1% per trade",
  "Wait for confirmed setup",
  "No revenge trading",
  "Max 3 trades per day",
  "Stop after 2 losses",
  "Journal every trade"
];

const inputStyles =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-profit/70 focus:ring-4 focus:ring-profit/10";
const selectStyles =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

const today = new Date().toISOString().slice(0, 10);

export function RiskManagerClient() {
  const { currentUser } = useAuth();
  const { profile, loading: profileLoading, error: profileError, isUsingDefaults, refresh } = useUserProfile();
  const { trades } = useUserTrades();
  const [settings, setSettings] = useState<RiskSettings>(defaultRiskSettings);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(settingsToForm(defaultRiskSettings));
  const [showToast, setShowToast] = useState(false);
  const [calculator, setCalculator] = useState({
    instrument: defaultRiskSettings.defaultInstrument,
    entryPrice: "2338.50",
    stopLoss: "2330.00",
    takeProfit: "2356.00",
    accountBalance: String(defaultRiskSettings.accountBalance),
    riskPercent: String(defaultRiskSettings.maxRiskPerTrade),
    pointValue: "10"
  });

  useEffect(() => {
    if (profile) {
      const parsed = riskSettingsFromProfile(profile);
      setSettings(parsed);
      setSettingsForm(settingsToForm(parsed));
      setCalculator((current) => ({
        ...current,
        instrument: parsed.defaultInstrument,
        accountBalance: String(parsed.accountBalance),
        riskPercent: String(parsed.maxRiskPerTrade)
      }));
    }
  }, [profile]);

  const todaysTrades = useMemo(() => trades.filter((trade) => trade.date === today), [trades]);
  const dailyStatus = useMemo(() => calculateDailyRiskStatus(todaysTrades, settings), [todaysTrades, settings]);
  const calculatorResult = useMemo(
    () =>
      calculateCalculatorResult({
        entryPrice: toSafeNumber(calculator.entryPrice),
        stopLoss: toSafeNumber(calculator.stopLoss),
        takeProfit: toSafeNumber(calculator.takeProfit),
        accountBalance: toSafeNumber(calculator.accountBalance),
        riskPercent: toSafeNumber(calculator.riskPercent),
        pointValue: toSafeNumber(calculator.pointValue)
      }),
    [calculator]
  );

  function updateSettings<K extends keyof RiskSettings>(key: K, value: string) {
    setSettingsForm((current) => ({ ...current, [key]: value }));
  }

  function updateCalculator(key: keyof typeof calculator, value: string) {
    setCalculator((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    const nextSettings: RiskSettings = {
      accountBalance: toSafeNumber(settingsForm.accountBalance, defaultRiskSettings.accountBalance),
      maxRiskPerTrade: toSafeNumber(settingsForm.maxRiskPerTrade, defaultRiskSettings.maxRiskPerTrade),
      maxDailyLoss: toSafeNumber(settingsForm.maxDailyLoss, defaultRiskSettings.maxDailyLoss),
      maxTradesPerDay: toSafeNumber(settingsForm.maxTradesPerDay, defaultRiskSettings.maxTradesPerDay),
      maxConsecutiveLosses: toSafeNumber(settingsForm.maxConsecutiveLosses, defaultRiskSettings.maxConsecutiveLosses),
      dailyProfitTarget: toSafeNumber(settingsForm.dailyProfitTarget, defaultRiskSettings.dailyProfitTarget),
      defaultInstrument: settingsForm.defaultInstrument || defaultRiskSettings.defaultInstrument
    };

    if (!currentUser) {
      return;
    }

    setSettings(nextSettings);
    const profilePayload = {
      startingBalance: nextSettings.accountBalance,
      maxRiskPerTrade: nextSettings.maxRiskPerTrade,
      maxDailyLoss: nextSettings.maxDailyLoss,
      maxTradesPerDay: nextSettings.maxTradesPerDay,
      maxConsecutiveLosses: nextSettings.maxConsecutiveLosses,
      dailyProfitTarget: nextSettings.dailyProfitTarget,
      defaultInstrument: nextSettings.defaultInstrument
    };

    if (isUsingDefaults) {
      await createUserProfile(currentUser.uid, { ...(profile ?? {}), ...profilePayload });
    } else {
      await updateUserProfile(currentUser.uid, profilePayload);
    }

    await refresh();
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 1800);
  }

  return (
    <>
      {showToast ? (
        <div className="fixed right-5 top-24 z-40 flex items-center gap-3 rounded-2xl border border-profit/20 bg-profit px-4 py-3 text-sm font-semibold text-white shadow-premium">
          <CheckCircle2 className="h-5 w-5" />
          Risk settings saved to Firestore.
        </div>
      ) : null}

      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Risk Manager</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Trade only when risk is under control.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.55]">
            Set limits, size positions, monitor daily discipline, and know when the best trade is no trade.
          </p>
        </div>
        <StatusBadge level={dailyStatus.level} label={dailyStatus.label} />
      </section>

      {profileLoading || profileError || isUsingDefaults ? (
        <section className={`rounded-[1.5rem] border p-4 text-sm font-semibold ${profileError ? "border-loss/25 bg-loss/10 text-loss" : "border-amber-400/25 bg-amber-400/10 text-amber-600 dark:text-amber-300"}`}>
          {profileError ?? (profileLoading ? "Loading your Firestore risk settings..." : "Using safe risk defaults until you save your profile settings.")}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card eyebrow="Account Risk Settings" title="Daily guardrails" icon={LockKeyhole}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account balance">
              <input className={inputStyles} inputMode="decimal" value={settingsForm.accountBalance} onChange={(event) => updateSettings("accountBalance", event.target.value)} />
            </Field>
            <Field label="Max risk per trade %">
              <input className={inputStyles} inputMode="decimal" value={settingsForm.maxRiskPerTrade} onChange={(event) => updateSettings("maxRiskPerTrade", event.target.value)} />
            </Field>
            <Field label="Max daily loss %">
              <input className={inputStyles} inputMode="decimal" value={settingsForm.maxDailyLoss} onChange={(event) => updateSettings("maxDailyLoss", event.target.value)} />
            </Field>
            <Field label="Max trades per day">
              <input className={inputStyles} inputMode="numeric" value={settingsForm.maxTradesPerDay} onChange={(event) => updateSettings("maxTradesPerDay", event.target.value)} />
            </Field>
            <Field label="Max consecutive losses">
              <input className={inputStyles} inputMode="numeric" value={settingsForm.maxConsecutiveLosses} onChange={(event) => updateSettings("maxConsecutiveLosses", event.target.value)} />
            </Field>
            <Field label="Daily profit target %">
              <input className={inputStyles} inputMode="decimal" value={settingsForm.dailyProfitTarget} onChange={(event) => updateSettings("dailyProfitTarget", event.target.value)} />
            </Field>
            <Field label="Default instrument">
              <select className={selectStyles} value={settingsForm.defaultInstrument} onChange={(event) => updateSettings("defaultInstrument", event.target.value)}>
                {instruments.map((instrument) => (
                  <option key={instrument}>{instrument}</option>
                ))}
              </select>
            </Field>
          </div>

          <button
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950"
            type="button"
            onClick={saveSettings}
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </Card>

        <DailyStatusCard status={dailyStatus} settings={settings} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <Card eyebrow="Position Size Calculator" title="Size the trade before entry" icon={Calculator}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Instrument">
              <select className={selectStyles} value={calculator.instrument} onChange={(event) => updateCalculator("instrument", event.target.value)}>
                {instruments.map((instrument) => (
                  <option key={instrument}>{instrument}</option>
                ))}
              </select>
            </Field>
            <Field label="Entry price">
              <input className={inputStyles} inputMode="decimal" value={calculator.entryPrice} onChange={(event) => updateCalculator("entryPrice", event.target.value)} />
            </Field>
            <Field label="Stop loss">
              <input className={inputStyles} inputMode="decimal" value={calculator.stopLoss} onChange={(event) => updateCalculator("stopLoss", event.target.value)} />
            </Field>
            <Field label="Take profit">
              <input className={inputStyles} inputMode="decimal" value={calculator.takeProfit} onChange={(event) => updateCalculator("takeProfit", event.target.value)} />
            </Field>
            <Field label="Account balance">
              <input className={inputStyles} inputMode="decimal" value={calculator.accountBalance} onChange={(event) => updateCalculator("accountBalance", event.target.value)} />
            </Field>
            <Field label="Risk %">
              <input className={inputStyles} inputMode="decimal" value={calculator.riskPercent} onChange={(event) => updateCalculator("riskPercent", event.target.value)} />
            </Field>
            <Field label="Pip value / point value">
              <input className={inputStyles} inputMode="decimal" value={calculator.pointValue} onChange={(event) => updateCalculator("pointValue", event.target.value)} />
            </Field>
            <div className="flex items-end">
              <button className="h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink shadow-soft" type="button">
                Calculate
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultTile label="Risk amount" value={`$${formatNumber(calculatorResult.riskAmount)}`} tone="profit" />
            <ResultTile label="Stop distance" value={formatNumber(calculatorResult.stopDistance)} />
            <ResultTile label="Suggested lot size" value={formatNumber(calculatorResult.suggestedLotSize, 3)} />
            <ResultTile label="Loss at SL" value={`-$${formatNumber(calculatorResult.estimatedLoss)}`} tone="loss" />
          </div>
          <div className="mt-3 rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
            <p className="text-sm font-semibold text-ink">
              Risk/reward placeholder:{" "}
              <span className={calculatorResult.riskReward ? "text-profit" : "text-muted"}>
                {calculatorResult.riskReward ? `${formatNumber(calculatorResult.riskReward, 2)}:1` : "Enter TP to calculate"}
              </span>
            </p>
          </div>
        </Card>

        <div className="grid gap-5">
          <RiskMeter level={dailyStatus.level} />
          <RiskChecklist />
        </div>
      </section>
    </>
  );
}

function DailyStatusCard({
  status,
  settings
}: {
  status: ReturnType<typeof calculateDailyRiskStatus>;
  settings: RiskSettings;
}) {
  const icon = status.level === "danger" ? ShieldAlert : status.level === "warning" ? AlertTriangle : ShieldCheck;
  const Icon = icon;

  return (
    <Card eyebrow="Daily Trading Status" title="Session permission" icon={Icon}>
      <div className={`rounded-[1.5rem] border p-5 ${statusSurface(status.level)}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium opacity-75">Current status</p>
            <p className="mt-1 text-2xl font-semibold">{status.label}</p>
          </div>
          <Icon className="h-7 w-7" />
        </div>
        <div className="mt-4 space-y-2 text-sm font-medium">
          {[...status.stopReasons, ...status.warningReasons].length ? (
            [...status.stopReasons, ...status.warningReasons].map((reason) => <p key={reason}>{reason}</p>)
          ) : (
            <p>Limits are clear. Keep waiting for confirmed setups.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StatusMetric icon={WalletCards} label="Trades taken today" value={`${status.tradesTaken}/${settings.maxTradesPerDay}`} />
        <StatusMetric icon={Target} label="Daily P/L" value={formatCurrency(status.dailyProfitLoss)} valueClass={status.dailyProfitLoss >= 0 ? "text-profit" : "text-loss"} />
        <StatusMetric icon={TrendingDown} label="Consecutive losses" value={`${status.consecutiveLosses}/${settings.maxConsecutiveLosses}`} />
        <StatusMetric icon={Gauge} label="Current drawdown" value={`${formatNumber(status.currentDrawdownPercent, 2)}%`} />
        <StatusMetric icon={CheckCircle2} label="Rules followed" value={`${Math.round(status.rulesFollowedPercent)}%`} />
        <StatusMetric icon={Target} label="Profit target progress" value={`${formatNumber(status.dailyProfitPercent, 2)}%/${settings.dailyProfitTarget}%`} />
      </div>
    </Card>
  );
}

function RiskMeter({ level }: { level: RiskLevel }) {
  const width = level === "safe" ? "w-1/3" : level === "warning" ? "w-2/3" : "w-full";
  const color = level === "safe" ? "bg-profit" : level === "warning" ? "bg-amber-400" : "bg-loss";
  const label = level === "safe" ? "Safe" : level === "warning" ? "Warning" : "Danger";

  return (
    <Card eyebrow="Visual Risk Meter" title="Risk pressure" icon={Gauge}>
      <div className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-5">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-profit">Safe</span>
          <span className="text-amber-500">Warning</span>
          <span className="text-loss">Danger</span>
        </div>
        <div className="mt-4 h-4 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
          <div className={`h-full rounded-full ${color} ${width}`} />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted">Risk level is based on daily loss, trade count, consecutive losses, profit target, and rule discipline.</p>
      </div>
    </Card>
  );
}

function RiskChecklist() {
  return (
    <Card eyebrow="Risk Rules Checklist" title="Before the next trade" icon={CheckCircle2}>
      <div className="grid gap-3 sm:grid-cols-2">
        {rules.map((rule, index) => (
          <div key={rule} className="flex items-center gap-3 rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index < 4 ? "bg-profit text-white" : "bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-white/50"}`}>
              <Check className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-ink">{rule}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Card({
  eyebrow,
  title,
  icon: Icon,
  children
}: {
  eyebrow: string;
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal text-ink">{title}</h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-soft dark:bg-white dark:text-zinc-950">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

function ResultTile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "profit" | "loss" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value,
  valueClass = "text-ink"
}: {
  icon: ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`mt-2 text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ level, label }: { level: RiskLevel; label: string }) {
  return <div className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${badgeClass(level)}`}>{label}</div>;
}

function badgeClass(level: RiskLevel) {
  if (level === "danger") {
    return "bg-loss text-white";
  }

  if (level === "warning") {
    return "bg-amber-400 text-zinc-950";
  }

  return "bg-profit text-white";
}

function statusSurface(level: RiskLevel) {
  if (level === "danger") {
    return "border-loss/25 bg-loss/10 text-loss";
  }

  if (level === "warning") {
  return "border-amber-400/30 bg-amber-400/[0.12] text-amber-600 dark:text-amber-300";
  }

  return "border-profit/25 bg-profit/10 text-profit";
}

function settingsToForm(settings: RiskSettings): SettingsForm {
  return {
    accountBalance: String(settings.accountBalance),
    maxRiskPerTrade: String(settings.maxRiskPerTrade),
    maxDailyLoss: String(settings.maxDailyLoss),
    maxTradesPerDay: String(settings.maxTradesPerDay),
    maxConsecutiveLosses: String(settings.maxConsecutiveLosses),
    dailyProfitTarget: String(settings.dailyProfitTarget),
    defaultInstrument: settings.defaultInstrument
  };
}

function riskSettingsFromProfile(profile: UserProfile): RiskSettings {
  return {
    accountBalance: profile.startingBalance,
    maxRiskPerTrade: profile.maxRiskPerTrade,
    maxDailyLoss: profile.maxDailyLoss,
    maxTradesPerDay: profile.maxTradesPerDay,
    maxConsecutiveLosses: profile.maxConsecutiveLosses,
    dailyProfitTarget: profile.dailyProfitTarget,
    defaultInstrument: profile.defaultInstrument
  };
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits
  });
}
