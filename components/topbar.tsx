"use client";

import { Crown, Menu, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
import { NotificationCenter } from "./notification-center";
import { useSubscription } from "./subscription-provider";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ onOpenMobileSidebar }: { onOpenMobileSidebar: () => void }) {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();
  const { isProUser } = useSubscription();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const displayName = currentUser?.displayName || currentUser?.email || "Trader";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.55] bg-white/[0.55] px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label={t("topbar.openMenu")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink shadow-soft transition hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-profit/20 lg:hidden"
            type="button"
            onClick={onOpenMobileSidebar}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted">{t("topbar.goodMorning")}, Mihun</p>
            <h2 className="truncate text-xl font-semibold tracking-normal text-ink sm:text-2xl">
              {t("topbar.tradingDashboard")}
            </h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            className={`hidden h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-bold shadow-soft backdrop-blur-xl sm:inline-flex ${
              isProUser
                ? "border-profit/25 bg-profit/[0.1] text-profit"
                : "border-line/70 bg-surface/70 text-muted"
            }`}
            href="/pricing"
          >
            <Crown className="h-4 w-4" />
            {isProUser ? t("topbar.proPlan") : t("topbar.freePlan")}
          </Link>
          <button
            aria-label={t("topbar.search")}
            className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-profit/20 sm:inline-flex"
            type="button"
          >
            <Search className="h-4 w-4" />
          </button>
          <NotificationCenter />
          <ThemeToggle />
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-profit/20 dark:bg-white dark:text-zinc-950"
            href="/trades/new"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("topbar.addTrade")}</span>
          </Link>
          <div className="relative">
            <button
              aria-label={t("topbar.openProfileMenu")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-[linear-gradient(135deg,#111827,#6b7280)] text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-profit/20 dark:border-white/10"
              type="button"
              onClick={() => setIsProfileOpen((current) => !current)}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </button>
            {isProfileOpen ? (
              <div className="absolute right-0 top-12 w-64 rounded-[1.5rem] border border-white/[0.55] bg-white/[0.92] p-3 shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/[0.92]">
                <div className="border-b border-line/60 px-2 pb-3">
                  <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                  <p className="truncate text-xs font-medium text-muted">{currentUser?.email}</p>
                </div>
                <button
                  className="mt-2 flex h-10 w-full items-center rounded-2xl px-3 text-sm font-semibold text-loss transition hover:bg-loss/[0.08]"
                  type="button"
                  onClick={handleLogout}
                >
                  {t("topbar.signOut")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
