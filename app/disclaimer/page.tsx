import Link from "next/link";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react";

const points = [
  "TradeControl is a journaling, analytics, and discipline tool.",
  "TradeControl does not provide financial advice, investment advice, or tax advice.",
  "TradeControl does not provide buy or sell signals.",
  "Trading involves risk, including the possible loss of capital.",
  "Past performance does not guarantee future results.",
  "Users are responsible for their own trading decisions, risk management, and compliance with applicable rules."
];

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-3xl border border-amber-300/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_55%),rgba(255,255,255,0.04)] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <Target className="h-5 w-5" />
            </span>
            TradeControl
          </Link>
          <div className="mt-10 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Trading Risk Disclaimer</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">TradeControl is not financial advice.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                This is a clear starter disclaimer for users. It should be reviewed by a qualified lawyer before production use.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/10 sm:p-8">
          <div className="grid gap-4">
            {points.map((point) => (
              <div key={point} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <p className="text-sm leading-7 text-slate-200">{point}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5 text-sm font-semibold leading-7 text-amber-100">
            Always make trading decisions independently. Use TradeControl to organize your process, not as a source of recommendations or guarantees.
          </p>
        </section>
      </div>
    </main>
  );
}
