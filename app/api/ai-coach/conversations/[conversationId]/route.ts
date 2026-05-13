import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { deleteConversation } from "@/lib/ai-coach-server";
import { verifyFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    await deleteConversation(decodedToken.uid, params.conversationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Delete AI Coach conversation failed", "Unable to delete this conversation.");
  }
}
