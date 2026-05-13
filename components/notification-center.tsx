"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { useUserNotifications } from "@/hooks/use-user-notifications";
import type { Notification, NotificationType } from "@/lib/notifications";

const typeStyles: Record<NotificationType, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "bg-sky-500/10 text-sky-500 dark:text-sky-300" },
  success: { icon: CheckCircle2, className: "bg-profit/10 text-profit" },
  warning: { icon: AlertTriangle, className: "bg-amber-400/10 text-amber-600 dark:text-amber-300" },
  danger: { icon: ShieldAlert, className: "bg-loss/10 text-loss" }
};

export function NotificationCenter() {
  const { notifications, loading, markRead, unreadCount } = useUserNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarkRead(notification: Notification) {
    if (notification.read) {
      return;
    }

    await markRead(notification.id);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-surface"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-loss px-1.5 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={`absolute right-0 top-12 z-50 w-[min(calc(100vw-2rem),24rem)] origin-top-right rounded-[1.5rem] border border-white/[0.55] bg-white/[0.96] p-3 shadow-premium backdrop-blur-2xl transition duration-150 dark:border-white/10 dark:bg-zinc-950/[0.96] ${
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line/60 px-2 pb-3">
          <div>
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <p className="text-xs font-medium text-muted">
              {unreadCount ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}` : "All caught up"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 max-h-[26rem] overflow-y-auto pr-1">
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-surface/70" />
              ))}
            </div>
          ) : notifications.length ? (
            <div className="grid gap-2">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-line/60 bg-surface/[0.55] p-5 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                <Bell className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">No notifications yet</p>
              <p className="mt-1 text-xs leading-5 text-muted">Risk warnings, reminders, and weekly reports will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead
}: {
  notification: Notification;
  onMarkRead: (notification: Notification) => Promise<void>;
}) {
  const style = typeStyles[notification.type];
  const Icon = style.icon;

  return (
    <button
      className={`w-full rounded-2xl border p-3 text-left transition hover:bg-surface ${
        notification.read ? "border-line/50 bg-surface/[0.35] opacity-75" : "border-profit/20 bg-profit/[0.06]"
      }`}
      type="button"
      onClick={() => void onMarkRead(notification)}
    >
      <div className="flex gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.className}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{notification.title}</p>
            {!notification.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-profit" /> : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{notification.message}</p>
          {notification.createdAt ? (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted/70">
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
