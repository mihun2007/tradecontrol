export function MonthlyProgress() {
  return (
    <article className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Monthly Progress</p>
      <h3 className="mt-1 text-xl font-semibold text-ink">Profit target</h3>
      <div className="flex min-h-[240px] flex-col items-center justify-center sm:min-h-[280px]">
        <div className="relative h-44 w-44 sm:h-52 sm:w-52">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" role="img" aria-label="Monthly progress ring at 76 percent">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-line/80" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#17a269"
              strokeDasharray="314"
              strokeDashoffset="75"
              strokeLinecap="round"
              strokeWidth="10"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">76%</p>
            <p className="mt-1 text-sm font-medium text-muted">$7,600 of $10,000</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
          <p className="text-sm text-muted">Daily average</p>
          <p className="mt-1 text-lg font-semibold text-ink">$345</p>
        </div>
        <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
          <p className="text-sm text-muted">Target left</p>
          <p className="mt-1 text-lg font-semibold text-ink">$2,400</p>
        </div>
      </div>
    </article>
  );
}
