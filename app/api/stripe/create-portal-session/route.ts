import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { verifyFirebaseUser } from "@/lib/firebase-admin";
import { getAppUrl, getStripe, isMissingStripeCustomerError } from "@/lib/stripe";
import { resetUserSubscription, userRef } from "@/lib/subscription-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const snapshot = await userRef(decodedToken.uid).get();
    const stripeCustomerId = snapshot.data()?.stripeCustomerId;

    if (typeof stripeCustomerId !== "string" || !stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found for this user." }, { status: 400 });
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getAppUrl()}/settings`
    }).catch(async (error: unknown) => {
      if (isMissingStripeCustomerError(error)) {
        await resetUserSubscription(decodedToken.uid);
        return null;
      }

      throw error;
    });

    if (!portalSession) {
      return NextResponse.json({
        error: "Your saved Stripe customer belongs to another Stripe mode or account. I reset your local plan state; start checkout again with the live account."
      }, { status: 409 });
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return handleApiError(error, "Create portal session failed", "Unable to open Stripe billing.");
  }
}
