"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getTrades } from "@/lib/trade-service";
import type { Trade } from "@/lib/trades";

export function useUserTrades() {
  const { currentUser, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setTrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setTrades(await getTrades(currentUser.uid));
    } catch (tradeError) {
      setError(tradeError instanceof Error ? tradeError.message : "Unable to load trades.");
      setTrades([]);
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
    trades,
    loading: authLoading || loading,
    error,
    refresh
  };
}
