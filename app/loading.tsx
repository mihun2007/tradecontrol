import { ChartLine } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] px-5 py-4 text-sm font-semibold text-ink shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <ChartLine className="h-4 w-4" />
        </div>
        Loading TradeControl
      </div>
    </main>
  );
}
