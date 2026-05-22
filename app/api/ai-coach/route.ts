import { NextRequest, NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api-response";
import {
  AI_COACH_SYSTEM_PROMPT,
  buildCoachPrompt,
  buildTradingCoachSummary,
  getAiUsageStatus,
  getDailyUsage,
  incrementDailyUsage,
  isProPlan,
  listConversationMessages,
  listConversations,
  loadCoachData,
  normalizeTimeRange,
  saveConversationTurn
} from "@/lib/ai-coach-server";
import { verifyFirebaseUser } from "@/lib/firebase-admin";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 100;

type OpenAIResponseLike = {
  incomplete_details?: { reason?: string | null } | null;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    text?: string;
    type?: string;
  }>;
  output_text?: string;
  status?: string;
};

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const conversationId = request.nextUrl.searchParams.get("conversationId") || "";

    if (conversationId) {
      const [messages, usage] = await Promise.all([
        listConversationMessages(decodedToken.uid, conversationId),
        getAiUsageStatus(decodedToken.uid)
      ]);
      return NextResponse.json({ ...usage, messages });
    }

    const [conversations, usage] = await Promise.all([
      listConversations(decodedToken.uid),
      getAiUsageStatus(decodedToken.uid)
    ]);
    return NextResponse.json({ ...usage, conversations });
  } catch (error) {
    return handleApiError(error, "Load AI Coach conversations failed", "Unable to load AI Coach conversations.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyFirebaseUser(request);
    const body = await request.json().catch(() => null) as {
      conversationId?: unknown;
      selectedTimeRange?: unknown;
      userMessage?: unknown;
    } | null;
    const userMessage = typeof body?.userMessage === "string" ? body.userMessage.trim() : "";
    const selectedTimeRange = normalizeTimeRange(body?.selectedTimeRange);
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";

    if (!userMessage || userMessage.length > 1200) {
      return apiError("Send a message between 1 and 1200 characters.", 400);
    }

    const profileData = await loadCoachData(decodedToken.uid, "7D", true);
    const isProUser = isProPlan(profileData.profile);
    const dailyUsage = await getDailyUsage(decodedToken.uid);
    const dailyLimit = isProUser ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    if (dailyUsage >= dailyLimit) {
      return apiError(isProUser ? "AI Coach daily safety limit reached. Try again tomorrow." : "Free users get 10 AI Coach messages per day. Upgrade to Pro for more coaching.", 429);
    }

    if (!isProUser && (selectedTimeRange === "90D" || selectedTimeRange === "ALL")) {
      return apiError("90D and ALL deep analysis are Pro features. Free coaching supports 7D and 30D.", 403);
    }

    const coachData = await loadCoachData(decodedToken.uid, selectedTimeRange, isProUser);
    const summary = buildTradingCoachSummary(coachData);
    const recentMessages = conversationId ? await listConversationMessages(decodedToken.uid, conversationId) : [];
    const response = await getOpenAIClient().responses.create({
      input: buildCoachPrompt({
        effectiveRange: coachData.effectiveRange,
        isProUser,
        recentMessages: recentMessages.slice(-8),
        summary,
        userMessage
      }),
      instructions: AI_COACH_SYSTEM_PROMPT,
      max_output_tokens: isProUser ? 2200 : 1400,
      model: getOpenAIModel(),
      reasoning: { effort: "minimal" },
      store: false
    });
    const assistantContent = extractResponseText(response);

    if (!assistantContent) {
      const responseStatus = (response as OpenAIResponseLike).status || "unknown";
      const incompleteReason = (response as OpenAIResponseLike).incomplete_details?.reason || "no text output";
      if (process.env.NODE_ENV !== "production") {
        console.warn("AI Coach empty OpenAI response", { incompleteReason, responseStatus });
      }
      return apiError("AI Coach could not produce a text response. Please try again with a shorter question.", 502);
    }

    const savedConversationId = await saveTurnWithTitle({
      assistantContent,
      conversationId,
      userContent: userMessage,
      userId: decodedToken.uid
    });

    await incrementDailyUsage(decodedToken.uid);

    return NextResponse.json({
      assistantMessage: {
        content: assistantContent,
        role: "assistant"
      },
      conversationId: savedConversationId,
      dailyLimit,
      dailyUsage: dailyUsage + 1,
      effectiveTimeRange: coachData.effectiveRange,
      summary
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      return apiError("AI Coach is not configured yet. Add OPENAI_API_KEY on the server.", 503);
    }

    return handleApiError(error, "AI Coach request failed", "AI Coach is temporarily unavailable. Please try again.");
  }
}

async function saveTurnWithTitle(input: {
  assistantContent: string;
  conversationId: string;
  userContent: string;
  userId: string;
}) {
  return saveConversationTurn({
    assistantContent: input.assistantContent,
    conversationId: input.conversationId,
    title: buildConversationTitle(input.userContent),
    userContent: input.userContent,
    userId: input.userId
  });
}

function buildConversationTitle(message: string) {
  const title = message.replace(/\s+/g, " ").trim();
  return title.length > 54 ? `${title.slice(0, 51)}...` : title || "AI Coach conversation";
}

function extractResponseText(response: OpenAIResponseLike) {
  const directText = response.output_text?.trim();
  if (directText) {
    return directText;
  }

  const outputText = response.output
    ?.flatMap((item) => [
      item.text,
      ...(item.content?.map((content) => content.text) ?? [])
    ])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n\n")
    .trim();

  return outputText || "";
}
