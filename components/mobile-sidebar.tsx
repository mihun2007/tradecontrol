"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { LineChart, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { navItems } from "@/components/sidebar";

export function MobileSidebar({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <button
        aria-label="Close navigation overlay"
        className={`absolute inset-0 bg-zinc-950/45 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label="Mobile navigation"
        className={`absolute left-0 top-0 flex h-full w-[min(86vw,22rem)] flex-col border-r border-white/[0.55] bg-white/[0.94] p-5 shadow-premium backdrop-blur-2xl transition-transform duration-200 ease-out dark:border-white/10 dark:bg-zinc-950/[0.96] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-premium dark:bg-white dark:text-zinc-950">
              <LineChart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-ink">TradeControl</p>
              <p className="truncate text-xs font-medium text-muted">{t("brand.subtitle")}</p>
            </div>
          </Link>
          <button
            aria-label="Close menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink shadow-soft transition hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-profit/20"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-8 grid gap-1 overflow-y-auto pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-profit/20 ${
                  isActive
                    ? "bg-zinc-950 text-white shadow-premium dark:bg-white dark:text-zinc-950"
                    : "text-muted hover:bg-surface hover:text-ink"
                }`}
                href={item.href}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[1.5rem] border border-line/70 bg-surface/70 p-4 shadow-soft">
          <p className="text-sm font-semibold text-ink">{t("sidebar.mobileReady")}</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            {t("sidebar.mobileReadyDetail")}
          </p>
        </div>
      </aside>
    </div>
  );
}
