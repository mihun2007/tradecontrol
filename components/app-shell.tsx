"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LineChart } from "lucide-react";
import { useAuth } from "./auth-provider";
import { MobileSidebar } from "./mobile-sidebar";
import { useUserProfile } from "./user-profile-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { FloatingFeedbackButton } from "@/components/floating-feedback-button";
import { hasCompletedOnboardingForSession } from "@/lib/onboarding-state";

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [completedOnboardingThisSession] = useState(() => hasCompletedOnboardingForSession());
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [currentUser, loading, pathname, router]);

  useEffect(() => {
    if (!loading && !profileLoading && currentUser && !profile?.onboardingCompleted && !completedOnboardingThisSession) {
      router.replace("/onboarding");
    }
  }, [completedOnboardingThisSession, currentUser, loading, profile?.onboardingCompleted, profileLoading, router]);

  if (loading || profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] px-5 py-4 text-sm font-semibold text-ink shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <LineChart className="h-4 w-4" />
          </div>
          Loading TradeControl
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] px-5 py-4 text-sm font-semibold text-ink shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <LineChart className="h-4 w-4" />
          </div>
          Redirecting to login...
        </div>
      </main>
    );
  }

  if (!profile?.onboardingCompleted && !completedOnboardingThisSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] px-5 py-4 text-sm font-semibold text-ink shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <LineChart className="h-4 w-4" />
          </div>
          Opening onboarding...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_26%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_28%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileSidebar isOpen={isMobileSidebarOpen} onClose={closeMobileSidebar} />
        <section className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />
          <div className="mx-auto flex w-full max-w-[1540px] flex-1 flex-col gap-5 px-3 pb-8 pt-4 sm:px-5 lg:px-8">
            {children}
          </div>
        </section>
      </div>
      <FloatingFeedbackButton />
    </main>
  );
}
