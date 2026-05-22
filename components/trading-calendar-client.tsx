"use client";

import type { ElementType, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LineChart,
  Lock,
  Loader2,
  NotebookPen,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import { useSubscription } from "@/components/subscription-provider";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { useUserDailyReviews } from "@/hooks/use-user-daily-reviews";
import { useUserTrades } from "@/hooks/use-user-trades";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { saveDailyReview, updateDailyReview } from "@/lib/daily-review-service";
import {
  dailyRatings,
  emotionalStates,
  isDisciplineClean,
  type DailyRating,
  type DailyReview,
  type EmotionalState,
  type NewDailyReview
} from "@/lib/daily-reviews";
import { formatCurrency, type Trade } from "@/lib/trades";

type DayState = "profitable" | "losing" | "no-trades" | "rules-broken" | "breakeven";

type DaySummary = {
  date: string;
  emotionSummary: string;
  instruments: string[];
  profitLoss: number;
  rulesFollowedPercent: number;
  state: DayState;
  tradeCount: number;
  trades: Trade[];
  winRate: number;
};

type ReviewFormState = {
  bestDecision: string;
  dailyRating: DailyRating;
  emotionalState: EmotionalState;
  followedPlan: boolean;
  journaledEveryTrade: boolean;
  lessonLearned: string;
  mainMistake: string;
  noRevengeTrading: boolean;
  notes: string;
  planForTomorrow: string;
  respectedRisk: boolean;
  stoppedAtLimit: boolean;
};

const today = new Date().toISOString().slice(0, 10);
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TradingCalendarClient() {
  const { language } = useLanguage();
  const { isProUser } = useSubscription();
  const { currentUser } = useAuth();
  const { trades, loading: tradesLoading, error: tradesError } = useUserTrades();
  const { reviews, loading: reviewsLoading, error: reviewsError, refresh: refreshReviews } = useUserDailyReviews();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [form, setForm] = useState<ReviewFormState>(() => defaultReviewForm(summarizeDay(today, trades)));
  const [saving, setSaving] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const reviewsByDate = useMemo(() => new Map(reviews.map((review) => [review.date, review])), [reviews]);
  const selectedReview = reviewsByDate.get(selectedDate) ?? null;
  const daysInMonth = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthSummaries = useMemo(() => {
    const summaries = new Map<string, DaySummary>();
    daysInMonth.forEach((date) => summaries.set(toDateKey(date), summarizeDay(toDateKey(date), trades)));
    return summaries;
  }, [daysInMonth, trades]);
  const selectedSummary = monthSummaries.get(selectedDate) ?? summarizeDay(selectedDate, trades);
  const monthlySummary = useMemo(() => summarizeMonth(daysInMonth, trades), [daysInMonth, trades]);
  const insight = getInsight(selectedSummary, selectedReview);

  useEffect(() => {
    setForm(reviewFormFromReview(selectedReview, selectedSummary));
  }, [selectedReview, selectedSummary]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [error]);

  async function handleSaveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentUser) {
      setError("You must be signed in before saving a daily review.");
      return;
    }

    const payload: NewDailyReview = {
      date: selectedDate,
      ...form
    };

    try {
      setSaving(true);
      if (selectedReview) {
        await updateDailyReview(currentUser.uid, selectedDate, payload);
        setNotice("Daily review updated.");
      } else {
        await saveDailyReview(currentUser.uid, selectedDate, payload);
        setNotice("Daily review saved.");
      }
      trackEvent("daily_review_completed", {
        daily_rating: payload.dailyRating,
        emotion: payload.emotionalState,
        is_update: Boolean(selectedReview),
        rule_clean: isDisciplineClean(payload)
      });
      await refreshReviews();
    } catch (reviewError) {
      trackApiFailure("daily_review_completed", reviewError);
      setError(reviewError instanceof Error ? reviewError.message : "Unable to save this daily review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PaywallModal
        description="Calendar insights are locked on Free. Upgrade to Pro for full calendar readouts, review patterns, and discipline insights."
        lockedFeature="Calendar insights locked"
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Calendar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Trading discipline calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.55]">
            Spot winning days, losing days, rule breaks, no-trade discipline, and saved daily reviews.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/75">
          <CalendarDays className="h-4 w-4" />
          {formatMonth(visibleMonth, language)}
        </div>
      </section>

      <Toast message={notice} tone="success" />
      <Toast message={error || reviewsError || ""} tone="error" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <SummaryCard label="Monthly P/L" value={formatCurrency(monthlySummary.profitLoss)} tone={monthlySummary.profitLoss >= 0 ? "profit" : "loss"} icon={LineChart} />
        <SummaryCard label="Winning days" value={String(monthlySummary.winningDays)} icon={TrendingUp} />
        <SummaryCard label="Losing days" value={String(monthlySummary.losingDays)} icon={TrendingDown} />
        <SummaryCard label="No-trade days" value={String(monthlySummary.noTradeDays)} icon={ShieldCheck} />
        <SummaryCard label="Best day" value={formatCurrency(monthlySummary.bestDay.profitLoss)} tone="profit" icon={Target} />
        <SummaryCard label="Worst day" value={formatCurrency(monthlySummary.worstDay.profitLoss)} tone="loss" icon={AlertTriangle} />
        <SummaryCard label="Rules broken" value={String(monthlySummary.rulesBrokenDays)} tone={monthlySummary.rulesBrokenDays ? "warning" : "neutral"} icon={ClipboardCheck} />
      </section>

      {tradesLoading || tradesError ? (
        <section className={`rounded-[1.5rem] border p-4 text-sm font-semibold ${tradesError ? "border-loss/25 bg-loss/10 text-loss" : "border-line/60 bg-surface/60 text-muted"}`}>
          {tradesError ?? "Loading your Firestore trade calendar..."}
        </section>
      ) : null}

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.75fr)]">
        <div className="space-y-4">
          <section className="self-start rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-4 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-5">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-muted">Monthly Trading Calendar</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{formatMonth(visibleMonth, language)}</h2>
              </div>
              <div className="flex gap-2">
                <button className="inline-flex h-10 items-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-3 text-sm font-semibold text-ink shadow-soft" type="button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-3 text-sm font-semibold text-ink shadow-soft" type="button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto premium-scrollbar pb-2">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  {weekdayLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {daysInMonth.map((date) => {
                const key = toDateKey(date);
                const summary = monthSummaries.get(key) ?? summarizeDay(key, trades);
                const review = reviewsByDate.get(key);
                const isSelected = selectedDate === key;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    className={`min-h-[96px] rounded-[1.15rem] border p-2.5 text-left transition hover:-translate-y-0.5 sm:min-h-[108px] ${dayClass(summary.state, isSelected, isToday, review)}`}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-ink">{date.getDate()}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${dotClass(summary.state)}`} />
                    </div>
                    <p className={`mt-3 text-xs font-semibold ${summary.profitLoss > 0 ? "text-profit" : summary.profitLoss < 0 ? "text-loss" : "text-muted"}`}>
                      {summary.tradeCount ? formatCurrency(summary.profitLoss) : "No trades"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted">{summary.tradeCount} trades</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${statePillClass(summary.state)}`}>
                        {stateLabel(summary.state)}
                      </span>
                      {review ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${review.dailyRating === "Dangerous" ? "bg-loss/12 text-loss" : isDisciplineClean(review) ? "bg-profit/12 text-profit" : "bg-zinc-500/10 text-muted"}`}>
                          <BookOpenCheck className="h-3 w-3" />
                          {review.dailyRating === "Dangerous" ? "Danger" : isDisciplineClean(review) ? "Clean" : "Review"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
                  })}
                </div>
              </div>
            </div>
          </section>

          <CalendarInsightCard
            insight={insight}
            isProUser={isProUser}
            onUpgrade={() => setPaywallOpen(true)}
          />
        </div>

        <aside className="space-y-4">
          <DailyReviewPanel
            form={form}
            language={language}
            loading={reviewsLoading}
            onChange={setForm}
            onSubmit={handleSaveReview}
            saving={saving}
            summary={selectedSummary}
            savedReview={selectedReview}
          />
        </aside>
      </section>
    </>
  );
}

function DailyReviewPanel({
  form,
  language,
  loading,
  onChange,
  onSubmit,
  savedReview,
  saving,
  summary
}: {
  form: ReviewFormState;
  language: string;
  loading: boolean;
  onChange: (form: ReviewFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  savedReview: DailyReview | null;
  saving: boolean;
  summary: DaySummary;
}) {
  return (
    <>
      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-4 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Daily Review Panel</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{formatReadableDate(summary.date, language)}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${savedReview?.dailyRating === "Dangerous" ? "bg-loss/12 text-loss" : statePillClass(summary.state)}`}>
            {savedReview ? savedReview.dailyRating : stateLabel(summary.state)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <ReviewStat label="Daily P/L" value={summary.tradeCount ? formatCurrency(summary.profitLoss) : "$0"} tone={summary.profitLoss > 0 ? "profit" : summary.profitLoss < 0 ? "loss" : "neutral"} />
          <ReviewStat label="Trades" value={String(summary.tradeCount)} />
          <ReviewStat label="Win rate" value={`${Math.round(summary.winRate)}%`} />
          <ReviewStat label="Rules followed" value={`${Math.round(summary.rulesFollowedPercent)}%`} tone={summary.rulesFollowedPercent < 70 ? "loss" : "profit"} />
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-line/60 bg-surface/[0.55] p-3.5">
          <p className="text-xs font-medium text-muted">Emotion summary</p>
          <p className="mt-1 text-sm font-semibold text-ink">{summary.emotionSummary}</p>
          <p className="mt-3 text-xs font-medium text-muted">Instruments traded</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.instruments.length ? summary.instruments.map((instrument) => (
              <span key={instrument} className="rounded-full border border-line/60 bg-surface/70 px-3 py-1 text-xs font-bold text-ink">{instrument}</span>
            )) : <span className="rounded-full border border-line/60 bg-surface/70 px-3 py-1 text-xs font-bold text-muted">None</span>}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <p className="text-sm font-semibold text-ink">Trades for the day</p>
          {summary.trades.length ? summary.trades.map((trade) => (
            <div key={trade.id} className="rounded-2xl border border-line/60 bg-surface/[0.55] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{trade.instrument} {trade.type}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{trade.strategy} · {trade.emotion}</p>
                </div>
                <p className={`text-sm font-bold ${trade.profitLoss > 0 ? "text-profit" : trade.profitLoss < 0 ? "text-loss" : "text-muted"}`}>{formatCurrency(trade.profitLoss)}</p>
              </div>
            </div>
          )) : <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4 text-sm font-medium text-muted">No trades logged for this day.</div>}
        </div>
      </section>

      <form className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-4 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-5" onSubmit={onSubmit}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Daily Discipline Review</p>
            <h3 className="text-lg font-semibold text-ink">{savedReview ? "Update saved review" : "Save review for this day"}</h3>
          </div>
        </div>

        {loading ? <div className="mb-4 rounded-2xl border border-line/60 bg-surface/60 p-4 text-sm font-semibold text-muted">Loading saved review...</div> : null}

        <div className="grid gap-2.5">
          {[
            ["followedPlan", "I followed my trading plan"],
            ["respectedRisk", "I respected max risk"],
            ["noRevengeTrading", "I did not revenge trade"],
            ["stoppedAtLimit", "I stopped after my limit"],
            ["journaledEveryTrade", "I journaled every trade"]
          ].map(([key, label]) => (
            <button
              key={key}
              className="flex w-full items-center gap-3 rounded-2xl border border-line/60 bg-surface/[0.55] p-2.5 text-left"
              type="button"
              onClick={() => onChange({ ...form, [key]: !form[key as keyof ReviewFormState] })}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${form[key as keyof ReviewFormState] ? "bg-profit text-white" : "bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-white/50"}`}>
                <Check className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-ink">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select label="Emotional state" value={form.emotionalState} onChange={(value) => onChange({ ...form, emotionalState: value as EmotionalState })} options={emotionalStates} />
          <Select label="Daily rating" value={form.dailyRating} onChange={(value) => onChange({ ...form, dailyRating: value as DailyRating })} options={dailyRatings} />
        </div>

        <div className="mt-4 grid gap-3">
          <Input label="Main mistake" value={form.mainMistake} onChange={(value) => onChange({ ...form, mainMistake: value })} />
          <Input label="Best decision" value={form.bestDecision} onChange={(value) => onChange({ ...form, bestDecision: value })} />
          <Input label="Lesson learned" value={form.lessonLearned} onChange={(value) => onChange({ ...form, lessonLearned: value })} />
          <Input label="Plan for tomorrow" value={form.planForTomorrow} onChange={(value) => onChange({ ...form, planForTomorrow: value })} />
          <TextArea label="Notes" value={form.notes} onChange={(value) => onChange({ ...form, notes: value })} />
        </div>

        <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950" type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : savedReview ? "Update Daily Review" : "Save Daily Review"}
        </button>
      </form>

    </>
  );
}

function CalendarInsightCard({
  insight,
  isProUser,
  onUpgrade
}: {
  insight: string;
  isProUser: boolean;
  onUpgrade: () => void;
}) {
  if (!isProUser) {
    return (
      <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-premium">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/[0.55]">Insights</p>
              <h3 className="mt-1 text-xl font-semibold leading-tight">Calendar insights are Pro</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Upgrade to Pro to unlock selected-day insights and discipline readouts.
              </p>
            </div>
          </div>
          <button className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5" type="button" onClick={onUpgrade}>
            <Sparkles className="h-4 w-4" />
            Upgrade
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-5 w-5 text-profit" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Insights</p>
          <h3 className="text-lg font-semibold">Selected day readout</h3>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">{insight}</p>
    </section>
  );
}

function SummaryCard({ icon: Icon, label, tone = "neutral", value }: { icon: ElementType; label: string; tone?: "profit" | "loss" | "warning" | "neutral"; value: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-4 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-normal ${toneClass(tone)}`}>{value}</p>
    </article>
  );
}

function ReviewStat({ label, tone = "neutral", value }: { label: string; tone?: "profit" | "loss" | "neutral"; value: string }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function Input({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input className="h-10 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select className="h-10 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <textarea className="min-h-20 resize-none rounded-2xl border border-line/70 bg-surface/70 px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Toast({ message, tone }: { message: string; tone: "success" | "error" }) {
  if (!message) return null;

  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-premium ${tone === "success" ? "border-profit/20 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "border-loss/25 bg-loss text-white"}`}>
      {tone === "success" ? <CheckCircle2 className="h-4 w-4 text-profit" /> : <AlertTriangle className="h-4 w-4" />}
      {message}
    </div>
  );
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const days: Date[] = [];

  for (let i = 0; i < mondayOffset; i += 1) days.push(new Date(year, month, 1 - mondayOffset + i));
  for (let day = 1; day <= lastDay.getDate(); day += 1) days.push(new Date(year, month, day));
  while (days.length % 7 !== 0) days.push(new Date(year, month, lastDay.getDate() + days.length - mondayOffset - lastDay.getDate() + 1));

  return days;
}

function summarizeDay(date: string, trades: Trade[]): DaySummary {
  const dayTrades = trades.filter((trade) => trade.date === date);
  const profitLoss = dayTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const closedTrades = dayTrades.filter((trade) => trade.result !== "Open");
  const wins = closedTrades.filter((trade) => trade.result === "Win").length;
  const rulesFollowedPercent = dayTrades.length ? (dayTrades.filter((trade) => trade.ruleFollowed).length / dayTrades.length) * 100 : 100;

  return {
    date,
    emotionSummary: Array.from(new Set(dayTrades.map((trade) => trade.emotion))).join(", ") || "No emotional data logged",
    instruments: Array.from(new Set(dayTrades.map((trade) => trade.instrument))),
    profitLoss,
    rulesFollowedPercent,
    state: getDayState(dayTrades, profitLoss, rulesFollowedPercent),
    tradeCount: dayTrades.length,
    trades: dayTrades,
    winRate: closedTrades.length ? (wins / closedTrades.length) * 100 : 0
  };
}

function summarizeMonth(days: Date[], trades: Trade[]) {
  const month = days.find((day) => day.getDate() === 1)?.getMonth();
  const currentMonthDays = days.filter((date) => date.getMonth() === month);
  const summaries = currentMonthDays.map((date) => summarizeDay(toDateKey(date), trades));
  const tradedDays = summaries.filter((summary) => summary.tradeCount > 0);
  const sortedByProfit = [...tradedDays].sort((a, b) => a.profitLoss - b.profitLoss);

  return {
    bestDay: sortedByProfit[sortedByProfit.length - 1] ?? summarizeDay(today, []),
    losingDays: summaries.filter((summary) => summary.profitLoss < 0).length,
    noTradeDays: summaries.filter((summary) => summary.tradeCount === 0).length,
    profitLoss: summaries.reduce((sum, summary) => sum + summary.profitLoss, 0),
    rulesBrokenDays: summaries.filter((summary) => summary.tradeCount > 0 && summary.rulesFollowedPercent < 100).length,
    winningDays: summaries.filter((summary) => summary.profitLoss > 0).length,
    worstDay: sortedByProfit[0] ?? summarizeDay(today, [])
  };
}

function getDayState(trades: Trade[], profitLoss: number, rulesFollowedPercent: number): DayState {
  if (!trades.length) return "no-trades";
  if (rulesFollowedPercent < 100) return "rules-broken";
  if (profitLoss > 0) return "profitable";
  if (profitLoss < 0) return "losing";
  return "breakeven";
}

function defaultReviewForm(summary: DaySummary): ReviewFormState {
  const cleanRules = summary.rulesFollowedPercent >= 100;
  return {
    bestDecision: "",
    dailyRating: inferRating(summary),
    emotionalState: summary.trades[0]?.emotion === "Unknown" ? "Calm" : summary.trades[0]?.emotion ?? "Calm",
    followedPlan: cleanRules,
    journaledEveryTrade: Boolean(summary.tradeCount),
    lessonLearned: "",
    mainMistake: "",
    noRevengeTrading: !summary.trades.some((trade) => trade.emotion === "Revenge"),
    notes: "",
    planForTomorrow: "",
    respectedRisk: cleanRules,
    stoppedAtLimit: summary.tradeCount <= 3
  };
}

function reviewFormFromReview(review: DailyReview | null, summary: DaySummary): ReviewFormState {
  if (!review) return defaultReviewForm(summary);
  return {
    bestDecision: review.bestDecision,
    dailyRating: review.dailyRating,
    emotionalState: review.emotionalState,
    followedPlan: review.followedPlan,
    journaledEveryTrade: review.journaledEveryTrade,
    lessonLearned: review.lessonLearned,
    mainMistake: review.mainMistake,
    noRevengeTrading: review.noRevengeTrading,
    notes: review.notes,
    planForTomorrow: review.planForTomorrow,
    respectedRisk: review.respectedRisk,
    stoppedAtLimit: review.stoppedAtLimit
  };
}

function inferRating(summary: DaySummary): DailyRating {
  if (!summary.tradeCount) return "Good";
  if (summary.rulesFollowedPercent < 70 || summary.trades.some((trade) => trade.emotion === "Revenge")) return "Dangerous";
  if (summary.profitLoss > 0 && summary.rulesFollowedPercent === 100) return "Great";
  if (summary.profitLoss < 0) return "Bad";
  return "Good";
}

function getInsight(summary: DaySummary, review: DailyReview | null) {
  if (review?.emotionalState === "Revenge") return "Saved review shows revenge emotion. Tomorrow should include a mandatory pause after any loss.";
  if (review?.dailyRating === "Dangerous") return "This day is marked Dangerous. Reduce risk next session and enforce your stop rules.";
  if (review?.lessonLearned) return `Saved lesson: ${review.lessonLearned}`;
  if (!summary.tradeCount) return "No trades today. Good discipline if no clean setup appeared.";
  if (summary.profitLoss > 0 && summary.rulesFollowedPercent < 70) return "You were profitable, but rules followed was under 70%. Good result, weak process.";
  if (summary.profitLoss < 0) return "Losing day. Review whether the setup was valid and whether risk was contained.";
  return "Strong profitable day with clean discipline. Archive the setup conditions so you can repeat them.";
}

function dayClass(state: DayState, selected: boolean, isToday: boolean, review?: DailyReview) {
  const base = review?.dailyRating === "Dangerous"
    ? "border-loss/40 bg-loss/15"
    : state === "profitable"
      ? "border-profit/20 bg-profit/10"
      : state === "losing"
        ? "border-loss/20 bg-loss/10"
        : state === "rules-broken"
          ? "border-amber-400/30 bg-amber-400/[0.12]"
          : state === "breakeven"
            ? "border-sky-400/25 bg-sky-400/[0.12]"
            : "border-line/60 bg-surface/[0.55]";
  return `${base} ${selected ? "ring-4 ring-zinc-950/10 dark:ring-white/15" : ""} ${isToday ? "outline outline-2 outline-offset-2 outline-zinc-950/50 dark:outline-white/60" : ""}`;
}

function dotClass(state: DayState) {
  if (state === "profitable") return "bg-profit";
  if (state === "losing") return "bg-loss";
  if (state === "rules-broken") return "bg-amber-400";
  if (state === "breakeven") return "bg-sky-400";
  return "bg-zinc-300 dark:bg-white/20";
}

function statePillClass(state: DayState) {
  if (state === "profitable") return "bg-profit/12 text-profit";
  if (state === "losing") return "bg-loss/12 text-loss";
  if (state === "rules-broken") return "bg-amber-400/[0.16] text-amber-600 dark:text-amber-300";
  if (state === "breakeven") return "bg-sky-400/[0.14] text-sky-600 dark:text-sky-300";
  return "bg-zinc-500/10 text-muted";
}

function stateLabel(state: DayState) {
  if (state === "profitable") return "Profit";
  if (state === "losing") return "Loss";
  if (state === "rules-broken") return "Rules broken";
  if (state === "breakeven") return "Breakeven";
  return "No trades";
}

function toneClass(tone: "profit" | "loss" | "warning" | "neutral") {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  if (tone === "warning") return "text-amber-500";
  return "text-ink";
}

function formatMonth(date: Date, language = "en") {
  return date.toLocaleDateString(localeForLanguage(language), { month: "long", year: "numeric" });
}

function formatReadableDate(date: string, language = "en") {
  return new Date(`${date}T00:00:00`).toLocaleDateString(localeForLanguage(language), {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric"
  });
}

function localeForLanguage(language: string) {
  if (language === "ru") return "ru-RU";
  if (language === "ro") return "ro-RO";
  if (language === "es") return "es-ES";
  if (language === "fr") return "fr-FR";
  if (language === "de") return "de-DE";
  if (language === "it") return "it-IT";
  if (language === "pt") return "pt-PT";
  return "en-US";
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
