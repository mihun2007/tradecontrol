"use client";

import { useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Filter,
  LineChart,
  Minus,
  PieChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import { useSubscription } from "@/components/subscription-provider";
import { useUserTrades } from "@/hooks/use-user-trades";
import { formatCurrency, type Trade } from "@/lib/trades";

type FilterState = {
  range: "7D" | "30D" | "90D" | "All";
  instrument: string;
  session: string;
  strategy: string;
};

type StrategyPerformance = {
  name: string;
  trades: number;
  winRate: number;
  netProfit: number;
  averageRr: number;
  compliance: number;
};

type Mistake = {
  name: string;
  count: number;
  loss: number;
  severity: "Low" | "Medium" | "High";
  recommendation: string;
};

type EmotionPerformance = {
  emotion: string;
  trades: number;
  profitLoss: number;
  expectancy: number;
  winRate: number;
};

const analyticsTrades: Trade[] = [
  {
    id: "ana-1",
    date: "2026-04-04",
    session: "London",
    instrument: "GBPUSD",
    tradeType: "Buy",
    type: "Buy",
    entryPrice: 1.262,
    stopLoss: 1.258,
    takeProfit: 1.27,
    lotSize: 0.4,
    riskAmount: 72,
    result: "Win",
    profitLoss: 168,
    strategy: "Liquidity Sweep",
    setupQuality: "A",
    emotion: "Calm",
    ruleFollowed: true,
    notes: "Clean sweep.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 2
  },
  {
    id: "ana-2",
    date: "2026-04-05",
    session: "New York",
    instrument: "US30",
    tradeType: "Sell",
    type: "Sell",
    entryPrice: 38880,
    stopLoss: 38935,
    takeProfit: 38780,
    lotSize: 0.5,
    riskAmount: 88,
    result: "Loss",
    profitLoss: -110,
    strategy: "Trend Continuation",
    setupQuality: "C",
    emotion: "FOMO",
    ruleFollowed: false,
    notes: "Chased move.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 1.8
  },
  {
    id: "ana-3",
    date: "2026-04-09",
    session: "Asia",
    instrument: "BTCUSD",
    tradeType: "Buy",
    type: "Buy",
    entryPrice: 65100,
    stopLoss: 64620,
    takeProfit: 66250,
    lotSize: 0.04,
    riskAmount: 76,
    result: "Win",
    profitLoss: 142,
    strategy: "Fair Value Gap",
    setupQuality: "B",
    emotion: "Confident",
    ruleFollowed: true,
    notes: "Clear displacement.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 2.4
  },
  {
    id: "ana-4",
    date: "2026-04-11",
    session: "London",
    instrument: "XAUUSD",
    tradeType: "Sell",
    type: "Sell",
    entryPrice: 2368,
    stopLoss: 2377,
    takeProfit: 2348,
    lotSize: 0.25,
    riskAmount: 95,
    result: "Win",
    profitLoss: 238,
    strategy: "Break and Retest",
    setupQuality: "A+",
    emotion: "Calm",
    ruleFollowed: true,
    notes: "Strong continuation.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 2.2
  },
  {
    id: "ana-5",
    date: "2026-04-15",
    session: "New York",
    instrument: "NAS100",
    tradeType: "Buy",
    type: "Buy",
    entryPrice: 18020,
    stopLoss: 17970,
    takeProfit: 18110,
    lotSize: 1,
    riskAmount: 100,
    result: "Loss",
    profitLoss: -130,
    strategy: "Order Block",
    setupQuality: "B",
    emotion: "Revenge",
    ruleFollowed: false,
    notes: "Second loss was avoidable.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 1.8
  },
  {
    id: "ana-6",
    date: "2026-04-19",
    session: "London",
    instrument: "EURUSD",
    tradeType: "Sell",
    type: "Sell",
    entryPrice: 1.088,
    stopLoss: 1.091,
    takeProfit: 1.081,
    lotSize: 0.5,
    riskAmount: 65,
    result: "Win",
    profitLoss: 154,
    strategy: "Order Block",
    setupQuality: "A",
    emotion: "Confident",
    ruleFollowed: true,
    notes: "Good patience.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 2.3
  },
  {
    id: "ana-7",
    date: "2026-04-21",
    session: "Asia",
    instrument: "GBPUSD",
    tradeType: "Sell",
    type: "Sell",
    entryPrice: 1.252,
    stopLoss: 1.256,
    takeProfit: 1.246,
    lotSize: 0.4,
    riskAmount: 70,
    result: "Breakeven",
    profitLoss: 0,
    strategy: "Trend Continuation",
    setupQuality: "B",
    emotion: "Fear",
    ruleFollowed: true,
    notes: "Managed risk.",
    screenshotUrl: "",
    screenshotPath: "",
    rr: 1.5
  }
];

const strategyRows: StrategyPerformance[] = [
  { name: "Break and Retest", trades: 18, winRate: 67, netProfit: 1180, averageRr: 2.1, compliance: 91 },
  { name: "Liquidity Sweep", trades: 14, winRate: 71, netProfit: 940, averageRr: 2.3, compliance: 88 },
  { name: "Order Block", trades: 16, winRate: 56, netProfit: 420, averageRr: 1.8, compliance: 82 },
  { name: "Fair Value Gap", trades: 11, winRate: 55, netProfit: 210, averageRr: 1.7, compliance: 79 },
  { name: "Trend Continuation", trades: 21, winRate: 43, netProfit: -360, averageRr: 1.4, compliance: 64 }
];

const mistakes: Mistake[] = [
  { name: "Overtrading", count: 7, loss: 520, severity: "High", recommendation: "Lock entries after max trade count is reached." },
  { name: "Revenge trading", count: 4, loss: 430, severity: "High", recommendation: "Force a 30-minute cooldown after a loss." },
  { name: "Entering without confirmation", count: 9, loss: 380, severity: "Medium", recommendation: "Require setup checklist before entry." },
  { name: "Moving stop loss", count: 3, loss: 260, severity: "Medium", recommendation: "Predefine invalidation and never widen risk." },
  { name: "Trading during news", count: 2, loss: 140, severity: "Low", recommendation: "Block trades during high-impact events." },
  { name: "FOMO entry", count: 8, loss: 610, severity: "High", recommendation: "Wait for pullback or skip the move." }
];

const initialFilters: FilterState = {
  range: "30D",
  instrument: "All",
  session: "All",
  strategy: "All"
};

const filterClass =
  "h-11 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink outline-none focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

export function AnalyticsClient() {
  const { isProUser } = useSubscription();
  const { trades, loading, error } = useUserTrades();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const instruments = useMemo(() => ["All", ...Array.from(new Set(trades.map((trade) => trade.instrument)))], [trades]);
  const strategies = useMemo(() => ["All", ...Array.from(new Set([...trades.map((trade) => trade.strategy), ...strategyRows.map((strategy) => strategy.name)]))], [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      return (
        (filters.instrument === "All" || trade.instrument === filters.instrument) &&
        (filters.session === "All" || trade.session === filters.session) &&
        (filters.strategy === "All" || trade.strategy === filters.strategy)
      );
    });
  }, [filters, trades]);

  const metrics = useMemo(() => calculateOverview(filteredTrades), [filteredTrades]);
  const equityData = useMemo(() => buildEquityData(filteredTrades), [filteredTrades]);
  const instrumentRows = useMemo(() => groupByInstrument(filteredTrades), [filteredTrades]);
  const sessionRows = useMemo(() => groupBySession(filteredTrades), [filteredTrades]);
  const strategyPerformanceRows = useMemo(() => groupByStrategy(filteredTrades), [filteredTrades]);
  const emotionRows = useMemo(() => groupByEmotion(filteredTrades), [filteredTrades]);
  const performanceHeatmap = useMemo(() => buildPerformanceHeatmap(filteredTrades), [filteredTrades]);

  return (
    <>
      <PaywallModal
        description="Advanced analytics are locked on the Free plan. Upgrade to Pro for equity curves, strategy analysis, emotions, mistakes, and AI-style insights."
        lockedFeature="Advanced analytics locked"
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Analytics</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Performance intelligence for disciplined traders.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.55]">
            Understand strengths, weak spots, repeated mistakes, and the conditions where your edge actually shows up.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/75">
          <Brain className="h-4 w-4 text-profit" />
          {isProUser ? "Advanced analytics enabled" : "Limited analytics"}
        </div>
      </section>

      {loading || error ? (
        <section className={`rounded-[1.5rem] border p-4 text-sm font-semibold ${error ? "border-loss/25 bg-loss/10 text-loss" : "border-line/60 bg-surface/60 text-muted"}`}>
          {error ?? "Loading your Firestore analytics..."}
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Filters</p>
              <p className="text-sm text-muted">UI-only controls for shaping the analysis view</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="grid grid-cols-4 rounded-2xl border border-line/70 bg-surface/60 p-1">
              {(["7D", "30D", "90D", "All"] as FilterState["range"][]).map((range) => (
                <button
                  key={range}
                  className={`h-9 rounded-xl text-sm font-bold transition ${filters.range === range ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "text-muted"}`}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, range }))}
                >
                  {range}
                </button>
              ))}
            </div>
            <select className={filterClass} value={filters.instrument} onChange={(event) => setFilters((current) => ({ ...current, instrument: event.target.value }))}>
              {instruments.map((instrument) => <option key={instrument}>{instrument}</option>)}
            </select>
            <select className={filterClass} value={filters.session} onChange={(event) => setFilters((current) => ({ ...current, session: event.target.value }))}>
              {["All", "Asia", "London", "New York"].map((session) => <option key={session}>{session}</option>)}
            </select>
            <select className={filterClass} value={filters.strategy} onChange={(event) => setFilters((current) => ({ ...current, strategy: event.target.value }))}>
              {strategies.map((strategy) => <option key={strategy}>{strategy}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Performance Overview</p>
            <h2 className="text-xl font-semibold text-ink">Core trading metrics</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Net Profit" value={formatCurrency(metrics.netProfit)} tone={metrics.netProfit >= 0 ? "profit" : "loss"} icon={LineChart} />
          <MetricCard label="Win Rate" value={`${metrics.winRate}%`} icon={Target} />
          <MetricCard label="Profit Factor" value={metrics.profitFactor.toFixed(2)} tone={metrics.profitFactor >= 1 ? "profit" : "loss"} icon={TrendingUp} />
          <MetricCard label="Average R:R" value={`${metrics.averageRr}:1`} icon={PieChart} />
          <MetricCard label="Average Win" value={formatCurrency(metrics.averageWin)} tone="profit" icon={TrendingUp} />
          <MetricCard label="Average Loss" value={formatCurrency(metrics.averageLoss)} tone="loss" icon={TrendingDown} />
          <MetricCard label="Max Drawdown" value={formatCurrency(metrics.maxDrawdown)} tone="loss" icon={AlertTriangle} />
          <MetricCard label="Total Trades" value={String(filteredTrades.length)} icon={WalletCards} />
        </div>
      </section>

      <PerformanceHeatmap data={performanceHeatmap} />

      {isProUser ? (
        <section className="grid gap-5">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
            <EquityCurve data={equityData} />
            <InstrumentChart rows={instrumentRows} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <SessionPerformance rows={sessionRows} />
            <StrategyPerformance rows={strategyPerformanceRows.length ? strategyPerformanceRows : strategyRows} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <MistakeAnalysis mistakes={mistakes} />
            <EmotionPerformance rows={emotionRows} />
          </section>

          <InsightsBox />
        </section>
      ) : (
        <AnalyticsUpgradeBanner onUpgrade={() => setPaywallOpen(true)} />
      )}
    </>
  );
}

function AnalyticsUpgradeBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-premium">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/[0.55]">Premium analytics</p>
            <h3 className="mt-1 text-xl font-semibold leading-tight">Unlock advanced analytics</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Pro unlocks equity curves, strategy performance, session breakdowns, mistake analysis, emotion analytics, and AI-style insights.
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

function MetricCard({
  label,
  value,
  tone = "neutral",
  icon: Icon
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
  icon: ElementType;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className={`mt-3 text-3xl font-semibold tracking-normal ${toneClass(tone)}`}>{value}</p>
    </article>
  );
}

type HeatmapDay = {
  averageProfitLoss: number;
  day: string;
  profitLoss: number;
  trades: number;
};

type HeatmapSession = {
  profitLoss: number;
  session: string;
  trades: number;
  winRate: number;
};

type PerformanceHeatmapData = {
  dayInsight: string;
  days: HeatmapDay[];
  sessionInsight: string;
  sessions: HeatmapSession[];
};

function PerformanceHeatmap({ data }: { data: PerformanceHeatmapData }) {
  const maxDayAbs = Math.max(1, ...data.days.map((day) => Math.abs(day.profitLoss)));
  const maxSessionAbs = Math.max(1, ...data.sessions.map((session) => Math.abs(session.profitLoss)));

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-medium text-muted">Performance Heatmap</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Where your edge shows up</h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <HeatmapPanel title="Best Days">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-3">
            {data.days.map((day) => (
              <HeatmapCell key={day.day} intensityBase={maxDayAbs} label={day.day} profitLoss={day.profitLoss}>
                <p className="mt-3 break-words text-[1.05rem] font-semibold leading-tight tracking-normal tabular-nums">{formatCurrency(day.profitLoss)}</p>
                <p className="mt-1 text-xs font-medium opacity-75">{day.trades} {day.trades === 1 ? "trade" : "trades"}</p>
              </HeatmapCell>
            ))}
          </div>
        </HeatmapPanel>

        <HeatmapPanel title="Best Sessions">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
            {data.sessions.map((session) => (
              <HeatmapCell key={session.session} intensityBase={maxSessionAbs} label={session.session} profitLoss={session.profitLoss}>
                <p className="mt-3 break-words text-[1.05rem] font-semibold leading-tight tracking-normal tabular-nums">{formatCurrency(session.profitLoss)}</p>
                <p className="mt-1 text-xs font-medium opacity-75">{session.winRate}% win rate · {session.trades} {session.trades === 1 ? "trade" : "trades"}</p>
              </HeatmapCell>
            ))}
          </div>
        </HeatmapPanel>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {[data.dayInsight, data.sessionInsight].map((insight) => (
          <div key={insight} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-profit" />
              <p className="text-sm leading-6 text-muted">{insight}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeatmapPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <article className="rounded-[1.5rem] border border-line/60 bg-surface/[0.45] p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <div className="flex w-fit items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-loss" />
          <span>Loss</span>
          <span className="mx-1 h-px w-5 bg-line" />
          <span>Profit</span>
          <span className="h-2.5 w-2.5 rounded-full bg-profit" />
        </div>
      </div>
      {children}
    </article>
  );
}

function HeatmapCell({
  children,
  intensityBase,
  label,
  profitLoss
}: {
  children: ReactNode;
  intensityBase: number;
  label: string;
  profitLoss: number;
}) {
  const colorStyle = heatmapColorStyle(profitLoss, intensityBase);

  return (
    <div className="min-h-[7.75rem] min-w-0 rounded-[1.25rem] border p-4 text-ink shadow-soft" style={colorStyle}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">{label}</p>
      {children}
    </div>
  );
}

function EquityCurve({ data }: { data: { date: string; balance: number; profitLoss: number }[] }) {
  const points = buildLinePoints(data.map((item) => item.balance));
  const bestDay = [...data].sort((a, b) => b.profitLoss - a.profitLoss)[0];
  const worstDay = [...data].sort((a, b) => a.profitLoss - b.profitLoss)[0];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-muted">Equity Curve</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Account balance over time</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-profit/[0.12] px-3 py-1 text-xs font-bold text-profit">Best {bestDay ? formatCurrency(bestDay.profitLoss) : "$0"}</span>
          <span className="rounded-full bg-loss/[0.12] px-3 py-1 text-xs font-bold text-loss">Worst {worstDay ? formatCurrency(worstDay.profitLoss) : "$0"}</span>
        </div>
      </div>
      <div className="mt-7 h-[320px] rounded-[1.5rem] border border-line/60 bg-gradient-to-b from-zinc-50/80 to-white/30 p-4 dark:from-white/[0.06] dark:to-transparent">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Mock equity curve">
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-line/70" strokeWidth="0.35" />
          ))}
          <polyline points={points} fill="none" stroke="#17a269" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={points} fill="none" stroke="rgba(23,162,105,0.14)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-muted">
        <span className="rounded-full border border-line/60 bg-surface/[0.55] px-3 py-1">Profitable periods rise in green</span>
        <span className="rounded-full border border-line/60 bg-surface/[0.55] px-3 py-1">Pullbacks mark drawdown windows</span>
      </div>
    </section>
  );
}

function InstrumentChart({ rows }: { rows: { instrument: string; profitLoss: number; trades: number }[] }) {
  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.profitLoss)));

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Profit by Instrument</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Market contribution</h2>
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <div key={row.instrument}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{row.instrument}</span>
              <span className={row.profitLoss >= 0 ? "font-semibold text-profit" : "font-semibold text-loss"}>{formatCurrency(row.profitLoss)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${row.profitLoss >= 0 ? "bg-profit" : "bg-loss"}`}
                style={{ width: `${Math.max(8, (Math.abs(row.profitLoss) / maxAbs) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-medium text-muted">{row.trades} trades</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionPerformance({ rows }: { rows: ReturnType<typeof groupBySession> }) {
  const best = rows.reduce((winner, row) => (row.profitLoss > winner.profitLoss ? row : winner), rows[0]);

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Profit by Trading Session</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Session quality</h2>
      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <article key={row.session} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-ink">{row.session}</p>
                  {best?.session === row.session ? <span className="rounded-full bg-profit/[0.12] px-2 py-1 text-[11px] font-bold text-profit">Best session</span> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{row.trades} trades · {row.winRate}% win rate</p>
              </div>
              <p className={row.profitLoss >= 0 ? "text-xl font-semibold text-profit" : "text-xl font-semibold text-loss"}>{formatCurrency(row.profitLoss)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StrategyPerformance({ rows }: { rows: StrategyPerformance[] }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Strategy Performance</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Edge by playbook</h2>
      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-line/60">
        <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.8fr_1fr] border-b border-line/60 bg-zinc-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted dark:bg-white/[0.04] lg:grid">
          <span>Strategy</span>
          <span>Trades</span>
          <span>Win rate</span>
          <span>Net P/L</span>
          <span>Avg R:R</span>
          <span>Compliance</span>
        </div>
        <div className="divide-y divide-line/60">
          {rows.map((row) => (
            <article key={row.name} className="grid gap-3 bg-surface/40 px-4 py-4 text-sm sm:px-5 lg:grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.8fr_1fr] lg:items-center">
              <AnalyticsMobileField label="Strategy" className="font-semibold text-ink">{row.name}</AnalyticsMobileField>
              <AnalyticsMobileField label="Trades" className="text-muted">{row.trades}</AnalyticsMobileField>
              <AnalyticsMobileField label="Win rate" className="font-semibold text-ink">{row.winRate}%</AnalyticsMobileField>
              <AnalyticsMobileField label="Net P/L" className={row.netProfit >= 0 ? "font-semibold text-profit" : "font-semibold text-loss"}>{formatCurrency(row.netProfit)}</AnalyticsMobileField>
              <AnalyticsMobileField label="Avg R:R" className="font-semibold text-ink">{row.averageRr}:1</AnalyticsMobileField>
              <AnalyticsMobileField label="Compliance" className={row.compliance >= 85 ? "font-semibold text-profit" : row.compliance >= 70 ? "font-semibold text-amber-500" : "font-semibold text-loss"}>{row.compliance}%</AnalyticsMobileField>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnalyticsMobileField({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <p className={className}>
      <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted lg:hidden">{label}</span>
      {children}
    </p>
  );
}

function MistakeAnalysis({ mistakes }: { mistakes: Mistake[] }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Mistake Analysis</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Repeated leaks</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {mistakes.map((mistake) => (
          <article key={mistake.name} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{mistake.name}</p>
                <p className="mt-1 text-sm text-muted">{mistake.count} times · {formatCurrency(-mistake.loss)} loss</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${severityClass(mistake.severity)}`}>{mistake.severity}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{mistake.recommendation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmotionPerformance({ rows }: { rows: EmotionPerformance[] }) {
  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.profitLoss)));

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Emotion Performance</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Psychology impact</h2>
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <article key={row.emotion} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{row.emotion}</p>
                <p className="mt-1 text-xs font-medium text-muted">{row.trades} trades · {row.winRate}% win rate · {formatCurrency(row.expectancy)} expectancy</p>
              </div>
              <p className={row.profitLoss >= 0 ? "font-semibold text-profit" : "font-semibold text-loss"}>{formatCurrency(row.profitLoss)}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
              <div className={`h-full rounded-full ${row.profitLoss >= 0 ? "bg-profit" : "bg-loss"}`} style={{ width: `${Math.max(8, (Math.abs(row.profitLoss) / maxAbs) * 100)}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function InsightsBox() {
  const insights = [
    "Your best performance comes during London session with XAUUSD.",
    "Most losses happen after two consecutive losing trades.",
    "Trades marked as FOMO have a negative expectancy.",
    "You are profitable when rule compliance is above 85%."
  ];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-5 w-5 text-profit" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/[0.55]">AI-style Insights</p>
          <h2 className="text-xl font-semibold">Mock coaching readout</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight} className="rounded-[1.5rem] border border-white/10 bg-white/[0.075] p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-profit" />
              <p className="text-sm leading-6 text-white/[0.72]">{insight}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function calculateOverview(trades: Trade[]) {
  const closedTrades = trades.filter((trade) => trade.result !== "Open");
  const wins = closedTrades.filter((trade) => trade.profitLoss > 0);
  const losses = closedTrades.filter((trade) => trade.profitLoss < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profitLoss, 0));
  const netProfit = closedTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const equity = buildEquityData(closedTrades).map((item) => item.balance);

  return {
    netProfit,
    winRate: closedTrades.length ? Math.round((wins.length / closedTrades.length) * 100) : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? grossProfit : 0,
    averageRr: closedTrades.length ? Number((closedTrades.reduce((sum, trade) => sum + trade.rr, 0) / closedTrades.length).toFixed(1)) : 0,
    averageWin: wins.length ? grossProfit / wins.length : 0,
    averageLoss: losses.length ? losses.reduce((sum, trade) => sum + trade.profitLoss, 0) / losses.length : 0,
    maxDrawdown: calculateMaxDrawdown(equity)
  };
}

function buildEquityData(trades: Trade[]) {
  let balance = 10000;
  return [...trades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((trade) => {
      balance += trade.profitLoss;
      return { date: trade.date, balance, profitLoss: trade.profitLoss };
    });
}

function groupByInstrument(trades: Trade[]) {
  return ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30", "BTCUSD"].map((instrument) => {
    const rows = trades.filter((trade) => trade.instrument === instrument);
    return {
      instrument,
      trades: rows.length,
      profitLoss: rows.reduce((sum, trade) => sum + trade.profitLoss, 0)
    };
  });
}

function groupBySession(trades: Trade[]) {
  return ["Asia", "London", "New York"].map((session) => {
    const rows = trades.filter((trade) => trade.session === session);
    const wins = rows.filter((trade) => trade.profitLoss > 0).length;
    return {
      session,
      trades: rows.length,
      profitLoss: rows.reduce((sum, trade) => sum + trade.profitLoss, 0),
      winRate: rows.length ? Math.round((wins / rows.length) * 100) : 0
    };
  });
}

function groupByStrategy(trades: Trade[]): StrategyPerformance[] {
  const strategies = Array.from(new Set(trades.map((trade) => trade.strategy || "Manual entry")));

  return strategies.map((strategy) => {
    const rows = trades.filter((trade) => (trade.strategy || "Manual entry") === strategy);
    const closedRows = rows.filter((trade) => trade.result !== "Open");
    const wins = closedRows.filter((trade) => trade.profitLoss > 0).length;

    return {
      name: strategy,
      trades: rows.length,
      winRate: closedRows.length ? Math.round((wins / closedRows.length) * 100) : 0,
      netProfit: rows.reduce((sum, trade) => sum + trade.profitLoss, 0),
      averageRr: rows.length ? Number((rows.reduce((sum, trade) => sum + trade.rr, 0) / rows.length).toFixed(1)) : 0,
      compliance: rows.length ? Math.round((rows.filter((trade) => trade.ruleFollowed).length / rows.length) * 100) : 0
    };
  });
}

function groupByEmotion(trades: Trade[]) {
  return ["Calm", "Fear", "Greed", "FOMO", "Revenge", "Anxious", "Confident"].map((emotion) => {
    const rows = trades.filter((trade) => trade.emotion === emotion);
    const profitLoss = rows.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const wins = rows.filter((trade) => trade.profitLoss > 0).length;
    return {
      emotion,
      trades: rows.length,
      profitLoss,
      expectancy: rows.length ? profitLoss / rows.length : 0,
      winRate: rows.length ? Math.round((wins / rows.length) * 100) : 0
    };
  });
}

function buildPerformanceHeatmap(trades: Trade[]): PerformanceHeatmapData {
  const dayOrder = [
    { index: 1, label: "Mon", name: "Monday" },
    { index: 2, label: "Tue", name: "Tuesday" },
    { index: 3, label: "Wed", name: "Wednesday" },
    { index: 4, label: "Thu", name: "Thursday" },
    { index: 5, label: "Fri", name: "Friday" },
    { index: 6, label: "Sat", name: "Saturday" },
    { index: 0, label: "Sun", name: "Sunday" }
  ];

  const days = dayOrder.map((day) => {
    const rows = trades.filter((trade) => getTradeWeekday(trade.date) === day.index);
    const profitLoss = rows.reduce((sum, trade) => sum + trade.profitLoss, 0);
    return {
      averageProfitLoss: rows.length ? profitLoss / rows.length : 0,
      day: day.label,
      profitLoss,
      trades: rows.length
    };
  });

  const sessions = Array.from(new Set(trades.map((trade) => trade.session || "Unknown")))
    .sort((first, second) => sessionSortOrder(first) - sessionSortOrder(second) || first.localeCompare(second))
    .map((session) => {
      const rows = trades.filter((trade) => (trade.session || "Unknown") === session);
      const closedRows = rows.filter((trade) => trade.result !== "Open");
      const wins = closedRows.filter((trade) => trade.profitLoss > 0).length;

      return {
        profitLoss: rows.reduce((sum, trade) => sum + trade.profitLoss, 0),
        session,
        trades: rows.length,
        winRate: closedRows.length ? Math.round((wins / closedRows.length) * 100) : 0
      };
    });

  const bestDay = days.reduce((winner, day) => (
    day.trades && day.averageProfitLoss > winner.averageProfitLoss ? day : winner
  ), { averageProfitLoss: Number.NEGATIVE_INFINITY, day: "", profitLoss: 0, trades: 0 });
  const bestDayName = dayOrder.find((day) => day.label === bestDay.day)?.name ?? bestDay.day;
  const bestSession = sessions.reduce((winner, session) => (
    session.trades && session.winRate > winner.winRate ? session : winner
  ), { profitLoss: 0, session: "", trades: 0, winRate: -1 });

  return {
    dayInsight: bestDay.trades
      ? `Your best day is ${bestDayName} with ${formatCurrency(bestDay.averageProfitLoss)} avg P&L.`
      : "Add trades to reveal your best trading day.",
    days,
    sessionInsight: bestSession.trades
      ? `${bestSession.session} session has your highest win rate at ${bestSession.winRate}%.`
      : "Add trades to reveal your strongest trading session.",
    sessions: sessions.length ? sessions : [{ profitLoss: 0, session: "No sessions yet", trades: 0, winRate: 0 }]
  };
}

function getTradeWeekday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getDay();
}

function sessionSortOrder(session: string) {
  const order: Record<string, number> = {
    Asia: 1,
    Asian: 1,
    London: 2,
    "New York": 3
  };

  return order[session] ?? 99;
}

function heatmapColorStyle(value: number, maxAbs: number) {
  if (value === 0) {
    return {
      backgroundColor: "rgba(113, 113, 122, 0.1)",
      borderColor: "rgba(113, 113, 122, 0.26)"
    };
  }

  const intensity = Math.min(1, Math.abs(value) / maxAbs);
  const alpha = 0.16 + intensity * 0.34;

  return value > 0
    ? {
        backgroundColor: `rgba(23, 162, 105, ${alpha})`,
        borderColor: `rgba(23, 162, 105, ${0.32 + intensity * 0.42})`
      }
    : {
        backgroundColor: `rgba(239, 68, 68, ${alpha})`,
        borderColor: `rgba(239, 68, 68, ${0.32 + intensity * 0.42})`
      };
}

function calculateMaxDrawdown(equity: number[]) {
  let peak = equity[0] ?? 10000;
  let maxDrawdown = 0;

  equity.forEach((value) => {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value - peak);
  });

  return maxDrawdown;
}

function buildLinePoints(values: number[]) {
  if (!values.length) {
    return "0,50 100,50";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 86 - 7;
      return `${x},${y}`;
    })
    .join(" ");
}

function severityClass(severity: Mistake["severity"]) {
  if (severity === "High") return "bg-loss/[0.12] text-loss";
  if (severity === "Medium") return "bg-amber-400/[0.16] text-amber-600 dark:text-amber-300";
  return "bg-zinc-500/10 text-muted";
}

function toneClass(tone: "profit" | "loss" | "neutral") {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  return "text-ink";
}
