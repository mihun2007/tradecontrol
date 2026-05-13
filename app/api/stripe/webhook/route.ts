import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { apiError } from "@/lib/api-response";
import { sendSubscriptionActivatedEmail } from "@/lib/email-service";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { getStripe, isProSubscriptionStatus } from "@/lib/stripe";
import { logError, logWarn } from "@/lib/logger";
import {
  resolveUserIdFromStripeObject,
  syncSubscriptionToFirestore,
  updateUserSubscription
} from "@/lib/subscription-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return apiError("Webhook is not configured.", 500);
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return apiError("Missing Stripe signature.", 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    logError("Stripe webhook signature verification failed", error);
    return apiError("Invalid Stripe signature.", 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoiceEvent(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError(`Stripe webhook handler failed for ${event.type}`, error);
    return apiError("Webhook handler failed.", 500);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const userId = await resolveUserIdFromStripeObject({
    customerId,
    metadata: session.metadata,
    subscriptionId
  });

  if (!userId) {
    logWarn(`Stripe webhook: no Firebase uid found for checkout session ${session.id}.`);
    return;
  }

  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await syncSubscriptionToFirestore(subscription);
    if (isProSubscriptionStatus(subscription.status)) {
      await sendSubscriptionActivatedEmail(userId);
    }
  } else {
    await updateUserSubscription(userId, {
      currentPeriodEnd: null,
      isProUser: false,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      subscriptionPlan: "free",
      subscriptionStatus: "checkout_completed"
    });
  }

  getPostHogServerClient().capture({
    distinctId: userId,
    event: "checkout_completed",
    properties: {
      stripe_customer_id: customerId,
      stripe_session_id: session.id
    }
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await syncSubscriptionToFirestore(subscription);

  if (!isProSubscriptionStatus(subscription.status)) {
    return;
  }

  const userId = await resolveUserIdFromStripeObject({
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    metadata: subscription.metadata,
    subscriptionId: subscription.id
  });

  if (userId) {
    await sendSubscriptionActivatedEmail(userId);
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  await syncSubscriptionToFirestore(subscription);

  const userId = await resolveUserIdFromStripeObject({
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    metadata: subscription.metadata,
    subscriptionId: subscription.id
  });

  if (userId) {
    getPostHogServerClient().capture({
      distinctId: userId,
      event: "subscription_cancelled",
      properties: {
        stripe_subscription_id: subscription.id
      }
    });
  }
}

async function handleInvoiceEvent(invoice: Stripe.Invoice) {
  const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;

  if (!subscriptionId) {
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToFirestore(subscription);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;

  if (!subscriptionId) {
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToFirestore(subscription);

  const userId = await resolveUserIdFromStripeObject({
    customerId: typeof invoice.customer === "string" ? invoice.customer : undefined,
    metadata: {},
    subscriptionId
  });

  if (userId) {
    getPostHogServerClient().capture({
      distinctId: userId,
      event: "payment_failed",
      properties: {
        stripe_subscription_id: subscriptionId
      }
    });
  }
}
