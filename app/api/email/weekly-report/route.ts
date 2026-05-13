import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { sendWeeklyReportEmail } from "@/lib/email-service";
import { verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const result = await sendWeeklyReportEmail(decodedToken.uid);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "Send weekly report email failed", "Unable to send weekly report email.");
  }
}
