import { NextRequest, NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api-response";
import { getAdminDb, verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const decodedToken = await verifyFirebaseUser(request);

    if (!params.reportId) {
      return apiError("Report id is required.", 400);
    }

    await getAdminDb()
      .collection("users")
      .doc(decodedToken.uid)
      .collection("reports")
      .doc(params.reportId)
      .delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Delete report history failed", "Unable to delete report history item.");
  }
}
