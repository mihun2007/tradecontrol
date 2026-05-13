"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getDailyReviews } from "@/lib/daily-review-service";
import type { DailyReview } from "@/lib/daily-reviews";

export function useUserDailyReviews() {
  const { currentUser, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setReviews(await getDailyReviews(currentUser.uid));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to load daily reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    void refresh();
  }, [authLoading, refresh]);

  return {
    error,
    loading: authLoading || loading,
    refresh,
    reviews
  };
}
