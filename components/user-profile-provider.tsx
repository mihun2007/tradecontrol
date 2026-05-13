"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

type UserProfileContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    setLoading(true);
    try {
      const nextProfile = await Promise.race([
        getUserProfile(userId),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 8000);
        })
      ]);
      setProfile(nextProfile);
    } catch {
      setProfile(null);
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

  const value = useMemo<UserProfileContextValue>(() => ({
    profile,
    loading: authLoading || loading,
    refresh
  }), [authLoading, loading, profile, refresh]);

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);

  if (!context) {
    throw new Error("useUserProfile must be used inside UserProfileProvider.");
  }

  return context;
}
