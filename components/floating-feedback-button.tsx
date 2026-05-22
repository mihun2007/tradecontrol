"use client";

import { MessageCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { FeedbackForm } from "@/components/feedback-form";

export function FloatingFeedbackButton() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  function closeModal() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsOpen(false);
  }

  function handleFeedbackSuccess() {
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 3000);
  }

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Open feedback form"
        className="fixed bottom-6 right-6 z-[9999] inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-[#22c55e] px-0 text-sm font-bold text-white shadow-[0_18px_45px_-18px_rgb(34_197_94_/_0.7)] transition hover:-translate-y-0.5 hover:bg-profit focus-visible:outline-white sm:w-auto sm:px-5"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/15 bg-white p-5 text-ink shadow-premium dark:bg-zinc-950 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-2xl font-semibold tracking-normal text-ink">
                  Share your feedback
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Help us improve TradeControl. We read everything.
                </p>
              </div>
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink transition hover:bg-surface"
                type="button"
                onClick={closeModal}
                aria-label="Close feedback form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <FeedbackForm className="mt-6 grid gap-5" onSuccess={handleFeedbackSuccess} />
          </section>
        </div>
      ) : null}
    </>
  );
}
