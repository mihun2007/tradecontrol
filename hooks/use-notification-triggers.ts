"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { trackEvent } from "@/lib/analytics";
import type { DailyReview } from "@/lib/daily-reviews";
import { evaluateNotificationTriggers } from "@/lib/notifications";
import type { Trade } from "@/lib/trades";
import type { UserProfile } from "@/lib/user-profile";

const triggerStorageKey = "tradecontrol-notification-triggers";

export function useNotificationTriggers({
  profile,
  reviews,
  trades
}: {
  profile: UserProfile | null;
  reviews: DailyReview[];
  trades: Trade[];
}) {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || !profile) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const hasDailyReview = reviews.some((review) => review.date === today);
    const completed = readCompletedTriggers();
    const triggers = evaluateNotificationTriggers({
      hasDailyReview,
      profile,
      trades,
      userId: currentUser.uid
    }).filter((trigger) => !completed.has(trigger.key));

    if (!triggers.length) {
      return;
    }

    let cancelled = false;

    async function runTriggers() {
      for (const trigger of triggers) {
        if (cancelled) {
          return;
        }

        try {
          await trigger.run();
          if (trigger.key.includes("stop-loss")) {
            trackEvent("risk_limit_hit", { trigger_key: trigger.key });
          }
          if (trigger.key.includes("max-trades")) {
            trackEvent("overtrading_detected", { trigger_key: trigger.key });
          }
          if (trigger.key.includes("rule-break")) {
            trackEvent("rule_violation_detected", { trigger_key: trigger.key });
          }
          completed.add(trigger.key);
          writeCompletedTriggers(completed);
        } catch {
          completed.add(trigger.key);
          writeCompletedTriggers(completed);
        }
      }
    }

    void runTriggers();

    return () => {
      cancelled = true;
    };
  }, [currentUser, profile, reviews, trades]);
}

function readCompletedTriggers() {
  try {
    const stored = window.localStorage.getItem(triggerStorageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeCompletedTriggers(value: Set<string>) {
  window.localStorage.setItem(triggerStorageKey, JSON.stringify(Array.from(value).slice(-120)));
}
