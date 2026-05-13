import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { apiError, handleApiError } from "@/lib/api-response";
import { getAdminDb, verifyFirebaseUser } from "@/lib/firebase-admin";
import type { MonthlyReportSummary } from "@/lib/reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const snapshot = await reportsRef(decodedToken.uid).orderBy("generatedAt", "desc").limit(24).get();
    return NextResponse.json({
      reports: snapshot.docs.map((doc) => ({
        id: doc.id,
        downloadUrl: doc.data().downloadUrl || "",
        generatedAt: serializeDate(doc.data().generatedAt),
        month: Number(doc.data().month) || 1,
        summary: doc.data().summary,
        year: Number(doc.data().year) || new Date().getFullYear()
      }))
    });
  } catch (error) {
    return handleApiError(error, "Load report history failed", "Unable to load report history.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const body = await request.json().catch(() => null) as { summary?: Partial<MonthlyReportSummary> } | null;
    const summary = body?.summary;

    if (!isValidSummary(summary)) {
      return apiError("Invalid report summary.", 400);
    }

    const reference = reportsRef(decodedToken.uid).doc();
    await reference.set({
      downloadUrl: "",
      generatedAt: FieldValue.serverTimestamp(),
      month: summary.month,
      summary,
      year: summary.year
    });

    return NextResponse.json({ id: reference.id });
  } catch (error) {
    return handleApiError(error, "Save report history failed", "Unable to save report history.");
  }
}

function reportsRef(userId: string) {
  return getAdminDb().collection("users").doc(userId).collection("reports");
}

function isValidSummary(summary: Partial<MonthlyReportSummary> | undefined): summary is MonthlyReportSummary {
  return Boolean(
    summary &&
      Number.isInteger(summary.month) &&
      Number.isInteger(summary.year) &&
      typeof summary.netProfit === "number" &&
      typeof summary.winRate === "number" &&
      typeof summary.totalTrades === "number" &&
      typeof summary.realNetProfitAfterExpenses === "number"
  );
}

function serializeDate(value: DocumentData[string]) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}
