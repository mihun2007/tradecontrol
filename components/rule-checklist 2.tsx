import { Check } from "lucide-react";

const rules = [
  "Max 3 trades per day",
  "Risk max 1% per trade",
  "Stop after 2 losses",
  "Trade only confirmed setups"
];

export function RuleChecklist() {
  return (
    <article className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Trading Rules</p>
      <h3 className="mt-1 text-xl font-semibold text-ink">Execution checklist</h3>
      <div className="mt-6 space-y-3">
        {rules.map((rule, index) => (
          <div key={rule} className="flex items-center gap-3 rounded-2xl border border-line/60 bg-surface/[0.55] p-4">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index < 3 ? "bg-profit text-white" : "bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-white/50"}`}>
              <Check className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-ink">{rule}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
