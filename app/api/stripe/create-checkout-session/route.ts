import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { handleApiError } from "@/lib/api-response";
import { resetUserSubscription, userRef } from "@/lib/subscription-service";
import { getAppUrl, getProMonthlyPriceId, getStripe, isMissingStripeCustomerError, isProSubscriptionStatus } from "@/lib/stripe";
import { verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const priceId = getProMonthlyPriceId();
    const ref = userRef(decodedToken.uid);
    const snapshot = await ref.get();
    const userData = snapshot.data();
    let stripeCustomerId = typeof userData?.stripeCustomerId === "string" ? userData.stripeCustomerId : "";
    const currentStatus = typeof userData?.subscriptionStatus === "string" ? userData.subscriptionStatus : "";

    if (stripeCustomerId && isProSubscriptionStatus(currentStatus)) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${appUrl}/pricing`
      }).catch(async (error: unknown) => {
        if (isMissingStripeCustomerError(error)) {
          await resetUserSubscription(decodedToken.uid);
          stripeCustomerId = "";
          return null;
        }

        throw error;
      });

      if (portalSession) {
        return NextResponse.json({ url: portalSession.url });
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: decodedToken.email,
        metadata: {
          firebaseUid: decodedToken.uid
        }
      });
      stripeCustomerId = customer.id;
      await ref.set(
        {
          email: decodedToken.email ?? userData?.email ?? "",
          stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } else {
      await stripe.customers.update(stripeCustomerId, {
        email: decodedToken.email ?? undefined,
        metadata: {
          firebaseUid: decodedToken.uid
        }
      });
    }

    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      client_reference_id: decodedToken.uid,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: {
        firebaseUid: decodedToken.uid
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          firebaseUid: decodedToken.uid
        }
      },
      success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error, "Create checkout session failed", "Unable to start Stripe Checkout.");
  }
}
