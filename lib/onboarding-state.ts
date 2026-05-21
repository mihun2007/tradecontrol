const onboardingCompletedSessionKey = "tradecontrol-onboarding-completed";

export function markOnboardingCompletedForSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(onboardingCompletedSessionKey, "true");
}

export function hasCompletedOnboardingForSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(onboardingCompletedSessionKey) === "true";
}
