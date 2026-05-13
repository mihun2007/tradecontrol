import { NextRequest, NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api-response";
import { sendFreeLimitReachedEmail } from "@/lib/email-service";
import { verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const body = await request.json().catch(() => null) as { reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length > 240) {
      return apiError("A short limit reason is required.", 400);
    }

    const result = await sendFreeLimitReachedEmail(decodedToken.uid, reason);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "Send free limit email failed", "Unable to send free limit email.");
  }
}
