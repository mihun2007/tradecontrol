import { NextRequest, NextResponse } from "next/server";
import { getEnvironmentStatus, isWebhookConfigured } from "@/lib/env";
import { getAdminDb, getAdminStorage, verifyFirebaseUser } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const checks = [];
  let authenticated = false;

  try {
    await verifyFirebaseUser(request);
    authenticated = true;
  } catch {
    return NextResponse.json({
      checks: [
        { label: "Authentication working", ok: false, detail: "Sign in before opening the production checklist." },
        ...getEnvironmentStatus().map((item) => ({
          label: `${item.key} (${item.scope})`,
          ok: item.configured,
          detail: item.configured ? "Configured" : "Missing"
        }))
      ]
    }, { status: 401 });
  }

  checks.push({ label: "Authentication working", ok: authenticated, detail: "Firebase ID token verified by Admin SDK." });

  try {
    await getAdminDb().collection("users").limit(1).get();
    checks.push({ label: "Firestore connected", ok: true, detail: "Admin SDK can query Firestore." });
  } catch {
    checks.push({ label: "Firestore connected", ok: false, detail: "Admin SDK could not query Firestore." });
  }

  try {
    await getAdminStorage().bucket().exists();
    checks.push({ label: "Storage connected", ok: true, detail: "Admin SDK can reach the configured storage bucket." });
  } catch {
    checks.push({ label: "Storage connected", ok: false, detail: "Admin SDK could not reach Storage." });
  }

  try {
    await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID_PRO_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || "");
    checks.push({ label: "Stripe connected", ok: true, detail: "Stripe secret key and Pro price are valid." });
  } catch {
    checks.push({ label: "Stripe connected", ok: false, detail: "Stripe secret key or Pro price check failed." });
  }

  checks.push({ label: "Webhook configured", ok: isWebhookConfigured(), detail: isWebhookConfigured() ? "STRIPE_WEBHOOK_SECRET is set." : "Set STRIPE_WEBHOOK_SECRET in Vercel." });
  checks.push({ label: "Subscription sync ready", ok: isWebhookConfigured(), detail: "Requires Stripe webhooks for checkout, subscription updates, deletes, and invoice events." });

  return NextResponse.json({
    checks: [
      ...checks,
      ...getEnvironmentStatus().map((item) => ({
        label: `${item.key} (${item.scope})`,
        ok: item.configured,
        detail: item.configured ? "Configured" : "Missing"
      }))
    ]
  });
}
