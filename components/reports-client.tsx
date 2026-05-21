"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Lock, RefreshCcw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import { useUserDailyReviews } from "@/hooks/use-user-daily-reviews";
import { useUserExpenses } from "@/hooks/use-user-expenses";
import { useUserTrades } from "@/hooks/use-user-trades";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import {
  buildMonthlyReportSummary,
  getAvailableReportMonths,
  type MonthlyReportSummary
} from "@/lib/reporting";
import { formatCurrency } from "@/lib/trades";

type ReportHistoryItem = {
  id: string;
  downloadUrl?: string;
  generatedAt?: string;
  month: number;
  summary: MonthlyReportSummary;
  year: number;
};

export function ReportsClient() {
  const { currentUser } = useAuth();
  const { isProUser } = useSubscription();
  const { reviews, loading: reviewsLoading, error: reviewsError } = useUserDailyReviews();
  const { expenses, loading: expensesLoading, error: expensesError } = useUserExpenses();
  const { trades, loading: tradesLoading, error: tradesError } = useUserTrades();
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const loading = reviewsLoading || expensesLoading || tradesLoading;
  const dataError = reviewsError || expensesError || tradesError || historyError;

  const availableMonths = useMemo(() => getAvailableReportMonths({ expenses, reviews, trades }), [expenses, reviews, trades]);
  const activeMonth = availableMonths.find((month) => month.key === selectedMonthKey) ?? availableMonths[0];
  const summary = useMemo(
    () => buildMonthlyReportSummary({
      expenses,
      month: activeMonth?.month ?? new Date().getMonth() + 1,
      reviews,
      trades,
      year: activeMonth?.year ?? new Date().getFullYear()
    }),
    [activeMonth?.month, activeMonth?.year, expenses, reviews, trades]
  );

  useEffect(() => {
    if (!selectedMonthKey && availableMonths[0]) {
      setSelectedMonthKey(availableMonths[0].key);
    }
  }, [availableMonths, selectedMonthKey]);

  useEffect(() => {
    void loadHistory();
  }, [currentUser]);

  async function authFetch(path: string, init?: RequestInit) {
    if (!currentUser) {
      throw new Error("You must be signed in to access reports.");
    }

    const token = await currentUser.getIdToken();
    return fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {})
      }
    });
  }

  async function loadHistory() {
    if (!currentUser) return;
    setHistoryError("");
    try {
      const response = await authFetch("/api/reports");
      const payload = await response.json() as { error?: string; reports?: ReportHistoryItem[] };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load report history.");
      }
      setHistory(payload.reports ?? []);
    } catch (error) {
      trackApiFailure("report_history_load", error);
      setHistoryError(error instanceof Error ? error.message : "Unable to load report history.");
    }
  }

  async function deleteHistoryItem(reportId: string) {
    if (!currentUser) return;
    setHistoryError("");
    try {
      const response = await authFetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete report.");
      }
      await loadHistory();
    } catch (error) {
      trackApiFailure("report_history_delete", error);
      setHistoryError(error instanceof Error ? error.message : "Unable to delete report.");
    }
  }

  async function downloadPdfReport() {
    if (!isProUser) {
      trackEvent("report_locked_clicked", { plan_type: "free" });
      setPaywallOpen(true);
      return;
    }

    if (!currentUser || !activeMonth) {
      return;
    }

    setIsGenerating(true);
    setHistoryError("");

    try {
      await generateMonthlyPdf(summary, activeMonth.label);
      trackEvent("pdf_report_generated", {
        month: summary.month,
        report_total_trades: summary.totalTrades,
        report_win_rate: summary.winRate,
        year: summary.year
      });
      trackEvent("report_generated", {
        month: summary.month,
        report_type: "monthly_pdf",
        reports_generated: history.length + 1,
        year: summary.year
      });
      const response = await authFetch("/api/reports", {
        body: JSON.stringify({ summary }),
        method: "POST"
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save report history.");
      }
      await loadHistory();
    } catch (error) {
      trackApiFailure("pdf_report_generated", error);
      setHistoryError(error instanceof Error ? error.message : "Unable to generate PDF report.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <PaywallModal
        description="PDF reports are a Pro feature. Upgrade to generate professional monthly performance reports with advanced discipline sections."
        lockedFeature="PDF Monthly Reports"
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />

      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/[0.58]">
            <FileText className="h-3.5 w-3.5 text-profit" />
            Performance reports
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal">Monthly trading report</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.62]">
            Export a clean performance summary with risk, discipline, emotions, expenses, and real net profit after costs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-11 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white outline-none focus:ring-4 focus:ring-profit/20"
            value={activeMonth?.key ?? ""}
            onChange={(event) => setSelectedMonthKey(event.target.value)}
          >
            {availableMonths.map((month) => (
              <option key={month.key} className="text-zinc-950" value={month.key}>{month.label}</option>
            ))}
          </select>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || isGenerating}
            type="button"
            onClick={downloadPdfReport}
          >
            {isProUser ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {isGenerating ? "Generating..." : "Download PDF Report"}
          </button>
        </div>
      </section>

      {dataError ? (
        <section className="rounded-[1.5rem] border border-loss/30 bg-loss/[0.08] p-4 text-sm font-semibold text-loss">
          {dataError}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Net Profit" loading={loading} tone={summary.netProfit >= 0 ? "profit" : "loss"} value={formatCurrency(summary.netProfit)} />
        <ReportMetric label="Win Rate" loading={loading} value={`${summary.winRate}%`} />
        <ReportMetric label="Total Trades" loading={loading} value={String(summary.totalTrades)} />
        <ReportMetric label="Real Net After Expenses" loading={loading} tone={summary.realNetProfitAfterExpenses >= 0 ? "profit" : "loss"} value={formatCurrency(summary.realNetProfitAfterExpenses)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <ReportPreview summary={summary} monthLabel={activeMonth?.label ?? "Current month"} loading={loading} />
        <ReportHistory
          history={history}
          loading={loading}
          onDelete={deleteHistoryItem}
          onRefresh={loadHistory}
        />
      </section>

      {!isProUser ? (
        <section className="grid gap-4">
          <ReportsUpgradeBanner
            onUpgrade={() => setPaywallOpen(true)}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <ProSection title="Advanced sections" detail="Best/worst behavior, emotional patterns, and AI Coach summary placeholders." />
            <ProSection title="PDF export" detail="Download a polished monthly PDF report for accountability and review." />
            <ProSection title="Report history" detail="Track generated reports in Firestore under your user account." />
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
          <p className="text-sm leading-6 text-white/[0.7]">
            TradeControl reports are journaling and analytics summaries only. They do not provide financial advice, buy/sell signals, predictions, or profit guarantees. Trading involves risk.
          </p>
        </div>
      </section>
    </>
  );
}

function ReportsUpgradeBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-premium">
            <Lock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/[0.55]">PDF export</p>
            <h3 className="mt-1 text-xl font-semibold leading-tight">PDF reports are Pro</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              CSV export stays free on the Trades page. PDF reports and advanced report sections are available for Pro users.
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

function ReportMetric({ label, loading, tone = "neutral", value }: { label: string; loading: boolean; tone?: "profit" | "loss" | "neutral"; value: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-normal ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink"}`}>
        {loading ? "..." : value}
      </p>
    </article>
  );
}

function ReportPreview({ loading, monthLabel, summary }: { loading: boolean; monthLabel: string; summary: MonthlyReportSummary }) {
  const rows = [
    ["Average R:R", `${summary.averageRiskReward}:1`],
    ["Best Instrument", summary.bestInstrument],
    ["Worst Instrument", summary.worstInstrument],
    ["Best Session", summary.bestSession],
    ["Worst Session", summary.worstSession],
    ["Rule Compliance", `${summary.ruleCompliance}%`],
    ["Main Mistake", summary.mainMistake],
    ["Emotional Summary", summary.emotionalSummary],
    ["Expenses", formatCurrency(-summary.expensesTotal)],
    ["AI Coach Summary", "Placeholder: connect to saved coach summaries in a future release"]
  ];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Monthly Summary</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{monthLabel}</h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-line/60">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-2 border-b border-line/60 px-4 py-3 last:border-b-0 sm:grid-cols-[220px_1fr]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="text-sm font-semibold leading-6 text-ink">{loading ? "..." : value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportHistory({
  history,
  loading,
  onDelete,
  onRefresh
}: {
  history: ReportHistoryItem[];
  loading: boolean;
  onDelete: (reportId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Reports History</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Generated reports</h2>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-muted transition hover:text-ink" type="button" onClick={onRefresh} aria-label="Refresh reports">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[1.25rem] bg-zinc-200/70 dark:bg-white/10" />)
        ) : history.length ? (
          history.map((report) => (
            <article key={report.id} className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-line/60 bg-surface/60 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {new Date(report.year, report.month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "just now"} · Net {formatCurrency(report.summary.realNetProfitAfterExpenses)}
                </p>
              </div>
              <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-muted transition hover:border-loss/30 hover:text-loss" type="button" onClick={() => onDelete(report.id)} aria-label="Delete report history item">
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-line/70 bg-surface/50 p-6 text-center">
            <p className="text-sm font-semibold text-ink">No reports generated yet.</p>
            <p className="mt-2 text-sm leading-6 text-muted">Download your first PDF report to save a history item here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProSection({ detail, title }: { detail: string; title: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

async function generateMonthlyPdf(summary: MonthlyReportSummary, monthLabel: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFillColor(10, 14, 20);
  doc.roundedRect(36, 32, pageWidth - 72, 108, 18, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("TradeControl Performance Report", 60, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(190, 198, 210);
  doc.text(`${monthLabel} · Journaling, risk, discipline, and expense summary`, 60, 98);
  doc.text("TradeControl is a journaling and discipline tool, not financial advice.", 60, 120);

  y = 174;
  const cards = [
    ["Net Profit", formatCurrency(summary.netProfit)],
    ["Win Rate", `${summary.winRate}%`],
    ["Total Trades", String(summary.totalTrades)],
    ["Average R:R", `${summary.averageRiskReward}:1`],
    ["Rule Compliance", `${summary.ruleCompliance}%`],
    ["Real Net", formatCurrency(summary.realNetProfitAfterExpenses)]
  ];

  cards.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 36 + col * 174;
    const cardY = y + row * 82;
    doc.setFillColor(247, 249, 251);
    doc.roundedRect(x, cardY, 156, 62, 12, 12, "F");
    doc.setTextColor(108, 117, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 14, cardY + 22);
    doc.setTextColor(20, 24, 31);
    doc.setFontSize(16);
    doc.text(value, x + 14, cardY + 46);
  });

  y += 186;
  doc.setTextColor(20, 24, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Report Sections", 36, y);
  y += 24;

  const rows = [
    ["Best Instrument", summary.bestInstrument],
    ["Worst Instrument", summary.worstInstrument],
    ["Best Session", summary.bestSession],
    ["Worst Session", summary.worstSession],
    ["Main Mistake", summary.mainMistake],
    ["Emotional Summary", summary.emotionalSummary],
    ["Expenses", formatCurrency(-summary.expensesTotal)],
    ["AI Coach Summary", "Placeholder: connect to saved coach summaries in a future release"]
  ];

  rows.forEach(([label, value], index) => {
    const rowY = y + index * 34;
    doc.setDrawColor(224, 228, 235);
    doc.line(36, rowY + 24, pageWidth - 36, rowY + 24);
    doc.setTextColor(108, 117, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, 36, rowY + 10);
    doc.setTextColor(20, 24, 31);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(String(value), 210, rowY + 10, { maxWidth: pageWidth - 246 });
  });

  doc.setTextColor(108, 117, 130);
  doc.setFontSize(8);
  doc.text("Disclaimer: TradeControl reports are analytics summaries only. Trading involves risk. This report does not provide financial advice, signals, or profit guarantees.", 36, 790, { maxWidth: pageWidth - 72 });
  doc.save(`tradecontrol-${summary.year}-${String(summary.month).padStart(2, "0")}-report.pdf`);
}
