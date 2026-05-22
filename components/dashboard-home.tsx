"use client";

import Link from "next/link";
import { Award, BookOpenCheck, ChevronRight, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChartCard } from "@/components/chart-card";
import { DisciplineStreakCard } from "@/components/discipline-streak-card";
import { MetricCard } from "@/components/metric-card";
import { MonthlyProgress } from "@/components/monthly-progress";
import { RecentTrades } from "@/components/recent-trades";
import { RuleChecklist } from "@/components/rule-checklist";
import { TodayTrades } from "@/components/today-trades";
import { useNotificationTriggers } from "@/hooks/use-notification-triggers";
import { useUserDailyReviews } from "@/hooks/use-user-daily-reviews";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useUserTrades } from "@/hooks/use-user-trades";
import { isDisciplineClean } from "@/lib/daily-reviews";
import { calculateDisciplineStreak } from "@/lib/discipline-streak";
import { buildWeeklyReport } from "@/lib/notifications";
import { formatCurrency, type Trade } from "@/lib/trades";

export function DashboardHome() {
  const { trades, loading, error } = useUserTrades();
  const { reviews } = useUserDailyReviews();
  const { profile } = useUserProfile();
  const stats = buildDashboardStats(trades, profile?.accountCurrency ?? "USD");
  const disciplineStreak = calculateDisciplineStreak(trades);
  const todayReview = reviews.find((review) => review.date === new Date().toISOString().slice(0, 10));
  const weeklyReport = buildWeeklyReport(trades);

  useNotificationTriggers({ profile, reviews, trades });

  return (
    <AppShell>
      <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-white/[0.55]">Overall Trading Stats</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
              Risk, performance, and execution in one view.
            </h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/70">
            Live account: Mock Portfolio
          </div>
        </div>
        {error ? <p className="mb-4 rounded-2xl border border-loss/25 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.075]" />
              ))
            : (
                <>
                  {stats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
                  <DisciplineStreakCard mode="dark" stats={disciplineStreak} />
                </>
              )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.85fr)]">
        <ChartCard currency={profile?.accountCurrency ?? "USD"} loading={loading} trades={trades} />
        <MonthlyProgress profile={profile} trades={trades} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <RuleChecklist />
        <TodayTrades trades={trades} />
      </section>

      <TodayReviewCard review={todayReview} />

      <WeeklyReportCard currency={profile?.accountCurrency ?? "USD"} report={weeklyReport} />

      <RecentTrades trades={trades} />
    </AppShell>
  );
}

function WeeklyReportCard({
  currency,
  report
}: {
  currency: string;
  report: ReturnType<typeof buildWeeklyReport>;
}) {
  const metrics = [
    { label: "Weekly P/L", value: formatCurrency(report.weeklyProfitLoss, currency) },
    { label: "Win rate", value: `${report.winRate.toFixed(1)}%` },
    { label: "Best instrument", value: report.bestInstrument },
    { label: "Main mistake", value: report.mainMistake },
    { label: "Discipline score", value: `${report.disciplineScore}/100` }
  ];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Weekly Report</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Mock performance summary</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Placeholder report card for the future scheduled email summary. Today it uses your in-app trade data.
            </p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-profit/20 bg-profit/10 px-3 py-1 text-xs font-bold text-profit">
          <Target className="h-3.5 w-3.5" />
          Ready for email integration
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-ink">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayReviewCard({ review }: { review?: ReturnType<typeof useUserDailyReviews>["reviews"][number] }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Today&apos;s Review</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              {review ? `${review.dailyRating} discipline day` : "Complete today's review"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {review
                ? review.lessonLearned || review.notes || "Review saved. Add a lesson learned to make tomorrow easier to execute."
                : "Save your process notes, emotional state, mistakes, and tomorrow plan from the Calendar page."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {review ? (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${review.dailyRating === "Dangerous" ? "bg-loss/12 text-loss" : isDisciplineClean(review) ? "bg-profit/12 text-profit" : "bg-zinc-500/10 text-muted"}`}>
              {isDisciplineClean(review) ? "Clean discipline" : review.dailyRating}
            </span>
          ) : null}
          <Link className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 dark:bg-white dark:text-zinc-950" href="/calendar">
            {review ? "Open review" : "Complete review"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildDashboardStats(trades: Trade[], currency: string) {
  const closedTrades = trades.filter((trade) => trade.result !== "Open");
  const wins = closedTrades.filter((trade) => trade.result === "Win").length;
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTrades = trades.filter((trade) => trade.date.startsWith(thisMonth));
  const monthlyProfit = monthlyTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const maxDrawdown = calculateMaxDrawdown(trades);
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;

  return [
    {
      label: "Total Profit",
      value: formatCurrency(totalProfit, currency),
      detail: `${formatCurrency(monthlyProfit, currency)} this month`,
      tone: totalProfit >= 0 ? "profit" : "loss"
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      detail: `${wins} wins of ${closedTrades.length} closed trades`,
      tone: "neutral"
    },
    {
      label: "Total Trades",
      value: String(trades.length),
      detail: `${monthlyTrades.length} trades this month`,
      tone: "neutral"
    },
    {
      label: "Max Drawdown",
      value: formatDrawdown(maxDrawdown, currency),
      detail: `${Math.abs((maxDrawdown / 10000) * 100).toFixed(1)}% of mock equity`,
      tone: maxDrawdown < 0 ? "loss" : "neutral",
      valueClassName: maxDrawdown < 0 ? "text-loss" : "text-white/60"
    }
  ] as const;
}

function formatDrawdown(value: number, currency: string) {
  const drawdown = Math.min(0, value);

  if (drawdown === 0) {
    return formatCurrency(0, currency).replace(/^\+/, "");
  }

  return formatCurrency(drawdown, currency);
}

function calculateMaxDrawdown(trades: Trade[]) {
  let equity = 10000;
  let peak = equity;
  let maxDrawdown = 0;

  [...trades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((trade) => {
      equity += trade.profitLoss;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.min(maxDrawdown, equity - peak);
    });

  return maxDrawdown;
}
