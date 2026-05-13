import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { sendWelcomeEmail } from "@/lib/email-service";
import { verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const result = await sendWelcomeEmail(decodedToken.uid);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "Send welcome email failed", "Unable to send welcome email.");
  }
}
