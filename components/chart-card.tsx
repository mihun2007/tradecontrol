"use client";

import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState, type PointerEvent } from "react";
import { buildDailyProfitBuckets, buildEquityCurve, buildLinePoints } from "@/lib/equity";
import { formatCurrency, type Trade } from "@/lib/trades";

type ChartCardProps = {
  currency?: string;
  loading?: boolean;
  trades?: Trade[];
};

export function ChartCard({ currency = "USD", loading = false, trades = [] }: ChartCardProps) {
  const curve = buildEquityCurve(trades);
  const values = [curve.startingBalance, ...curve.points.map((point) => point.balance)];
  const linePoints = buildLinePoints(values);
  const linePointPairs = linePoints.split(" ");
  const chartCoordinates = linePointPairs.map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });
  const areaPath = chartCoordinates.length
    ? `M ${linePointPairs.join(" L ")} L ${chartCoordinates[chartCoordinates.length - 1].x},94 L ${chartCoordinates[0].x},94 Z`
    : "";
  const weeklyBuckets = buildDailyProfitBuckets(trades);
  const isPositive = curve.netProfit >= 0;
  const hasTrades = curve.points.length > 0;
  const TrendIcon = curve.netProfit > 0 ? TrendingUp : curve.netProfit < 0 ? TrendingDown : Minus;
  const tradesById = useMemo(() => new Map(trades.map((trade) => [trade.id, trade])), [trades]);
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);
  const tooltip = hoveredPoint ? buildTooltipData(hoveredPoint.index, curve, tradesById, currency) : null;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!chartCoordinates.length) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const nearestIndex = chartCoordinates.reduce((bestIndex, coordinate, index) => {
      const bestDistance = Math.abs(chartCoordinates[bestIndex].x - pointerXPercent);
      const nextDistance = Math.abs(coordinate.x - pointerXPercent);
      return nextDistance < bestDistance ? index : bestIndex;
    }, 0);
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;

    setHoveredPoint({
      index: nearestIndex,
      x: Math.max(0, Math.min(rect.width, nextX)),
      y: Math.max(0, Math.min(rect.height, nextY))
    });
  }

  return (
    <article className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-muted">Weekly Performance</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">Equity curve</h3>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${isPositive ? "border-profit/20 bg-profit/10 text-profit" : "border-loss/20 bg-loss/10 text-loss"}`}>
          <TrendIcon className="h-4 w-4" />
          {formatCurrency(curve.netProfit, currency)}
        </div>
      </div>

      <div className="mt-7 h-[240px] rounded-[1.5rem] border border-line/60 bg-gradient-to-b from-zinc-50/80 to-white/30 p-4 dark:from-white/[0.06] dark:to-transparent sm:h-[300px]">
        {loading ? (
          <div className="h-full animate-pulse rounded-[1rem] bg-line/30" />
        ) : hasTrades ? (
          <div
            className="relative h-full w-full overflow-hidden rounded-[1rem]"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoveredPoint(null)}
          >
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Equity curve from ${curve.points.length} trades`}>
              <defs>
                <linearGradient id="equityLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
                <linearGradient id="equityArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#17a269" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#17a269" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[12, 31, 50, 69, 88].map((y) => (
                <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-line/60" strokeWidth="0.35" />
              ))}
              <path d={areaPath} fill="url(#equityArea)" />
              <polyline fill="none" points={linePoints} stroke="rgba(23,162,105,0.18)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <polyline fill="none" points={linePoints} stroke="url(#equityLine)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {hoveredPoint && chartCoordinates[hoveredPoint.index] ? (
              <>
                <span
                  className="pointer-events-none absolute inset-y-0 w-px bg-profit/35"
                  style={{ left: `${chartCoordinates[hoveredPoint.index].x}%` }}
                />
                <span
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-profit shadow-[0_0_0_6px_rgba(34,197,94,0.16)] dark:border-zinc-950"
                  style={{
                    left: `${chartCoordinates[hoveredPoint.index].x}%`,
                    top: `${chartCoordinates[hoveredPoint.index].y}%`
                  }}
                />
              </>
            ) : null}
            {values.length <= 25
              ? values.map((value, index) => {
                  const coordinate = chartCoordinates[index];
                  const point = curve.points[index - 1];
                  const isLoss = Boolean(point && point.profitLoss < 0);
                  return (
                    <span
                      key={`${value}-${index}`}
                      className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/75 shadow-[0_0_0_5px_rgba(23,162,105,0.12)] dark:border-zinc-950/80 ${isLoss ? "bg-loss shadow-[0_0_0_5px_rgba(227,80,80,0.14)]" : "bg-profit"}`}
                      style={{ left: `${coordinate.x}%`, top: `${coordinate.y}%` }}
                    />
                  );
                })
              : null}
            {hoveredPoint && tooltip ? (
              <div
                className="pointer-events-none absolute z-20 w-64 rounded-2xl border border-line/70 bg-white/95 p-3 text-ink shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95"
                style={{
                  left: hoveredPoint.x,
                  top: hoveredPoint.y,
                  transform: `translate(${hoveredPoint.x > 240 ? "calc(-100% - 14px)" : "14px"}, ${hoveredPoint.y > 150 ? "calc(-100% - 14px)" : "14px"})`
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted">{tooltip.dateLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{tooltip.title}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${tooltip.profitLoss >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>
                    {formatCurrency(tooltip.profitLoss, currency)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {tooltip.rows.map((row) => (
                    <div key={row.label} className="rounded-xl border border-line/50 bg-surface/60 px-2.5 py-2">
                      <p className="font-semibold text-muted">{row.label}</p>
                      <p className="mt-1 truncate font-bold text-ink">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-muted">
              <Activity className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">No trades yet</p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-muted">Save any trade with profit or loss and the equity curve will update automatically.</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-7">
        {weeklyBuckets.map((day) => {
          const tone = day.profitLoss > 0 ? "text-profit" : day.profitLoss < 0 ? "text-loss" : "text-muted";

          return (
            <div key={day.date} className="rounded-2xl border border-line/60 bg-surface/[0.55] px-3 py-2">
              <p className="text-muted">{day.label}</p>
              <p className={`mt-1 font-semibold ${tone}`}>{formatCurrency(day.profitLoss, currency)}</p>
              <p className="mt-1 text-xs text-muted">{day.trades} trades</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function buildTooltipData(index: number, curve: ReturnType<typeof buildEquityCurve>, tradesById: Map<string, Trade>, currency: string) {
  if (index === 0) {
    return {
      dateLabel: "Starting point",
      title: "Initial balance",
      profitLoss: 0,
      rows: [
        { label: "Balance", value: formatCurrency(curve.startingBalance, currency) },
        { label: "Trades", value: "0" },
        { label: "Net P/L", value: formatCurrency(0, currency) },
        { label: "Status", value: "Before first trade" }
      ]
    };
  }

  const point = curve.points[index - 1];
  const trade = point ? tradesById.get(point.tradeId) : undefined;
  const dateLabel = formatTradeDate(point?.date);

  return {
    dateLabel,
    title: trade ? `${trade.instrument} · ${trade.tradeType} · ${trade.result}` : "Trade update",
    profitLoss: point?.profitLoss ?? 0,
    rows: [
      { label: "Balance", value: formatCurrency(point?.balance ?? curve.startingBalance, currency) },
      { label: "Session", value: trade?.session ?? "N/A" },
      { label: "Strategy", value: trade?.strategy || "N/A" },
      { label: "RR", value: trade?.rr ? `${trade.rr}:1` : "N/A" }
    ]
  };
}

function formatTradeDate(date?: string) {
  if (!date) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}
