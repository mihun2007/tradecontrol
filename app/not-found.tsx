import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/[0.55] bg-white/[0.82] p-6 text-center shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-profit">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">This TradeControl page does not exist or has moved.</p>
        <Link className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium dark:bg-white dark:text-zinc-950" href="/">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
