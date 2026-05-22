import { NextRequest, NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api-response";
import { verifyFirebaseUser } from "@/lib/firebase-admin";
import { logWarn } from "@/lib/logger";
import type { FeedbackType } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedbackWebhookPayload = {
  type?: unknown;
  rating?: unknown;
  message?: unknown;
  page?: unknown;
  userId?: unknown;
  userEmail?: unknown;
};

const typeEmojis: Record<FeedbackType, string> = {
  bug: "🐛",
  feature_request: "✨",
  general: "💬",
  praise: "👍",
  complaint: "😤"
};

const embedColors: Record<FeedbackType, number> = {
  bug: 0xe35050,
  complaint: 0xe35050,
  feature_request: 0x3b82f6,
  general: 0x3b82f6,
  praise: 0x22c55e
};

const feedbackTypes = ["bug", "feature_request", "general", "praise", "complaint"] as const;

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const payload = await request.json().catch(() => null) as FeedbackWebhookPayload | null;
    const feedback = parseFeedbackPayload(payload);

    if (!feedback) {
      return apiError("Invalid feedback payload.", 400);
    }

    if (feedback.userId !== decodedToken.uid || feedback.userEmail !== decodedToken.email) {
      return apiError("Feedback user mismatch.", 403);
    }

    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;

    if (!webhookUrl) {
      logWarn("Discord feedback webhook URL is not configured.");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const response = await fetch(webhookUrl, {
      body: JSON.stringify({
        embeds: [
          {
            title: `${typeEmojis[feedback.type]} New Feedback — TradeControl`,
            color: embedColors[feedback.type],
            fields: [
              { name: "Type", value: feedback.type, inline: true },
              { name: "Rating", value: formatRating(feedback.rating), inline: true },
              { name: "Page", value: feedback.page, inline: true },
              { name: "User", value: feedback.userEmail, inline: false },
              { name: "Message", value: feedback.message, inline: false }
            ],
            footer: { text: "TradeControl Feedback System" },
            timestamp: new Date().toISOString()
          }
        ]
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      logWarn("Discord feedback webhook failed.", {
        status: response.status,
        statusText: response.statusText
      });
      return NextResponse.json({ ok: true, discordDelivered: false });
    }

    return NextResponse.json({ ok: true, discordDelivered: true });
  } catch (error) {
    return handleApiError(error, "Discord feedback notification failed", "Unable to send feedback notification.");
  }
}

function parseFeedbackPayload(payload: FeedbackWebhookPayload | null) {
  if (!payload || !isFeedbackType(payload.type)) {
    return null;
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const page = typeof payload.page === "string" ? payload.page : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const userEmail = typeof payload.userEmail === "string" ? payload.userEmail : "";
  const rating = typeof payload.rating === "number" && Number.isInteger(payload.rating) ? payload.rating : undefined;

  if (!message || message.length > 1000 || !page || !userId || !userEmail) {
    return null;
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return null;
  }

  return {
    type: payload.type,
    rating,
    message,
    page,
    userId,
    userEmail
  };
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && feedbackTypes.includes(value as FeedbackType);
}

function formatRating(rating?: number) {
  return rating ? "⭐".repeat(rating) : "N/A";
}
