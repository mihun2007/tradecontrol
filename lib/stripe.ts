import "server-only";

import Stripe from "stripe";

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true
  });
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getProMonthlyPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID_PRO_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY;

  if (!priceId) {
    throw new Error("Missing STRIPE_PRICE_ID_PRO_MONTHLY.");
  }

  return priceId;
}

export function isProSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function isMissingStripeCustomerError(error: unknown) {
  return error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing" &&
    error.param === "customer";
}
