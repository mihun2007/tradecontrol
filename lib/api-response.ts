import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown, context: string, fallback = "Something went wrong. Please try again.") {
  logError(context, error);

  if (error instanceof Error && error.message.includes("authorization token")) {
    return apiError("Please sign in again.", 401);
  }

  return apiError(fallback, 500);
}
