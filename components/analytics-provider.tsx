"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useSubscription } from "@/components/subscription-provider";
import { useUserProfile } from "@/components/user-profile-provider";
import { identifyUser, initAnalytics, resetAnalytics, trackEvent } from "@/lib/analytics";

const trackedPages: Record<string, string> = {
  "/ai-coach": "ai-coach",
  "/analytics": "analytics",
  "/calendar": "calendar",
  "/dashboard": "dashboard",
  "/pricing": "pricing",
  "/reports": "reports",
  "/settings": "settings",
  "/trades": "trades"
};

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const { plan, subscriptionStatus } = useSubscription();
  const lastPageRef = useRef("");
  const lastUserRef = useRef<string | null>(null);

  const pageName = useMemo(() => {
    const match = Object.entries(trackedPages).find(([route]) => pathname === route || pathname.startsWith(`${route}/`));
    return match?.[1] ?? (pathname.replace(/^\//, "") || "landing");
  }, [pathname]);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const urlKey = `${pathname}?${searchParams.toString()}`;
    if (lastPageRef.current === urlKey) {
      return;
    }

    lastPageRef.current = urlKey;
    trackEvent("$pageview", {
      page: pageName,
      path: pathname,
      plan,
      plan_type: plan,
      subscription_status: subscriptionStatus
    });

    if (trackedPages[pathname]) {
      trackEvent(`${trackedPages[pathname]}_viewed`, {
        plan,
        plan_type: plan,
        subscription_status: subscriptionStatus
      });
    }
  }, [pageName, pathname, plan, searchParams, subscriptionStatus]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      if (lastUserRef.current) {
        resetAnalytics();
        lastUserRef.current = null;
      }
      return;
    }

    lastUserRef.current = currentUser.uid;
    identifyUser(currentUser.uid, {
      account_type: profile?.accountType,
      email: currentUser.email || profile?.email || null,
      plan_type: plan,
      subscription_status: subscriptionStatus,
      trading_experience: profile?.tradingExperience
    });
  }, [authLoading, currentUser, plan, profile?.accountType, profile?.email, profile?.tradingExperience, subscriptionStatus]);

  return <>{children}</>;
}
