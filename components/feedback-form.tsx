"use client";

import { Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { createFeedback, type FeedbackType } from "@/lib/feedback";

type SubmissionState = "idle" | "submitting" | "success";

type FeedbackFormProps = {
  className?: string;
  onSuccess?: () => void;
};

const feedbackTypes: Array<{ label: string; value: FeedbackType }> = [
  { label: "🐛 Bug", value: "bug" },
  { label: "✨ Feature Request", value: "feature_request" },
  { label: "💬 General", value: "general" },
  { label: "👍 Praise", value: "praise" },
  { label: "😤 Complaint", value: "complaint" }
];

export function FeedbackForm({ className = "grid gap-5", onSuccess }: FeedbackFormProps) {
  const { currentUser } = useAuth();
  const [type, setType] = useState<FeedbackType>("general");
  const [rating, setRating] = useState<number | undefined>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentUser?.uid || !currentUser.email) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setSubmissionState("submitting");

    try {
      const page = window.location.pathname;
      const feedbackPayload = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        type,
        rating,
        message,
        page
      };

      await createFeedback({
        ...feedbackPayload
      });
      void sendDiscordFeedbackNotification(currentUser, feedbackPayload);
      setType("general");
      setRating(undefined);
      setMessage("");
      setSubmissionState("success");
      onSuccess?.();
    } catch {
      setSubmissionState("idle");
      setError("Something went wrong. Please try again.");
    }
  }

  if (submissionState === "success") {
    return (
      <div className="rounded-[1.5rem] border border-profit/20 bg-profit/10 p-5 text-sm font-semibold leading-6 text-ink">
        Thanks! Your feedback was sent. We'll use it to make TradeControl better. 🙌
      </div>
    );
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-ink">Feedback type</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {feedbackTypes.map((feedbackType) => {
            const selected = type === feedbackType.value;

            return (
              <button
                key={feedbackType.value}
                className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-profit bg-profit text-white shadow-soft"
                    : "border-line/70 bg-surface/70 text-muted hover:border-profit/40 hover:text-ink"
                }`}
                type="button"
                onClick={() => setType(feedbackType.value)}
              >
                {feedbackType.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-ink">Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((starValue) => (
            <button
              key={starValue}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                rating && starValue <= rating ? "text-[#22c55e]" : "text-muted hover:text-ink"
              }`}
              type="button"
              onClick={() => setRating(rating === starValue ? undefined : starValue)}
              aria-label={`Set rating to ${starValue} star${starValue === 1 ? "" : "s"}`}
            >
              <Star className="h-6 w-6" fill={rating && starValue <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink">Message</span>
        <textarea
          className="min-h-36 resize-none rounded-[1.25rem] border border-line/70 bg-surface/70 px-4 py-3 text-sm font-medium leading-6 text-ink outline-none transition placeholder:text-muted/70 focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
          maxLength={1000}
          placeholder="What's on your mind? Be as specific as possible."
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <span className="text-right text-xs font-semibold text-muted">{message.length}/1000</span>
      </label>

      {error ? (
        <div className="rounded-2xl border border-loss/25 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">
          {error}
        </div>
      ) : null}

      <button
        className="inline-flex h-12 items-center justify-center rounded-full bg-[#22c55e] px-5 text-sm font-bold text-white shadow-[0_18px_45px_-18px_rgb(34_197_94_/_0.7)] transition hover:-translate-y-0.5 hover:bg-profit disabled:cursor-not-allowed disabled:opacity-70"
        disabled={submissionState === "submitting" || message.trim().length === 0}
        type="submit"
      >
        {submissionState === "submitting" ? "Sending..." : "Send Feedback"}
      </button>
    </form>
  );
}

async function sendDiscordFeedbackNotification(
  user: NonNullable<ReturnType<typeof useAuth>["currentUser"]>,
  feedback: {
    userId: string;
    userEmail: string;
    type: FeedbackType;
    rating?: number;
    message: string;
    page: string;
  }
) {
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/feedback", {
      body: JSON.stringify(feedback),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      console.warn("Discord feedback notification failed.", response.status, response.statusText);
    }
  } catch (notificationError) {
    console.warn("Discord feedback notification failed.", notificationError);
  }
}
