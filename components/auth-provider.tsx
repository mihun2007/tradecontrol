"use client";

import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth, requireFirebaseAuth } from "@/lib/firebase";
import { identifyUser, resetAnalytics, trackEvent, trackApiFailure } from "@/lib/analytics";
import { createUserProfile, profileDefaultsForUser } from "@/lib/user-profile";

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  accountType: string;
  experience: string;
};

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth?.currentUser ?? null);
  const [loading, setLoading] = useState(() => Boolean(auth && !auth.currentUser));

  useEffect(() => {
    const authInstance = auth;

    if (!authInstance) {
      setLoading(false);
      return;
    }

    let settled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!settled) {
        setCurrentUser(authInstance.currentUser);
        setLoading(false);
      }
    }, 5000);

    if (authInstance.currentUser) {
      setCurrentUser(authInstance.currentUser);
      setLoading(false);
    }

    const unsubscribe = onIdTokenChanged(authInstance, (user) => {
      settled = true;
      window.clearTimeout(fallbackTimer);
      setCurrentUser(user);
      setLoading(false);
    });

    void authInstance.authStateReady()
      .then(() => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setCurrentUser(authInstance.currentUser);
        setLoading(false);
      })
      .catch(() => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setCurrentUser(authInstance.currentUser);
        setLoading(false);
      });

    return () => {
      settled = true;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      loading,
      async login(email, password) {
        try {
          const credential = await signInWithEmailAndPassword(requireFirebaseAuth(), email, password);
          identifyUser(credential.user.uid, { email: credential.user.email });
          trackEvent("user_logged_in", { method: "email" });
        } catch (error) {
          trackApiFailure("user_login", error);
          throw error;
        }
      },
      async register(input) {
        try {
          const credential = await createUserWithEmailAndPassword(requireFirebaseAuth(), input.email, input.password);
          await updateProfile(credential.user, { displayName: input.fullName });
          await createUserProfile(
            credential.user.uid,
            profileDefaultsForUser({
              fullName: input.fullName,
              email: input.email,
              accountType: input.accountType,
              tradingExperience: input.experience
            })
          );
          identifyUser(credential.user.uid, {
            account_type: input.accountType,
            email: input.email,
            name: input.fullName,
            trading_experience: input.experience
          });
          trackEvent("user_registered", {
            account_type: input.accountType,
            method: "email",
            trading_experience: input.experience
          });
          void sendAuthenticatedEmailTrigger(credential.user, "/api/email/welcome", "welcome_email");
        } catch (error) {
          trackApiFailure("user_register", error);
          throw error;
        }
      },
      async logout() {
        trackEvent("user_logged_out");
        await signOut(requireFirebaseAuth());
        resetAnalytics();
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(requireFirebaseAuth(), email);
      }
    }),
    [currentUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function sendAuthenticatedEmailTrigger(user: User, path: string, context: string, body?: Record<string, string>) {
  try {
    const token = await user.getIdToken();
    const response = await fetch(path, {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {})
      },
      method: "POST"
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || "Email trigger failed.");
    }
  } catch (error) {
    trackApiFailure(context, error);
  }
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
