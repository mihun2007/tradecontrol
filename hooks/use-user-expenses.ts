"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getExpenses } from "@/lib/expense-service";
import type { Expense } from "@/lib/expenses";

export function useUserExpenses() {
  const { currentUser, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setExpenses(await getExpenses(currentUser.uid));
    } catch (expenseError) {
      setError(expenseError instanceof Error ? expenseError.message : "Unable to load expenses.");
      setExpenses([]);
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
    expenses,
    loading: authLoading || loading,
    refresh
  };
}
