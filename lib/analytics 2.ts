"use client";

import posthog from "posthog-js";

export type AnalyticsProperties = Record<string, boolean | number | string | null | undefined>;

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return;
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    capture_pageview: false,
    capture_exceptions: true,
    defaults: "2026-01-30",
    loaded: () => {
      initialized = true;
    }
  });
}

export function trackEvent(name: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined") {
    return;
  }

  initAnalytics();

  if (!isAnalyticsReady()) {
    return;
  }

  posthog.capture(name, sanitizeProperties(properties));
}

export function identifyUser(userId: string, properties: AnalyticsProperties) {
  if (!userId || typeof window === "undefined") {
    return;
  }

  initAnalytics();

  if (!isAnalyticsReady()) {
    return;
  }

  posthog.identify(userId, sanitizeProperties(properties));
}

export function resetAnalytics() {
  if (typeof window === "undefined" || !isAnalyticsReady()) {
    return;
  }

  posthog.reset();
}

export function trackApiFailure(context: string, error: unknown, properties?: AnalyticsProperties) {
  trackEvent("api_failure", {
    context,
    error_message: error instanceof Error ? error.message : "Unknown error",
    ...properties
  });
}

export function captureException(error: unknown) {
  if (typeof window === "undefined" || !isAnalyticsReady()) {
    return;
  }

  posthog.captureException(error);
}

function isAnalyticsReady() {
  return initialized && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

function sanitizeProperties(properties?: AnalyticsProperties) {
  if (!properties) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (value === undefined) return false;
      const lowerKey = key.toLowerCase();
      return !lowerKey.includes("password") && !lowerKey.includes("secret") && !lowerKey.includes("token");
    })
  );
}
