import Link from "next/link";
import { FileText, ShieldCheck, Target } from "lucide-react";

const sections = [
  {
    title: "Data collected",
    body: "TradeControl may collect account details, profile settings, journal entries, trade records, risk rules, analytics inputs, expense records, uploaded screenshots, and basic technical data needed to operate the service."
  },
  {
    title: "Firebase Authentication data",
    body: "Firebase Authentication may store your email address, password authentication state, user ID, display name, and login metadata needed to create and protect your account."
  },
  {
    title: "Firestore user data",
    body: "Firestore may store your profile, onboarding details, trades, rules, reviews, expenses, subscription status, and other app data you create while using TradeControl."
  },
  {
    title: "Stripe billing data",
    body: "Stripe processes billing and payment information. TradeControl may store Stripe customer IDs, subscription IDs, subscription status, and related billing metadata, but payment card details are handled by Stripe."
  },
  {
    title: "Screenshot uploads",
    body: "If you upload screenshots, those files may be stored so you can review chart context with your trades. Avoid uploading sensitive personal information that is not needed for your journal."
  },
  {
    title: "Cookies and local storage",
    body: "TradeControl may use browser storage, cookies, or similar technologies to keep you signed in, preserve settings, support Firebase and Stripe flows, and improve the app experience."
  },
  {
    title: "User rights",
    body: "You may request access, correction, export, or deletion of your personal data where applicable. Some data may be retained when required for security, legal, billing, or operational reasons."
  },
  {
    title: "Contact placeholder",
    body: "For privacy questions, contact: privacy@tradecontrol.example. This privacy policy is a starter template and should be reviewed by a qualified lawyer before production use."
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%),rgba(255,255,255,0.04)] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
              <Target className="h-5 w-5" />
            </span>
            TradeControl
          </Link>
          <div className="mt-10 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Privacy Policy</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">How TradeControl handles user data.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Starter privacy template for TradeControl. It is written plainly for users and should be reviewed by a qualified lawyer before production use.
              </p>
            </div>
          </div>
        </header>
        <div className="mt-8 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <FileText className="h-5 w-5 text-emerald-300" />
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
