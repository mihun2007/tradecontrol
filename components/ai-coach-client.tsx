"use client";

import { FormEvent, KeyboardEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Lock,
  MessageSquareText,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
  Trash2,
  Zap
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useUserDailyReviews } from "@/hooks/use-user-daily-reviews";
import { useUserExpenses } from "@/hooks/use-user-expenses";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useUserTrades } from "@/hooks/use-user-trades";
import { PaywallModal } from "@/components/paywall-modal";
import { useSubscription } from "@/components/subscription-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import {
  buildCoachAnalysis,
  type CoachAnalysis
} from "@/lib/coach-analysis";
import { formatCurrency } from "@/lib/trades";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt?: string;
};

type TimeRange = "7D" | "30D" | "90D" | "ALL";

type Insight = {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
  tone: "profit" | "warning" | "loss" | "neutral";
};

const suggestedPrompts = [
  "Analyze my trading day",
  "Summarize my week",
  "Why am I losing?",
  "What mistake repeats most?",
  "Create tomorrow's discipline plan",
  "Explain risk/reward",
  "Explain overtrading",
  "Review my emotions"
];

const initialMessages: ChatMessage[] = [
  {
    id: "coach-welcome",
    role: "assistant",
    content:
      "Welcome back. I can review your discipline, emotional control, repeated mistakes, and journaling patterns. I will stay focused on process quality, not signals."
  }
];

export function AiCoachClient() {
  const { currentUser } = useAuth();
  const { isProUser } = useSubscription();
  const { reviews, loading: reviewsLoading, error: reviewsError } = useUserDailyReviews();
  const { trades, loading: tradesLoading, error: tradesError } = useUserTrades();
  const { expenses, loading: expensesLoading, error: expensesError } = useUserExpenses();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const [activeConversationId, setActiveConversationId] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [dailyLimit, setDailyLimit] = useState(isProUser ? 100 : 3);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("30D");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loading = reviewsLoading || tradesLoading || expensesLoading || profileLoading;
  const dataError = reviewsError || tradesError || expensesError || profileError;
  const analysis = useMemo(
    () => buildCoachAnalysis({ dailyReviews: reviews, expenses, profile, trades }),
    [expenses, profile, reviews, trades]
  );
  const hasPersonalData = Boolean(trades.length || reviews.length);

  const latestFocus = useMemo(() => {
    const userMessages = messages.filter((message) => message.role === "user");
    return userMessages[userMessages.length - 1]?.content || "Analyze my trading day";
  }, [messages]);

  const coachInsights = useMemo(() => buildCoachInsights(analysis, profile?.accountCurrency), [analysis, profile?.accountCurrency]);

  useEffect(() => {
    void loadConversations();
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function authFetch(path: string, init?: RequestInit) {
    if (!currentUser) {
      throw new Error("You must be signed in to use AI Coach.");
    }

    const token = await currentUser.getIdToken();
    return fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init?.headers ?? {})
      }
    });
  }

  async function loadConversations() {
    if (!currentUser) return;
    try {
      const response = await authFetch("/api/ai-coach");
      const payload = await response.json() as { conversations?: ConversationSummary[]; dailyLimit?: number; dailyUsage?: number };
      if (response.ok) {
        setConversations(payload.conversations ?? []);
        setDailyLimit(payload.dailyLimit ?? (isProUser ? 100 : 3));
        setDailyUsage(payload.dailyUsage ?? 0);
      }
    } catch {
      setConversations([]);
    }
  }

  async function loadConversation(conversationId: string) {
    setError("");
    try {
      const response = await authFetch(`/api/ai-coach?conversationId=${encodeURIComponent(conversationId)}`);
      const payload = await response.json() as { dailyLimit?: number; dailyUsage?: number; messages?: ChatMessage[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load conversation.");
      }
      setActiveConversationId(conversationId);
      setMessages(payload.messages?.length ? payload.messages : initialMessages);
      setDailyLimit(payload.dailyLimit ?? dailyLimit);
      setDailyUsage(payload.dailyUsage ?? dailyUsage);
    } catch (conversationError) {
      setError(conversationError instanceof Error ? conversationError.message : "Unable to load conversation.");
    }
  }

  async function deleteConversation(conversationId: string) {
    setError("");
    try {
      const response = await authFetch(`/api/ai-coach/conversations/${conversationId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete conversation.");
      }
      if (activeConversationId === conversationId) {
        startNewChat();
      }
      await loadConversations();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete conversation.");
    }
  }

  function startNewChat() {
    setActiveConversationId("");
    setMessages(initialMessages);
    setInput("");
    setError("");
  }

  async function submitMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    if (!isProUser && dailyUsage >= dailyLimit) {
      trackEvent("ai_limit_reached", {
        daily_limit: dailyLimit,
        daily_usage: dailyUsage,
        plan_type: "free"
      });
      setPaywallOpen(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsSending(true);
    trackEvent("ai_message_sent", {
      message_length: trimmed.length,
      plan_type: isProUser ? "pro" : "free",
      selected_time_range: selectedTimeRange
    });
    trackEvent("ai_analysis_requested", {
      is_suggested_prompt: suggestedPrompts.includes(trimmed),
      selected_time_range: selectedTimeRange
    });

    try {
      const response = await authFetch("/api/ai-coach", {
        body: JSON.stringify({
          conversationId: activeConversationId || undefined,
          selectedTimeRange,
          userMessage: trimmed
        }),
        method: "POST"
      });
      const payload = await response.json() as {
        assistantMessage?: { content: string; role: "assistant" };
        conversationId?: string;
        dailyLimit?: number;
        dailyUsage?: number;
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 429 || response.status === 403) {
          setPaywallOpen(!isProUser);
        }
        throw new Error(payload.error || "AI Coach is unavailable.");
      }

      const coachMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: payload.assistantMessage?.content || ""
      };
      if (!coachMessage.content.trim()) {
        throw new Error("AI Coach did not return a readable answer. Please try again.");
      }
      setMessages((current) => [...current, coachMessage]);
      setActiveConversationId(payload.conversationId || activeConversationId);
      setDailyLimit(payload.dailyLimit ?? dailyLimit);
      setDailyUsage(payload.dailyUsage ?? dailyUsage + 1);
      await loadConversations();
    } catch (coachError) {
      trackApiFailure("ai_coach", coachError, {
        selected_time_range: selectedTimeRange
      });
      trackEvent("ai_error", { selected_time_range: selectedTimeRange });
      setError(coachError instanceof Error ? coachError.message : "AI Coach is temporarily unavailable. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage(input);
  }

  return (
    <>
      <PaywallModal
        description="Free users get 3 AI Coach messages per day. Upgrade to Pro for unlimited local coaching and advanced insights."
        lockedFeature="AI Coach daily limit reached"
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/[0.58]">
            <Brain className="h-3.5 w-3.5 text-profit" />
            OpenAI coach
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal">AI Trading Coach</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.62]">
            Get discipline-focused feedback based on your trading journal.
          </p>
          <p className="mt-3 flex max-w-2xl items-start gap-2 text-sm font-medium leading-6 text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This coach does not provide financial advice or trading signals.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.075] px-4 py-2 text-sm font-semibold text-white/75">
          <Sparkles className="h-4 w-4 text-profit" />
          Real journal context
        </div>
      </section>

      {dataError ? (
        <section className="rounded-[1.5rem] border border-loss/30 bg-loss/[0.08] p-4 text-sm font-semibold text-loss">
          {dataError}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[1.5rem] border border-loss/30 bg-loss/[0.08] p-4 text-sm font-semibold text-loss">
          {error}
        </section>
      ) : null}

      {!loading && !hasPersonalData ? <CoachEmptyState /> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <ChatInterface
          conversations={conversations}
          dailyLimit={dailyLimit}
          dailyUsage={dailyUsage}
          input={input}
          isProUser={isProUser}
          isSending={isSending}
          loading={loading}
          messages={messages}
          onDeleteConversation={deleteConversation}
          onInput={setInput}
          onLoadConversation={loadConversation}
          onNewChat={startNewChat}
          onPrompt={submitMessage}
          onSubmit={handleSubmit}
          onTimeRange={setSelectedTimeRange}
          selectedTimeRange={selectedTimeRange}
          chatEndRef={chatEndRef}
        />
        <DailySummaryCard analysis={analysis} currency={profile?.accountCurrency} latestFocus={latestFocus} loading={loading} />
      </section>

      <section className="grid gap-4">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted">Weekly Coach Insights</p>
            <h2 className="text-xl font-semibold text-ink">Patterns worth respecting</h2>
          </div>
          <span className="w-fit rounded-full border border-line/70 bg-surface/70 px-3 py-1 text-xs font-bold text-muted">Local Firestore analysis</span>
        </div>
        {!isProUser ? (
          <CoachUpgradeBanner onUpgrade={() => setPaywallOpen(true)} />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {coachInsights.map((insight) => (
            <InsightCard key={insight.label} insight={insight} />
          ))}
        </div>
      </section>

      <DisclaimerCard />
    </>
  );
}

function CoachUpgradeBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-premium">
            <Lock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/[0.55]">Weekly Coach Insights</p>
            <h3 className="mt-1 text-xl font-semibold leading-tight">Advanced Coach Insights are Pro</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Free users get basic coaching and 3 messages per day. Pro unlocks advanced insight cards generated from trades, reviews, expenses, and settings.
            </p>
          </div>
        </div>
        <button className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 shadow-premium transition hover:-translate-y-0.5" type="button" onClick={onUpgrade}>
          <Sparkles className="h-4 w-4" />
          Upgrade
        </button>
      </div>
    </section>
  );
}

function ChatInterface({
  chatEndRef,
  conversations,
  dailyLimit,
  dailyUsage,
  input,
  isProUser,
  isSending,
  loading,
  messages,
  onDeleteConversation,
  onInput,
  onLoadConversation,
  onNewChat,
  onPrompt,
  onSubmit,
  onTimeRange,
  selectedTimeRange
}: {
  chatEndRef: RefObject<HTMLDivElement>;
  conversations: ConversationSummary[];
  dailyLimit: number;
  dailyUsage: number;
  input: string;
  isProUser: boolean;
  isSending: boolean;
  loading: boolean;
  messages: ChatMessage[];
  onDeleteConversation: (conversationId: string) => void;
  onInput: (value: string) => void;
  onLoadConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onPrompt: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTimeRange: (value: TimeRange) => void;
  selectedTimeRange: TimeRange;
}) {
  const remainingMessages = Math.max(0, dailyLimit - dailyUsage);
  const limitReached = !isProUser && remainingMessages <= 0;

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-muted">Chat Interface</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Discipline review desk</h2>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-profit/20 bg-profit/[0.08] px-3 py-1 text-xs font-bold text-profit">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isProUser ? "Pro AI access" : `${remainingMessages}/3 free messages left`}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["7D", "30D", "90D", "ALL"] as TimeRange[]).map((range) => (
          <button
            key={range}
            className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selectedTimeRange === range ? "border-profit/40 bg-profit/[0.12] text-profit" : "border-line/70 bg-surface/70 text-muted hover:text-ink"}`}
            disabled={!isProUser && (range === "90D" || range === "ALL")}
            type="button"
            onClick={() => onTimeRange(range)}
            title={!isProUser && (range === "90D" || range === "ALL") ? "Pro plan required for deep analysis" : undefined}
          >
            {range}
          </button>
        ))}
        <button className="ml-auto rounded-full border border-line/70 bg-surface/70 px-3 py-2 text-xs font-bold text-muted transition hover:text-ink" type="button" onClick={onNewChat}>
          New chat
        </button>
      </div>

      {conversations.length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="flex shrink-0 items-center gap-1 rounded-full border border-line/70 bg-surface/70 px-2 py-1">
              <button className="max-w-[210px] truncate px-2 py-1 text-xs font-bold text-muted transition hover:text-ink" type="button" onClick={() => onLoadConversation(conversation.id)}>
                {conversation.title}
              </button>
              <button className="rounded-full p-1 text-muted transition hover:bg-loss/10 hover:text-loss" type="button" onClick={() => onDeleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            className="rounded-full border border-line/70 bg-surface/70 px-3 py-2 text-xs font-bold text-muted transition hover:border-profit/40 hover:text-ink"
            disabled={loading || isSending || limitReached}
            type="button"
            onClick={() => onPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-6 flex h-[460px] flex-col gap-4 overflow-y-auto rounded-[1.5rem] border border-line/60 bg-surface/[0.42] p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending ? (
          <article className="flex items-center gap-3 text-sm font-semibold text-muted">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <Brain className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center gap-1">
              Thinking<span className="animate-pulse">...</span>
            </span>
          </article>
        ) : null}
        <div ref={chatEndRef} />
      </div>

      {limitReached ? (
        <div className="mt-4 rounded-[1.25rem] border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-200">
          You used today&apos;s 3 free AI Coach messages. Upgrade to Pro for deeper analysis and more coaching.
        </div>
      ) : null}

      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="coach-message">Message AI Coach</label>
        <textarea
          id="coach-message"
          className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-line/70 bg-surface/70 px-4 py-3 text-sm font-medium leading-6 text-ink outline-none transition placeholder:text-muted focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
          value={input}
          rows={2}
          disabled={loading || isSending || limitReached}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Ask about discipline, emotions, losses, FOMO, revenge trading..."
        />
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950" disabled={loading || isSending || limitReached || !input.trim()} type="submit">
          <Send className="h-4 w-4" />
          {isSending ? "Sending" : loading ? "Loading" : "Send"}
        </button>
      </form>
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Brain className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className={`max-w-[82%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-soft ${
          isUser
            ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            : "border border-line/60 bg-white/[0.75] text-ink dark:border-white/10 dark:bg-white/[0.075]"
        }`}
      >
        {isUser ? <div className="whitespace-pre-line">{message.content}</div> : <FormattedAssistantMessage content={message.content} />}
      </div>
    </article>
  );
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);

  if (!lines.length) {
    return <p>I need a little more context to answer that well.</p>;
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const normalizedLine = line.replace(/\*\*/g, "");
        const isBullet = /^[-*]\s+/.test(normalizedLine);
        const isHeading = !isBullet && /^[A-Z][A-Za-z /&-]{2,32}:?$/.test(normalizedLine);

        if (isBullet) {
          return (
            <p key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-profit" />
              <span>{normalizedLine.replace(/^[-*]\s+/, "")}</span>
            </p>
          );
        }

        if (isHeading) {
          return (
            <p key={`${line}-${index}`} className="pt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {normalizedLine.replace(/:$/, "")}
            </p>
          );
        }

        return <p key={`${line}-${index}`}>{normalizedLine}</p>;
      })}
    </div>
  );
}

function DailySummaryCard({
  analysis,
  currency = "USD",
  latestFocus,
  loading
}: {
  analysis: CoachAnalysis;
  currency?: string;
  latestFocus: string;
  loading: boolean;
}) {
  const items = [
    {
      label: "Discipline Score",
      value: loading ? "..." : `${analysis.disciplineScore}%`,
      detail: `${analysis.ruleCompliance}% combined trade and review compliance`,
      tone: analysis.disciplineScore >= 80 ? "profit" as const : analysis.disciplineScore >= 60 ? "warning" as const : "loss" as const,
      icon: ShieldCheck
    },
    {
      label: "Emotional Control",
      value: loading ? "..." : analysis.weakestEmotion,
      detail: analysis.recentReview ? `Latest review: ${analysis.recentReview.date}` : "Add daily reviews to sharpen emotion coaching",
      tone: ["Revenge", "FOMO", "Greed", "Fear"].includes(analysis.weakestEmotion) ? "warning" as const : "neutral" as const,
      icon: Brain
    },
    {
      label: "Risk Control",
      value: loading ? "..." : `${analysis.averageRiskControl}%`,
      detail: `${analysis.riskViolations.length} risk/rule issue${analysis.riskViolations.length === 1 ? "" : "s"} detected`,
      tone: analysis.averageRiskControl >= 85 ? "profit" as const : analysis.averageRiskControl >= 65 ? "warning" as const : "loss" as const,
      icon: Target
    }
  ];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Daily Coach Summary Card</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Today&apos;s process review</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted">{item.label}</p>
                  <p className={`mt-1 text-3xl font-semibold ${toneClass(item.tone)}`}>{item.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted">{item.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 space-y-3 rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
        <CoachLine label="Best Behavior" value={analysis.bestBehavior} />
        <CoachLine label="Main Mistake" value={analysis.mainMistake} />
        <CoachLine label="Suggested Rule for Tomorrow" value={analysis.suggestedRule} />
        <CoachLine label="Real Net After Costs" value={formatCurrency(analysis.netAfterExpenses, currency)} />
        <CoachLine label="Current Focus" value={latestFocus} />
      </div>
    </section>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = insight.icon;

  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{insight.label}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-normal ${toneClass(insight.tone)}`}>{insight.value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/60 bg-surface/70 text-muted">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{insight.detail}</p>
    </article>
  );
}

function DisclaimerCard() {
  const points = [
    "AI Coach is for journaling, discipline, and educational reflection only.",
    "It does not provide buy/sell signals.",
    "It does not guarantee profit.",
    "Trading involves risk."
  ];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <ShieldAlert className="h-5 w-5 text-amber-200" />
            </div>
            <div>
            <p className="text-sm font-medium text-white/[0.55]">AI Coach disclaimer</p>
              <h2 className="text-xl font-semibold">Reflection tool, not a signal engine</h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/[0.62]">
            AI Coach is for journaling, education, risk reflection, and discipline. It does not provide financial advice, signals, or profit guarantees.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:w-[52%]">
          {points.map((point) => (
            <div key={point} className="flex gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.075] p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
              <p className="text-sm leading-6 text-white/[0.72]">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoachLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function CoachEmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-amber-400/25 bg-amber-400/[0.08] p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500 dark:text-amber-300">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Add trades and daily reviews to unlock personalized coaching.</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              The coach can already answer, but it becomes more useful after you save trades, review emotions, and log discipline notes in Calendar.
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-amber-400/30 bg-surface/70 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-300">
          Waiting for journal data
        </span>
      </div>
    </section>
  );
}

function buildCoachInsights(analysis: CoachAnalysis, currency = "USD"): Insight[] {
  return [
    {
      label: "Best session",
      value: analysis.bestSession?.name ?? "Not enough data",
      detail: analysis.bestSession
        ? `${formatCurrency(analysis.bestSession.profit, currency)} P/L, ${analysis.bestSession.winRate}% win rate across ${analysis.bestSession.trades} trades.`
        : "Add trades to identify your cleanest session.",
      icon: Trophy,
      tone: analysis.bestSession && analysis.bestSession.profit > 0 ? "profit" : "neutral"
    },
    {
      label: "Worst habit",
      value: analysis.mainMistake,
      detail: analysis.mainMistake === "Not enough review data yet"
        ? "Save daily reviews to surface repeated mistakes."
        : "Turn this into one binary rule before the next session.",
      icon: TrendingDown,
      tone: analysis.mainMistake === "Not enough review data yet" ? "neutral" : "warning"
    },
    {
      label: "Strongest instrument",
      value: analysis.bestInstrument?.name ?? "Not enough data",
      detail: analysis.bestInstrument
        ? `${formatCurrency(analysis.bestInstrument.profit, currency)} P/L with ${analysis.bestInstrument.winRate}% win rate.`
        : "Add trades to rank instrument performance.",
      icon: Target,
      tone: analysis.bestInstrument && analysis.bestInstrument.profit > 0 ? "profit" : "neutral"
    },
    {
      label: "Discipline risk",
      value: analysis.riskViolations.length ? `${analysis.riskViolations.length} issue${analysis.riskViolations.length === 1 ? "" : "s"}` : analysis.weakestEmotion,
      detail: analysis.riskViolations[0]?.detail || `Rule compliance is ${analysis.ruleCompliance}%. Watch ${analysis.weakestEmotion} decisions.`,
      icon: analysis.riskViolations.length ? ShieldAlert : Zap,
      tone: analysis.riskViolations.length ? "loss" : analysis.ruleCompliance >= 80 ? "profit" : "warning"
    }
  ];
}

function toneClass(tone: "profit" | "warning" | "loss" | "neutral") {
  if (tone === "profit") return "text-profit";
  if (tone === "warning") return "text-amber-500 dark:text-amber-300";
  if (tone === "loss") return "text-loss";
  return "text-ink";
}
