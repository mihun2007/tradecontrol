"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { useUserProfile } from "@/components/user-profile-provider";

type Plan = "free" | "pro";

type SubscriptionContextValue = {
  isProUser: boolean;
  loading: boolean;
  plan: Plan;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  subscriptionStatus: string;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useUserProfile();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConfirmingCheckout, setIsConfirmingCheckout] = useState(false);
  const [lastTrackedSubscriptionStatus, setLastTrackedSubscriptionStatus] = useState("");

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (authLoading || !currentUser || checkoutState !== "success" || !sessionId || isConfirmingCheckout) {
      return;
    }

    const user = currentUser;
    let cancelled = false;

    async function confirmCheckoutSession() {
      setIsConfirmingCheckout(true);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/stripe/confirm-checkout-session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId })
        });

        if (!response.ok) {
          const payload = await response.json() as { error?: string };
          throw new Error(payload.error || "Unable to confirm Stripe checkout.");
        }

        if (!cancelled) {
          trackEvent("subscription_activated", {
            checkout_session_confirmed: true,
            plan_type: "pro"
          });
          const params = new URLSearchParams(searchParams.toString());
          params.delete("checkout");
          params.delete("session_id");
          const nextUrl = params.size ? `${pathname}?${params.toString()}` : pathname;
          router.replace(nextUrl);
        }
      } catch (error) {
        trackApiFailure("stripe_checkout_confirmation", error);
        if (process.env.NODE_ENV !== "production") {
          console.error("Stripe checkout confirmation failed", error);
        }
      } finally {
        if (!cancelled) {
          setIsConfirmingCheckout(false);
        }
      }
    }

    void confirmCheckoutSession();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser, isConfirmingCheckout, pathname, router, searchParams]);

  useEffect(() => {
    const status = profile?.subscriptionStatus ?? "";
    if (!status || status === lastTrackedSubscriptionStatus) {
      return;
    }

    if (["canceled", "cancelled", "past_due", "unpaid"].includes(status)) {
      trackEvent(status === "past_due" || status === "unpaid" ? "subscription_payment_failed" : "subscription_canceled", {
        plan_type: profile?.subscriptionPlan ?? "free",
        subscription_status: status
      });
    }

    setLastTrackedSubscriptionStatus(status);
  }, [lastTrackedSubscriptionStatus, profile?.subscriptionPlan, profile?.subscriptionStatus]);

  const postStripeRoute = useCallback(async (path: string) => {
    if (!currentUser) {
      throw new Error("You must be signed in.");
    }

    const user = currentUser;
    const token = await user.getIdToken();
    try {
      const response = await fetch(path, {
        headers: {
          authorization: `Bearer ${token}`
        },
        method: "POST"
      });
      const payload = await response.json() as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        if (response.status === 409) {
          await refresh();
        }
        throw new Error(payload.error || "Stripe request failed.");
      }

      window.location.href = payload.url;
    } catch (error) {
      trackApiFailure(path.includes("checkout") ? "stripe_checkout" : "stripe_customer_portal", error);
      throw error;
    }
  }, [currentUser, refresh]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    isProUser: Boolean(profile?.isProUser),
    loading: authLoading || profileLoading || isConfirmingCheckout,
    plan: profile?.isProUser ? "pro" : "free",
    openCustomerPortal: () => postStripeRoute("/api/stripe/create-portal-session"),
    startCheckout: () => postStripeRoute("/api/stripe/create-checkout-session"),
    subscriptionStatus: profile?.subscriptionStatus ?? "free"
  }), [authLoading, isConfirmingCheckout, postStripeRoute, profile, profileLoading]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscription must be used inside SubscriptionProvider.");
  }

  return context;
}
