const performance = [34, 48, 41, 68, 55, 82, 76, 96, 88, 112, 121, 138];
const points = performance
  .map((value, index) => {
    const x = (index / (performance.length - 1)) * 100;
    const y = 100 - ((value - 30) / 115) * 100;
    return `${x},${y}`;
  })
  .join(" ");

export function ChartCard() {
  return (
    <article className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-muted">Weekly Performance</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">Equity curve</h3>
        </div>
        <div className="rounded-full border border-line/70 bg-surface/70 px-3 py-1 text-sm font-semibold text-profit">
          +$1,238
        </div>
      </div>
      <div className="mt-7 h-[220px] rounded-[1.5rem] border border-line/60 bg-gradient-to-b from-zinc-50/80 to-white/30 p-4 dark:from-white/[0.06] dark:to-transparent sm:h-[280px]">
        <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Mock weekly performance line chart">
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-line/70" strokeWidth="0.35" />
          ))}
          <polyline fill="none" points={points} stroke="#17a269" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" points={points} stroke="rgba(23,162,105,0.16)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {["Mon", "Tue", "Wed", "Thu"].map((day, index) => (
          <div key={day} className="rounded-2xl border border-line/60 bg-surface/[0.55] px-3 py-2">
            <p className="text-muted">{day}</p>
            <p className="mt-1 font-semibold text-ink">{["+$180", "-$45", "+$420", "+$260"][index]}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
