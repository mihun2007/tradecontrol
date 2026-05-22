"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { deleteTrade } from "@/lib/trade-service";
import type { Trade } from "@/lib/trades";

type DeleteTradeButtonProps = {
  onDeleted?: () => void;
  trade: Trade;
  variant?: "icon" | "button";
};

export function DeleteTradeButton({ onDeleted, trade, variant = "button" }: DeleteTradeButtonProps) {
  const { currentUser } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [modalTop, setModalTop] = useState(120);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function openConfirmation() {
    setError("");

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const idealTop = rect.top + rect.height / 2 - 170;
      setModalTop(Math.max(88, Math.min(idealTop, window.innerHeight - 360)));
    }

    setOpen(true);
  }

  async function confirmDelete() {
    if (!currentUser) {
      setError("You must be signed in before deleting a trade.");
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await deleteTrade(currentUser.uid, trade.id);
      trackEvent("trade_deleted", {
        instrument: trade.instrument,
        result: trade.result,
        session: trade.session
      });
      setSuccess(true);
      setOpen(false);
      window.setTimeout(() => onDeleted?.(), 500);
    } catch (deleteError) {
      trackApiFailure("trade_deleted", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this trade.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {success ? (
        <div className="fixed right-5 top-24 z-50 rounded-2xl border border-profit/20 bg-profit px-4 py-3 text-sm font-semibold text-white shadow-premium">
          Trade deleted.
        </div>
      ) : null}

      <button
        ref={buttonRef}
        className={
          variant === "icon"
            ? "flex h-10 w-10 items-center justify-center rounded-xl border border-loss/20 bg-loss/10 text-loss transition hover:bg-loss hover:text-white"
            : "inline-flex h-11 items-center gap-2 rounded-2xl border border-loss/20 bg-loss/10 px-4 text-sm font-semibold text-loss transition hover:bg-loss hover:text-white"
        }
        type="button"
        onClick={openConfirmation}
        aria-label="Delete trade"
      >
        <Trash2 className="h-4 w-4" />
        {variant === "button" ? "Delete" : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex justify-center bg-zinc-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
              <div className="w-full max-w-md self-start rounded-[2rem] border border-white/[0.55] bg-white p-5 text-ink shadow-premium dark:border-white/10 dark:bg-zinc-950" style={{ marginTop: modalTop }}>
                <DeleteConfirmationCard
                  deleting={deleting}
                  error={error}
                  trade={trade}
                  onCancel={() => setOpen(false)}
                  onConfirm={confirmDelete}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function DeleteConfirmationCard({
  deleting,
  error,
  onCancel,
  onConfirm,
  trade
}: {
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  trade: Trade;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-loss/10 text-loss">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Delete this trade?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Are you sure you want to delete this trade? This action cannot be undone.
            </p>
          </div>
        </div>
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line/70 bg-surface/70 text-muted" type="button" onClick={onCancel} aria-label="Close delete confirmation">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-line/70 bg-surface/60 p-4">
        <p className="text-sm font-semibold text-ink">{trade.instrument} {trade.type}</p>
        <p className="mt-1 text-sm text-muted">{trade.date} · {trade.session} · {trade.result}</p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-loss/25 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          className="h-11 rounded-2xl border border-line/70 bg-surface/70 text-sm font-semibold text-ink"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-loss px-4 text-sm font-semibold text-white shadow-premium disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={deleting}
          onClick={onConfirm}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Trade
        </button>
      </div>
    </>
  );
}
