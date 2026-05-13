"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getUserProfile, profileDefaultsForUser, type UserProfile } from "@/lib/user-profile";

export function useUserProfile() {
  const { currentUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDefaults, setIsUsingDefaults] = useState(false);

  const fallbackProfile = useMemo<UserProfile | null>(() => {
    if (!currentUser) {
      return null;
    }

    return profileDefaultsForUser({
      fullName: currentUser.displayName,
      email: currentUser.email
    });
  }, [currentUser]);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      setIsUsingDefaults(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const savedProfile = await getUserProfile(currentUser.uid);
      if (savedProfile) {
        setProfile(savedProfile);
        setIsUsingDefaults(false);
      } else {
        setProfile(profileDefaultsForUser({ fullName: currentUser.displayName, email: currentUser.email }));
        setIsUsingDefaults(true);
      }
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to load profile settings.");
      setProfile(fallbackProfile);
      setIsUsingDefaults(Boolean(fallbackProfile));
    } finally {
      setLoading(false);
    }
  }, [currentUser, fallbackProfile]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    void refresh();
  }, [authLoading, refresh]);

  return {
    profile: profile ?? fallbackProfile,
    loading: authLoading || loading,
    error,
    isUsingDefaults,
    refresh
  };
}
