"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Lock, Save, X } from "lucide-react";
import { useSubscription } from "@/components/subscription-provider";
import { useUserProfile } from "@/hooks/use-user-profile";
import { trackEvent } from "@/lib/analytics";
import { validateScreenshotFile } from "@/lib/screenshot-storage";
import { calculateRiskReward, type NewTrade, type Trade } from "@/lib/trades";

type FormState = {
  date: string;
  session: Trade["session"];
  instrument: string;
  customInstrument: string;
  type: Trade["type"];
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  lotSize: string;
  riskAmount: string;
  result: Trade["result"];
  profitLoss: string;
  strategy: string;
  setupQuality: Trade["setupQuality"];
  emotion: Trade["emotion"];
  ruleFollowed: "Yes" | "No";
  notes: string;
};

type TradeSubmitPayload = {
  screenshotFile: File | null;
  trade: NewTrade;
};

type TradeFormProps = {
  cancelHref?: string;
  initialTrade?: Trade;
  mode?: "create" | "edit";
  onSubmit: (payload: TradeSubmitPayload) => Promise<void>;
  onSuccess?: () => void;
  onLimitCheck?: (tradeDate: string) => string | null;
  submitLabel: string;
  successMessage: string;
};

const today = new Date().toISOString().slice(0, 10);
const knownInstruments = ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30", "BTCUSD"];

const initialForm: FormState = {
  date: today,
  session: "London",
  instrument: "XAUUSD",
  customInstrument: "",
  type: "Buy",
  entryPrice: "",
  stopLoss: "",
  takeProfit: "",
  lotSize: "",
  riskAmount: "",
  result: "Open",
  profitLoss: "",
  strategy: "",
  setupQuality: "A",
  emotion: "Calm",
  ruleFollowed: "Yes",
  notes: ""
};

const selectStyles =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10";
const inputStyles =
  "h-12 w-full rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-profit/70 focus:ring-4 focus:ring-profit/10";
const labelStyles = "text-sm font-semibold text-ink";

function formFromTrade(trade?: Trade): FormState {
  if (!trade) {
    return initialForm;
  }

  const knownInstrument = knownInstruments.includes(trade.instrument);

  return {
    date: trade.date,
    session: trade.session,
    instrument: knownInstrument ? trade.instrument : "Custom",
    customInstrument: knownInstrument ? "" : trade.instrument,
    type: trade.type,
    entryPrice: String(trade.entryPrice || ""),
    stopLoss: String(trade.stopLoss || ""),
    takeProfit: String(trade.takeProfit || ""),
    lotSize: String(trade.lotSize || ""),
    riskAmount: String(trade.riskAmount || ""),
    result: trade.result,
    profitLoss: String(trade.profitLoss || ""),
    strategy: trade.strategy,
    setupQuality: trade.setupQuality,
    emotion: trade.emotion,
    ruleFollowed: trade.ruleFollowed ? "Yes" : "No",
    notes: trade.notes
  };
}

export function TradeForm({
  cancelHref = "/trades",
  initialTrade,
  mode = "create",
  onSubmit,
  onSuccess,
  onLimitCheck,
  submitLabel,
  successMessage
}: TradeFormProps) {
  const { profile } = useUserProfile();
  const { isProUser } = useSubscription();
  const [form, setForm] = useState<FormState>(() => formFromTrade(initialTrade));
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileDefaultsApplied, setProfileDefaultsApplied] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState(initialTrade?.screenshotUrl ?? "");

  const entry = Number(form.entryPrice);
  const stop = Number(form.stopLoss);
  const target = Number(form.takeProfit);
  const riskAmount = Number(form.riskAmount);
  const profitLoss = Number(form.profitLoss);
  const accountBalance = profile?.startingBalance ?? 10000;
  const maxRisk = profile?.maxRiskPerTrade ?? 1;
  const riskLimit = accountBalance * (maxRisk / 100);
  const rr = useMemo(() => calculateRiskReward(entry, stop, target), [entry, stop, target]);
  const riskTooHigh = riskAmount > riskLimit;
  const ruleBroken = form.ruleFollowed === "No";

  useEffect(() => {
    setForm(formFromTrade(initialTrade));
    setScreenshotPreview(initialTrade?.screenshotUrl ?? "");
    setScreenshotFile(null);
  }, [initialTrade]);

  useEffect(() => {
    if (!profile || profileDefaultsApplied || mode === "edit") {
      return;
    }

    setForm((current) => ({
      ...current,
      session: profile.defaultSession,
      instrument: profile.defaultInstrument,
      lotSize: profile.defaultLotSize ? String(profile.defaultLotSize) : current.lotSize,
      riskAmount: profile.defaultRisk ? String((profile.startingBalance * profile.defaultRisk) / 100) : current.riskAmount,
      strategy: profile.defaultStrategy
    }));
    setProfileDefaultsApplied(true);
  }, [mode, profile, profileDefaultsApplied]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectScreenshot(file: File | null) {
    setError(null);

    if (!isProUser) {
      setError("Screenshot upload is a Pro feature. Upgrade to attach chart screenshots.");
      return;
    }

    if (!file) {
      setScreenshotFile(null);
      setScreenshotPreview(initialTrade?.screenshotUrl ?? "");
      return;
    }

    const validationError = validateScreenshotFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const limitError = onLimitCheck?.(form.date);
    if (limitError) {
      setError(limitError);
      return;
    }

    const savedInstrument = form.instrument === "Custom" ? form.customInstrument || "Custom" : form.instrument;
    const trade: NewTrade = {
      date: form.date,
      session: form.session,
      instrument: savedInstrument,
      tradeType: form.type,
      entryPrice: Number(form.entryPrice) || 0,
      stopLoss: Number(form.stopLoss) || 0,
      takeProfit: Number(form.takeProfit) || 0,
      lotSize: Number(form.lotSize) || 0,
      riskAmount: Number(form.riskAmount) || 0,
      result: form.result,
      profitLoss: Number(form.profitLoss) || 0,
      strategy: form.strategy || "Manual entry",
      setupQuality: form.setupQuality,
      emotion: form.emotion,
      ruleFollowed: form.ruleFollowed === "Yes",
      notes: form.notes,
      screenshotUrl: initialTrade?.screenshotUrl ?? "",
      screenshotPath: initialTrade?.screenshotPath ?? "",
      rr
    };

    try {
      setIsSaving(true);
      await onSubmit({ screenshotFile, trade });
      trackEvent(mode === "edit" ? "trade_updated" : "trade_added", {
        instrument: trade.instrument,
        result: trade.result,
        rule_followed: trade.ruleFollowed,
        session: trade.session,
        setup_quality: trade.setupQuality,
        strategy: trade.strategy || null,
        trade_type: trade.tradeType
      });
      setShowSuccess(true);
      window.setTimeout(() => onSuccess?.(), 850);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this trade. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      {showSuccess ? (
        <div className="fixed right-5 top-24 z-40 flex items-center gap-3 rounded-2xl border border-profit/20 bg-profit px-4 py-3 text-sm font-semibold text-white shadow-premium">
          <CheckCircle2 className="h-5 w-5" />
          {successMessage}
        </div>
      ) : null}

      <form
        onSubmit={saveTrade}
        className="rounded-[2rem] border border-white/[0.55] bg-white/[0.76] p-5 shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-line/60 pb-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-medium text-muted">{mode === "edit" ? "Edit Trade" : "Add Trade"}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-ink">{mode === "edit" ? "Update journal entry" : "New journal entry"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Capture execution, risk, psychology, and rule discipline before the details get fuzzy.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={cancelHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              <X className="h-4 w-4" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-loss/25 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Date">
            <input className={inputStyles} type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required />
          </Field>
          <Field label="Trading session">
            <select className={selectStyles} value={form.session} onChange={(event) => update("session", event.target.value as Trade["session"])}>
              {["Asia", "London", "New York"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Instrument">
            <select className={selectStyles} value={form.instrument} onChange={(event) => update("instrument", event.target.value)}>
              {[...knownInstruments, "Custom"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          {form.instrument === "Custom" ? (
            <Field label="Custom instrument">
              <input className={inputStyles} placeholder="Enter symbol" value={form.customInstrument} onChange={(event) => update("customInstrument", event.target.value)} />
            </Field>
          ) : null}
          <Field label="Trade type">
            <div className="grid grid-cols-2 gap-2">
              {["Buy", "Sell"].map((item) => (
                <button
                  key={item}
                  className={`h-12 rounded-2xl border text-sm font-semibold transition ${
                    form.type === item
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-line/70 bg-surface/60 text-muted"
                  }`}
                  type="button"
                  onClick={() => update("type", item as Trade["type"])}
                >
                  {item}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Entry price">
            <input className={inputStyles} inputMode="decimal" placeholder="0.00" value={form.entryPrice} onChange={(event) => update("entryPrice", event.target.value)} />
          </Field>
          <Field label="Stop loss">
            <input className={inputStyles} inputMode="decimal" placeholder="0.00" value={form.stopLoss} onChange={(event) => update("stopLoss", event.target.value)} />
          </Field>
          <Field label="Take profit">
            <input className={inputStyles} inputMode="decimal" placeholder="0.00" value={form.takeProfit} onChange={(event) => update("takeProfit", event.target.value)} />
          </Field>
          <Field label="Lot size">
            <input className={inputStyles} inputMode="decimal" placeholder="0.10" value={form.lotSize} onChange={(event) => update("lotSize", event.target.value)} />
          </Field>
          <Field label="Risk amount">
            <input className={`${inputStyles} ${riskTooHigh ? "border-loss/60 ring-4 ring-loss/10" : ""}`} inputMode="decimal" placeholder="$100" value={form.riskAmount} onChange={(event) => update("riskAmount", event.target.value)} />
          </Field>
          <Field label="Result">
            <select className={selectStyles} value={form.result} onChange={(event) => update("result", event.target.value as Trade["result"])}>
              {["Win", "Loss", "Breakeven", "Open"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Profit/Loss amount">
            <input className={`${inputStyles} ${profitLoss > 0 ? "border-profit/60 text-profit" : profitLoss < 0 ? "border-loss/60 text-loss" : ""}`} inputMode="decimal" placeholder="Example: 125 or -50" value={form.profitLoss} onChange={(event) => update("profitLoss", event.target.value)} />
          </Field>
          <Field label="Strategy used">
            <input className={inputStyles} placeholder="Breakout retest" value={form.strategy} onChange={(event) => update("strategy", event.target.value)} />
          </Field>
          <Field label="Setup quality">
            <select className={selectStyles} value={form.setupQuality} onChange={(event) => update("setupQuality", event.target.value as Trade["setupQuality"])}>
              {["A+", "A", "B", "C"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Emotion before trade">
            <select className={selectStyles} value={form.emotion} onChange={(event) => update("emotion", event.target.value as Trade["emotion"])}>
              {["Calm", "Fear", "Greed", "Revenge", "FOMO", "Confident"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Rule followed?">
            <div className="grid grid-cols-2 gap-2">
              {["Yes", "No"].map((item) => (
                <button
                  key={item}
                  className={`h-12 rounded-2xl border text-sm font-semibold transition ${
                    form.ruleFollowed === item
                      ? item === "Yes"
                        ? "border-profit bg-profit text-white"
                        : "border-loss bg-loss text-white"
                      : "border-line/70 bg-surface/60 text-muted"
                  }`}
                  type="button"
                  onClick={() => update("ruleFollowed", item as "Yes" | "No")}
                >
                  {item}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <Field label="Notes">
            <textarea
              className="min-h-36 w-full resize-none rounded-[1.5rem] border border-line/70 bg-surface/70 px-4 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
              placeholder="What happened? What did you execute well? What needs improving?"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </Field>
          <div className="rounded-[1.5rem] border border-dashed border-line bg-surface/50 p-5">
            <div className="flex h-full min-h-36 flex-col items-center justify-center text-center">
              {screenshotPreview ? (
                <img alt="Trade screenshot preview" className="h-40 w-full rounded-[1.25rem] object-cover shadow-soft" src={screenshotPreview} />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                  <Camera className="h-5 w-5" />
                </div>
              )}
              <p className="mt-3 text-sm font-semibold text-ink">{screenshotFile ? screenshotFile.name : screenshotPreview ? "Screenshot attached" : "Upload chart screenshot"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {isProUser ? "PNG, JPG, JPEG, or WEBP. Max 5MB." : "Screenshot upload is locked on Free."}
              </p>
              <label className={`mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink transition ${isProUser ? "cursor-pointer hover:bg-surface" : "cursor-not-allowed opacity-60"}`}>
                {!isProUser ? <Lock className="h-4 w-4" /> : null}
                {isProUser ? "Choose image" : "Pro upload"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  disabled={!isProUser}
                  onChange={(event) => selectScreenshot(event.target.files?.[0] ?? null)}
                />
              </label>
              {screenshotFile || screenshotPreview ? (
                <button className="mt-2 text-xs font-bold text-muted underline-offset-4 hover:text-ink hover:underline" type="button" onClick={() => selectScreenshot(null)}>
                  Clear selected screenshot
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>

      <aside className="space-y-5">
        <div className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06]">
          <p className="text-sm font-medium text-white/[0.55]">Smart Trade Readout</p>
          <p className="mt-4 text-4xl font-semibold">{rr ? `${rr}:1` : "0:1"}</p>
          <p className="mt-2 text-sm text-white/[0.55]">Calculated risk/reward ratio</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Risk cap" value={`$${riskLimit.toLocaleString("en-US", { maximumFractionDigits: 2 })}`} />
            <Stat label="Balance" value={`$${accountBalance.toLocaleString()}`} />
          </div>
        </div>

        {riskTooHigh ? <Warning>Risk amount is above your {maxRisk}% account risk limit.</Warning> : null}
        {ruleBroken ? <Warning>This trade is marked as rule-broken. Review it before saving.</Warning> : null}

        <div className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-semibold text-ink">Save behavior</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            This entry is saved under your authenticated Firestore trade journal and will appear on the Trades page after saving.
          </p>
        </div>
      </aside>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className={labelStyles}>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-[1.5rem] border border-loss/25 bg-loss/10 p-4 text-loss">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-semibold leading-6">{children}</p>
    </div>
  );
}
