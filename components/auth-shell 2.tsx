"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LineChart } from "lucide-react";
import { useAuth } from "./auth-provider";
import { useUserProfile } from "./user-profile-provider";

export function AuthShell({
  children,
  eyebrow,
  subtitle,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  const { currentUser, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profileLoading && currentUser) {
      router.replace(profile?.onboardingCompleted ? "/dashboard" : "/onboarding");
    }
  }, [currentUser, loading, profile?.onboardingCompleted, profileLoading, router]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_26%),linear-gradient(135deg,#f8fafc,#eef2f7_48%,#f8fafc)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(23,162,105,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_28%),linear-gradient(135deg,#06080c,#11141b_48%,#080a0f)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <section className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <div className="flex flex-col justify-between rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-6 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-8">
            <div>
              <Link className="flex w-fit items-center gap-3" href="/login">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-premium">
                  <LineChart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold">TradeControl</p>
                  <p className="text-xs font-medium text-white/[0.55]">Journal and risk desk</p>
                </div>
              </Link>
              <div className="mt-12">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-profit">{eyebrow}</p>
                <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-normal sm:text-5xl">{title}</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/[0.62]">{subtitle}</p>
              </div>
            </div>
            <div className="mt-10 grid gap-3 text-sm text-white/[0.66]">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.075] p-4">Secure Firebase email/password authentication.</div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.075] p-4">Your trading journal, risk desk, and coach stay behind protected routes.</div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/[0.55] bg-white/[0.78] p-5 shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
