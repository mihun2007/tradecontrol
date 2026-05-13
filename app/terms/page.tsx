import Link from "next/link";
import { FileText, Target } from "lucide-react";

const sections = [
  {
    title: "Use of the platform",
    body: "TradeControl provides software for trade journaling, analytics, risk review, expense tracking, screenshot storage, and discipline workflows. You agree to use the platform lawfully and to avoid interfering with the service or other users."
  },
  {
    title: "Subscription billing",
    body: "Paid subscriptions unlock Pro software features. Billing is handled by Stripe. Prices, billing periods, renewals, and taxes may be shown at checkout or in your billing portal."
  },
  {
    title: "Free and Pro plan limits",
    body: "The Free plan may include limits such as daily trade counts, total saved trades, limited analytics, and limited AI Coach usage. The Pro plan unlocks expanded software features such as unlimited trades, full AI Coach, advanced analytics, screenshot upload, and full calendar insights."
  },
  {
    title: "Account responsibility",
    body: "You are responsible for keeping your login credentials secure and for the activity that occurs under your account. Contact us if you believe your account has been accessed without permission."
  },
  {
    title: "No financial advice",
    body: "TradeControl is a journaling, analytics, and discipline tool. It does not provide financial advice, investment advice, buy or sell recommendations, or trading signals."
  },
  {
    title: "Limitation of liability",
    body: "TradeControl is provided as software for organizing and reviewing your own trading data. To the fullest extent allowed by law, TradeControl is not responsible for trading losses, missed profits, data-entry mistakes, platform interruptions, or decisions you make based on your own review."
  },
  {
    title: "Cancellation policy",
    body: "You may cancel a paid subscription through the billing portal when available. Cancellation stops future renewal charges, but access to paid features may continue until the end of the current billing period unless otherwise stated by Stripe or applicable law."
  },
  {
    title: "Contact placeholder",
    body: "For questions about these starter terms, contact: support@tradecontrol.example. These terms are starter templates and should be reviewed by a qualified lawyer before production use."
  }
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <LegalHeader eyebrow="Terms of Service" title="Clear rules for using TradeControl." />
        <div className="mt-8 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function LegalHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%),rgba(255,255,255,0.04)] p-6 shadow-2xl shadow-black/20 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
          <Target className="h-5 w-5" />
        </span>
        TradeControl
      </Link>
      <div className="mt-10 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Starter legal template for TradeControl. Keep this page simple for users, and have a qualified lawyer review it before relying on it in production.
          </p>
        </div>
      </div>
    </header>
  );
}
