"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JsonLd } from "@/components/json-ld";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  Camera,
  Check,
  CircleDollarSign,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";

const features = [
  ["Trading Journal", "Log setups, screenshots, notes, and post-trade reflections in a repeatable trade log.", LineChart],
  ["Risk Manager", "Set rules, watch exposure, and keep risk management for traders visible before one session gets expensive.", ShieldCheck],
  ["Calendar Review", "See streaks, red days, strong sessions, and emotional patterns across your trading month.", CalendarDays],
  ["Analytics", "Review win rate, realized P&L, consistency, trade quality, and trading performance analytics.", BarChart3],
  ["AI Coach", "Use an AI trading coach to turn journal entries into feedback about mistakes, bias, and next actions.", Brain],
  ["Expense Tracking", "Track fees, tools, data, platforms, and education to understand real profit.", CircleDollarSign],
  ["Screenshot Upload", "Attach chart context to every trade so reviews stay visual and specific.", Camera],
  ["Pro Dashboard", "Bring your trading journal, risk rules, emotions, analytics, and expenses into one command center.", Sparkles],
] as const;

const problems = [
  "Traders lose control through overtrading when pressure turns a written plan into reaction.",
  "Risk rules get ignored after a loss, during a streak, or when confidence spikes.",
  "Emotions are not reviewed while the memory is still useful, so patterns stay hidden in the trade tracker.",
  "Gross P&L hides the real result after commissions, subscriptions, tools, and data.",
];

const steps = [
  "Add every trade",
  "Review risk and emotions",
  "Study performance analytics",
  "Improve trading discipline",
];

const socialProof = [
  "Prop firm traders",
  "FTMO-style challenge accounts",
  "Forex trading journal workflows",
  "Retail trade trackers"
] as const;

const faqs = [
  {
    question: "What is the best trading journal for prop firm traders?",
    answer:
      "The best trading journal for prop firm traders is one that tracks rules, risk limits, daily discipline, drawdown pressure, and performance patterns. TradeControl is built for those review habits, including FTMO-style evaluation workflows without claiming any official affiliation."
  },
  {
    question: "How do I track forex trades in a forex trading journal?",
    answer:
      "A forex trading journal should record the pair, session, setup, entry, stop loss, take profit, lot size, result, emotion, screenshots, and notes. TradeControl gives traders a structured trade log so every forex trade can be reviewed later."
  },
  {
    question: "What is trade risk management?",
    answer:
      "Trade risk management is the process of controlling position size, maximum daily loss, risk per trade, drawdown, and rule discipline before and after each trade. It helps traders avoid one bad session damaging the account."
  },
  {
    question: "Can TradeControl work as an FTMO journal?",
    answer:
      "Yes. TradeControl can be used as an FTMO journal or prop firm trading journal for tracking trades, risk limits, discipline, drawdown behavior, and review notes. It is not affiliated with FTMO."
  },
  {
    question: "How does the AI trading coach use my trade log?",
    answer:
      "The AI trading coach reviews your saved trades, emotions, rule-followed status, performance metrics, and daily reviews to surface behavioral patterns. It focuses on discipline and process, not buy or sell signals."
  }
] as const;

const testimonials = [
  {
    quote:
      "TradeControl made it obvious that my biggest losses were rule-breaking patterns, not strategy failures.",
    name: "Daniel R.",
    role: "Futures trader",
  },
  {
    quote:
      "The emotion review finally made my journal useful. I can connect my mindset to execution quality.",
    name: "Maya S.",
    role: "Swing trader",
  },
  {
    quote:
      "I needed one place for trades, costs, screenshots, and discipline. This feels built for serious review.",
    name: "Alex T.",
    role: "Options trader",
  },
];

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TradeControl",
  url: "https://tradecontrol.xyz",
  description:
    "Trading journal and AI risk desk for prop firm and retail traders. Track trades, analyze performance, get AI coaching.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan available"
  }
};

const homepageFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }))
};

function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      setReady(true);
      return;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    return onAuthStateChanged(getAuth(app), (currentUser) => {
      setUser(currentUser);
      setReady(true);
    });
  }, []);

  return { user, ready };
}

function PrimaryCta({ user, ready, children }: { user: User | null; ready: boolean; children?: string }) {
  return (
    <Link
      href={user ? "/dashboard" : "/register"}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300"
    >
      {ready ? user ? "Go to Dashboard" : children ?? "Start for free" : children ?? "Start free"}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto mt-12 max-w-6xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-emerald-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
            Discipline score 86%
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-white/10 bg-white/[0.03] p-5 lg:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">TradeControl</p>
                <p className="text-xs text-slate-400">Pro workspace</p>
              </div>
            </div>
            {["Dashboard", "Journal", "Risk", "Calendar", "Analytics"].map((item, index) => (
              <div
                key={item}
                className={`mb-2 rounded-lg px-3 py-2 text-sm ${
                  index === 0 ? "bg-emerald-400/10 text-emerald-200" : "text-slate-400"
                }`}
              >
                {item}
              </div>
            ))}
          </aside>

          <div className="p-4 sm:p-6">
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Net P&L", "+$4,820", "after expenses"],
                ["Risk kept", "92%", "rules followed"],
                ["Journaled", "41", "trades reviewed"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs text-emerald-200">{detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Equity curve</p>
                    <p className="text-xs text-slate-400">Risk-adjusted progress</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex h-44 items-end gap-2">
                  {[28, 34, 31, 45, 42, 56, 51, 64, 62, 73, 70, 82].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500/30 to-emerald-300"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="mb-3 text-sm font-medium text-white">Today&apos;s rules</p>
                  {["Max 2 losses", "No trades after tilt", "Risk under 1%"].map((rule) => (
                    <p key={rule} className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-emerald-300" />
                      {rule}
                    </p>
                  ))}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-medium text-white">AI coach note</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Your best trades followed the plan early. Late-session entries show weaker patience and lower
                    reward-to-risk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, ready } = useAuthUser();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <JsonLd data={softwareApplicationJsonLd} id="software-application-json-ld" />
      <JsonLd data={homepageFaqJsonLd} id="homepage-faq-json-ld" />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">TradeControl</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <Link href="/pricing" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Login
            </Link>
          </div>
          <PrimaryCta user={user} ready={ready}>
            Start free
          </PrimaryCta>
        </nav>
      </header>

      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-28">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
              <Target className="h-4 w-4" />
              Built for process-first traders
            </div>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Trading Journal &amp; AI Trading Coach for Traders.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Use TradeControl as your trading journal, prop firm trading journal, trade tracker, and AI trading coach
              for cleaner reviews, risk management, and better trading decisions.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCta user={user} ready={ready}>
                Start for free
              </PrimaryCta>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">The hidden leak</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Risk Management for Traders Starts Before the Next Entry.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              TradeControl gives you a structured trading journal to see the habits, costs, and emotional decisions your
              brokerage statement will never explain.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {problems.map((problem) => (
              <div key={problem} className="rounded-xl border border-white/10 bg-slate-950/70 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-400/10 text-rose-200">
                  <Target className="h-5 w-5" />
                </div>
                <p className="text-sm leading-6 text-slate-200">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Trade tracker workspace</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Track Every Trade With Precision in One Trading Journal.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, description, Icon]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/[0.03] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Review loop</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Turn Your Trade Log Into Trading Performance Analytics.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-xl border border-white/10 bg-slate-950/70 p-6">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-slate-950">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Build the habit, review the evidence, and use your trading performance analytics to improve one
                  session at a time.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Trading journal pricing</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Start Free With a Prop Firm Trading Journal That Scales.
            </h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
              <h3 className="text-2xl font-semibold text-white">Free</h3>
              <p className="mt-2 text-slate-400">For building a consistent trade tracker and journaling habit.</p>
              <p className="mt-8 text-4xl font-semibold text-white">$0</p>
              <div className="mt-8 space-y-3 text-sm text-slate-300">
                {["5 trades per day", "50 trades total", "Basic dashboard", "Limited analytics"].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-300" />
                    {item}
                  </p>
                ))}
              </div>
              <Link
                href="/pricing"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
            <div className="rounded-2xl border border-emerald-300/40 bg-slate-950 p-7 shadow-2xl shadow-emerald-950/20">
              <div className="mb-4 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Most complete
              </div>
              <h3 className="text-2xl font-semibold text-white">Pro</h3>
              <p className="mt-2 text-slate-400">For serious traders reviewing performance, risk, and behavior with deeper analytics.</p>
              <p className="mt-8 text-4xl font-semibold text-white">
                $9.99<span className="text-base font-normal text-slate-400">/month</span>
              </p>
              <div className="mt-8 space-y-3 text-sm text-slate-300">
                {["Unlimited trades", "Full AI Coach", "Advanced analytics", "Screenshot upload"].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-300" />
                    {item}
                  </p>
                ))}
              </div>
              <Link
                href="/pricing"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                View pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">As used by traders on</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Built for Prop Firm Traders, Forex Journals, and Retail Trade Logs.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-400">
            TradeControl is designed for traders who review FTMO-style challenges, funded account rules, forex trading
            journal routines, and personal trade tracker workflows. It is an independent tool and is not affiliated with
            any prop firm.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {socialProof.map((item) => (
              <span key={item} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="rounded-xl border border-white/10 bg-slate-950/70 p-6">
              <blockquote className="text-base leading-7 text-slate-200">&ldquo;{testimonial.quote}&rdquo;</blockquote>
              <figcaption className="mt-6">
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-slate-400">{testimonial.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Trading journal FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Questions About Trading Journals, Trade Trackers, and AI Coaching.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Answers for traders comparing a forex trading journal, FTMO journal workflow, risk management tool, or AI
              trading coach.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <WalletCards className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Start Your Free Trading Journal Today.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Build the review system that helps you trade with more patience, cleaner rules, stronger risk management,
            and better awareness.
          </p>
          <div className="mt-9">
            <PrimaryCta user={user} ready={ready}>
              Create free account
            </PrimaryCta>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                <Target className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">TradeControl</span>
            </Link>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              TradeControl is a journaling and discipline tool, not financial advice. Trading involves substantial risk,
              and past performance does not guarantee future results.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Product</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <a href="#features" className="block hover:text-white">
                Features
              </a>
              <Link href="/pricing" className="block hover:text-white">
                Pricing
              </Link>
              <Link href="/login" className="block hover:text-white">
                Login
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <Link href="/terms" className="block hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="block hover:text-white">
                Privacy
              </Link>
              <Link href="/disclaimer" className="block hover:text-white">
                Disclaimer
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
