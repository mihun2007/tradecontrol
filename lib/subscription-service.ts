import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";
import { logWarn } from "@/lib/logger";
import { getStripe, isProSubscriptionStatus } from "@/lib/stripe";

type SubscriptionPatch = {
  currentPeriodEnd?: number | null;
  isProUser: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionPlan: "free" | "pro";
  subscriptionStatus: string;
};

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null;
}

export function userRef(userId: string) {
  return getAdminDb().collection("users").doc(userId);
}

export async function updateUserSubscription(userId: string, patch: SubscriptionPatch) {
  await userRef(userId).set(
    {
      ...patch,
      currentPeriodEnd: patch.currentPeriodEnd ? Timestamp.fromMillis(patch.currentPeriodEnd * 1000) : null,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function resetUserSubscription(userId: string) {
  await userRef(userId).set(
    {
      currentPeriodEnd: null,
      isProUser: false,
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      subscriptionPlan: "free",
      subscriptionStatus: "free",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function findUserIdForStripeCustomer(customerId: string) {
  const snapshot = await getAdminDb().collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
  return snapshot.docs[0]?.id ?? null;
}

export async function resolveUserIdFromStripeObject(input: {
  customerId?: string | null;
  metadata?: Stripe.Metadata | null;
  subscriptionId?: string | null;
}) {
  if (input.metadata?.firebaseUid) {
    return input.metadata.firebaseUid;
  }

  const stripe = getStripe();

  if (input.subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
    if (subscription.metadata.firebaseUid) {
      return subscription.metadata.firebaseUid;
    }
  }

  if (input.customerId) {
    const customer = await stripe.customers.retrieve(input.customerId);
    if (!customer.deleted && customer.metadata.firebaseUid) {
      return customer.metadata.firebaseUid;
    }

    return findUserIdForStripeCustomer(input.customerId);
  }

  return null;
}

export async function syncSubscriptionToFirestore(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = await resolveUserIdFromStripeObject({
    customerId,
    metadata: subscription.metadata,
    subscriptionId: subscription.id
  });

  if (!userId) {
    logWarn(`Stripe webhook: no Firebase uid found for subscription ${subscription.id}.`);
    return;
  }

  await updateUserSubscription(userId, {
    currentPeriodEnd: getCurrentPeriodEnd(subscription),
    isProUser: isProSubscriptionStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionPlan: isProSubscriptionStatus(subscription.status) ? "pro" : "free",
    subscriptionStatus: subscription.status
  });
}
