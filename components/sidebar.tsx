"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  CalendarDays,
  CreditCard,
  Crown,
  FileText,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  Settings,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";
import { useUserProfile } from "@/components/user-profile-provider";
import { useUserTrades } from "@/hooks/use-user-trades";
import { calculateDailyRiskStatus, riskSettingsFromProfile, type RiskLevel } from "@/lib/risk";

export const navItems = [
  { label: "Dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Calendar", labelKey: "nav.calendar", icon: CalendarDays, href: "/calendar" },
  { label: "Trades", labelKey: "nav.trades", icon: WalletCards, href: "/trades" },
  { label: "Analytics", labelKey: "nav.analytics", icon: BarChart3, href: "/analytics" },
  { label: "Risk Manager", labelKey: "nav.riskManager", icon: ShieldCheck, href: "/risk-manager" },
  { label: "Expenses", labelKey: "nav.expenses", icon: CreditCard, href: "/expenses" },
  { label: "AI Coach", labelKey: "nav.aiCoach", icon: Bot, href: "/ai-coach" },
  { label: "Reports", labelKey: "nav.reports", icon: FileText, href: "/reports" },
  { label: "Pricing", labelKey: "nav.pricing", icon: Crown, href: "/pricing" },
  { label: "Settings", labelKey: "nav.settings", icon: Settings, href: "/settings" }
] as const;

const adminNavItem = {
  label: "Feedback",
  icon: MessageSquareText,
  href: "/admin/feedback"
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { profile, loading: profileLoading } = useUserProfile();
  const { trades, loading: tradesLoading } = useUserTrades();
  const isLoading = profileLoading || tradesLoading;
  const settings = useMemo(() => riskSettingsFromProfile(profile), [profile]);
  const todaysTrades = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trades.filter((trade) => trade.date === today);
  }, [trades]);
  const riskStatus = useMemo(() => calculateDailyRiskStatus(todaysTrades, settings), [settings, todaysTrades]);
  const progress = calculateRiskProgress(riskStatus, settings);
  const statusMessage = getRiskStatusMessage(riskStatus);
  const tone = riskTone(riskStatus.level);
  const isAdmin = Boolean(process.env.NEXT_PUBLIC_ADMIN_UID && currentUser?.uid === process.env.NEXT_PUBLIC_ADMIN_UID);
  const visibleNavItems = isAdmin ? [...navItems, adminNavItem] : navItems;

  return (
    <aside className="hidden w-[286px] shrink-0 border-r border-white/[0.55] bg-white/[0.55] px-5 py-6 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/[0.58] lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-premium dark:bg-white dark:text-zinc-950">
          <LineChart className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold text-ink">TradeControl</p>
          <p className="text-xs font-medium text-muted">{t("brand.subtitle")}</p>
        </div>
      </div>

      <nav className="mt-9 flex flex-1 flex-col gap-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              className={`group flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium transition ${
                isActive
                  ? "bg-zinc-950 text-white shadow-premium dark:bg-white dark:text-zinc-950"
                  : "text-muted hover:bg-white/70 hover:text-ink dark:hover:bg-white/[0.08]"
              }`}
              href={item.href}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{"labelKey" in item ? t(item.labelKey) : item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`rounded-[1.5rem] border p-4 shadow-soft ${tone.card}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">{t("sidebar.riskStatus")}</p>
          <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] ${tone.badge}`}>
            {isLoading ? t("common.syncing") : riskStatus.level}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10" aria-label={`Daily risk usage ${progress}%`}>
          <div className={`h-full rounded-full transition-all duration-300 ${tone.bar}`} style={{ width: `${isLoading ? 34 : progress}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          {isLoading ? "Syncing today's trades and saved risk rules..." : statusMessage}
        </p>
      </div>
    </aside>
  );
}

type SidebarRiskStatus = ReturnType<typeof calculateDailyRiskStatus>;

function calculateRiskProgress(status: SidebarRiskStatus, settings: ReturnType<typeof riskSettingsFromProfile>) {
  const tradeUsage = safeRatio(status.tradesTaken, settings.maxTradesPerDay);
  const drawdownUsage = safeRatio(status.currentDrawdownPercent, settings.maxDailyLoss);
  const lossUsage = safeRatio(status.consecutiveLosses, settings.maxConsecutiveLosses);
  const profitUsage = status.dailyProfitPercent >= settings.dailyProfitTarget ? 1 : safeRatio(status.dailyProfitPercent, settings.dailyProfitTarget);
  const disciplineUsage = status.rulesFollowedPercent < 100 ? (100 - status.rulesFollowedPercent) / 100 : 0;
  const rawProgress = Math.max(tradeUsage, drawdownUsage, lossUsage, profitUsage, disciplineUsage);

  if (status.level === "danger") {
    return 100;
  }

  if (!status.tradesTaken && rawProgress === 0) {
    return 8;
  }

  return Math.min(100, Math.max(8, Math.round(rawProgress * 100)));
}

function safeRatio(value: number, limit: number) {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, value / limit));
}

function getRiskStatusMessage(status: SidebarRiskStatus) {
  if (status.stopReasons.length) {
    return `Stop trading today: ${status.stopReasons[0]}.`;
  }

  if (status.warningReasons.length) {
    return `${status.warningReasons[0]} ${status.tradesTaken} trade${status.tradesTaken === 1 ? "" : "s"} logged today.`;
  }

  if (!status.tradesTaken) {
    return "No trades logged today. Risk limits are clear before the first setup.";
  }

  return `${status.tradesTaken} trade${status.tradesTaken === 1 ? "" : "s"} today. Rules followed ${Math.round(status.rulesFollowedPercent)}%.`;
}

function riskTone(level: RiskLevel) {
  if (level === "danger") {
    return {
      badge: "bg-loss/12 text-loss",
      bar: "bg-loss",
      card: "border-loss/25 bg-loss/[0.06]"
    };
  }

  if (level === "warning") {
    return {
      badge: "bg-amber-400/15 text-amber-600 dark:text-amber-300",
      bar: "bg-amber-400",
      card: "border-amber-400/25 bg-amber-400/[0.06]"
    };
  }

  return {
    badge: "bg-profit/12 text-profit",
    bar: "bg-profit",
    card: "border-line/70 bg-surface/70"
  };
}
