import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { getStripe } from "@/lib/stripe";
import { resolveUserIdFromStripeObject, syncSubscriptionToFirestore } from "@/lib/subscription-service";
import { verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const { sessionId } = await request.json() as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing Stripe checkout session id." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"]
    });

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

    const sessionUserId = await resolveUserIdFromStripeObject({
      customerId,
      metadata: session.metadata,
      subscriptionId
    });

    if (!sessionUserId || sessionUserId !== decodedToken.uid) {
      return NextResponse.json({ error: "This checkout session does not belong to the current user." }, { status: 403 });
    }

    if (!subscriptionId) {
      return NextResponse.json({ error: "Stripe checkout session has no subscription attached yet." }, { status: 409 });
    }

    const subscription = typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    if (!subscription) {
      return NextResponse.json({ error: "Stripe checkout session subscription is not ready yet." }, { status: 409 });
    }

    await syncSubscriptionToFirestore(subscription);

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status
    });
  } catch (error) {
    return handleApiError(error, "Confirm checkout session failed", "Unable to confirm checkout session.");
  }
}
