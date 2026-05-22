"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, MessageSquareText, Star, TrendingUp, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  getFeedbackSubmissions,
  updateFeedbackStatus,
  type Feedback,
  type FeedbackStatus,
  type FeedbackType
} from "@/lib/feedback";

type StatusFilter = "all" | FeedbackStatus;
type TypeFilter = "all" | FeedbackType;
type SortMode = "newest" | "oldest" | "rating";

const pageSize = 20;
const statuses: FeedbackStatus[] = ["new", "reviewed", "in_progress", "done"];
const feedbackTypes: FeedbackType[] = ["bug", "feature_request", "general", "praise", "complaint"];

export function AdminFeedbackClient() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const isAdmin = Boolean(process.env.NEXT_PUBLIC_ADMIN_UID && currentUser?.uid === process.env.NEXT_PUBLIC_ADMIN_UID);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    void loadFeedback();
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [sortMode, statusFilter, typeFilter]);

  async function loadFeedback() {
    setLoadingFeedback(true);
    try {
      const submissions = await getFeedbackSubmissions();
      setFeedback(submissions);
    } finally {
      setLoadingFeedback(false);
    }
  }

  const counts = useMemo(() => buildStatusCounts(feedback), [feedback]);
  const stats = useMemo(() => buildFeedbackStats(feedback), [feedback]);
  const filteredFeedback = useMemo(
    () => sortFeedback(
      feedback.filter((item) => {
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        return matchesStatus && matchesType;
      }),
      sortMode
    ),
    [feedback, sortMode, statusFilter, typeFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filteredFeedback.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedFeedback = filteredFeedback.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function updateStatus(item: Feedback, status: FeedbackStatus) {
    setFeedback((current) => current.map((feedbackItem) => (
      feedbackItem.id === item.id ? { ...feedbackItem, status } : feedbackItem
    )));
    setSelectedFeedback((current) => current?.id === item.id ? { ...current, status } : current);

    try {
      await updateFeedbackStatus(item.id, { status });
    } catch {
      setFeedback((current) => current.map((feedbackItem) => (
        feedbackItem.id === item.id ? { ...feedbackItem, status: item.status } : feedbackItem
      )));
      setSelectedFeedback((current) => current?.id === item.id ? { ...current, status: item.status } : current);
    }
  }

  async function saveAdminNote(item: Feedback, adminNote: string) {
    setFeedback((current) => current.map((feedbackItem) => (
      feedbackItem.id === item.id ? { ...feedbackItem, adminNote } : feedbackItem
    )));
    setSelectedFeedback((current) => current?.id === item.id ? { ...current, adminNote } : current);
    await updateFeedbackStatus(item.id, { adminNote });
  }

  function toggleExpanded(feedbackId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(feedbackId)) {
        next.delete(feedbackId);
      } else {
        next.add(feedbackId);
      }
      return next;
    });
  }

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <>
      <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/[0.55]">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">Feedback Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.58]">
              Review, prioritize, and track every TradeControl feedback submission.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" as const, count: counts.all },
              { label: "New", value: "new" as const, count: counts.new },
              { label: "Reviewed", value: "reviewed" as const, count: counts.reviewed },
              { label: "In Progress", value: "in_progress" as const, count: counts.in_progress },
              { label: "Done", value: "done" as const, count: counts.done }
            ].map((item) => (
              <button
                key={item.value}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  statusFilter === item.value
                    ? "border-white bg-white text-zinc-950"
                    : "border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
                }`}
                type="button"
                onClick={() => setStatusFilter(item.value)}
              >
                {item.label} · {item.count}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total this month" value={String(stats.thisMonth)} />
        <StatCard icon={MessageSquareText} label="Most common type" value={stats.mostCommonType} />
        <StatCard icon={Star} label="Average rating" value={stats.averageRating} />
        <StatCard icon={TrendingUp} label="Most reported page" value={stats.mostReportedPage} />
      </section>

      <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" as const },
              { label: "Bug", value: "bug" as const },
              { label: "Feature", value: "feature_request" as const },
              { label: "General", value: "general" as const },
              { label: "Praise", value: "praise" as const },
              { label: "Complaint", value: "complaint" as const }
            ].map((item) => (
              <button
                key={item.value}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  typeFilter === item.value
                    ? "border-profit bg-profit text-white"
                    : "border-line/70 bg-surface/70 text-muted hover:border-profit/40 hover:text-ink"
                }`}
                type="button"
                onClick={() => setTypeFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-ink">
            Sort by
            <select
              className="h-11 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="rating">Rating high-low</option>
            </select>
          </label>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-line/60">
          <div className="hidden grid-cols-[150px_220px_minmax(260px,1fr)_140px_110px_120px_150px_110px] gap-3 border-b border-line/60 bg-surface/60 px-4 py-3 text-xs font-bold uppercase text-muted xl:grid">
            <span>Type</span>
            <span>User</span>
            <span>Message</span>
            <span>Page</span>
            <span>Rating</span>
            <span>Date</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {loadingFeedback ? (
            <div className="p-5 text-sm font-semibold text-muted">Loading feedback...</div>
          ) : paginatedFeedback.length ? (
            <div className="divide-y divide-line/60">
              {paginatedFeedback.map((item) => {
                const expanded = expandedIds.has(item.id);

                return (
                  <div key={item.id} className="grid gap-3 bg-surface/[0.35] px-4 py-4 xl:grid-cols-[150px_220px_minmax(260px,1fr)_140px_110px_120px_150px_110px] xl:items-center">
                    <FeedbackTypeBadge type={item.type} />
                    <p className="break-words text-sm font-semibold text-ink">{item.userEmail}</p>
                    <button
                      className="text-left text-sm leading-6 text-ink"
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      {expanded ? item.message : previewText(item.message, 80)}
                    </button>
                    <p className="break-words text-sm font-semibold text-muted">{item.page}</p>
                    <p className="text-sm font-semibold text-ink">{formatRating(item.rating)}</p>
                    <p className="text-sm font-semibold text-muted">{formatDate(item.createdAt)}</p>
                    <select
                      className="h-10 rounded-2xl border border-line/70 bg-surface/70 px-3 text-sm font-semibold text-ink outline-none focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
                      value={item.status}
                      onChange={(event) => void updateStatus(item, event.target.value as FeedbackStatus)}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                    <button
                      className="h-10 rounded-2xl border border-line/70 bg-surface/70 px-3 text-sm font-semibold text-ink transition hover:border-profit/40 hover:text-profit"
                      type="button"
                      onClick={() => setSelectedFeedback(item)}
                    >
                      View full
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-sm font-semibold text-muted">No feedback matches these filters.</div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-muted">
            Showing {paginatedFeedback.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredFeedback.length)} of {filteredFeedback.length}
          </p>
          <div className="flex gap-2">
            <button
              className="h-10 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage <= 1}
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <span className="flex h-10 items-center rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-muted">
              {currentPage} / {totalPages}
            </span>
            <button
              className="h-10 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage >= totalPages}
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedFeedback ? (
        <FeedbackSidePanel
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onSaveNote={saveAdminNote}
          onStatusChange={updateStatus}
        />
      ) : null}
    </>
  );
}

function FeedbackSidePanel({
  feedback,
  onClose,
  onSaveNote,
  onStatusChange
}: {
  feedback: Feedback;
  onClose: () => void;
  onSaveNote: (feedback: Feedback, adminNote: string) => Promise<void>;
  onStatusChange: (feedback: Feedback, status: FeedbackStatus) => Promise<void>;
}) {
  const [adminNote, setAdminNote] = useState(feedback.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setAdminNote(feedback.adminNote ?? "");
    setNotice("");
  }, [feedback.id, feedback.adminNote]);

  async function saveNote() {
    setSaving(true);
    setNotice("");
    try {
      await onSaveNote(feedback, adminNote);
      setNotice("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-zinc-950/55 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close feedback details" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-white/15 bg-white p-5 shadow-premium dark:bg-zinc-950 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">Feedback detail</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">{feedbackTypeLabel(feedback.type)}</h2>
          </div>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-ink"
            type="button"
            onClick={onClose}
            aria-label="Close feedback details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <DetailRow label="User" value={feedback.userEmail} />
          <DetailRow label="Page" value={feedback.page} />
          <DetailRow label="Rating" value={formatRating(feedback.rating)} />
          <DetailRow label="Submitted" value={formatDate(feedback.createdAt)} />
          <div className="rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
            <p className="text-xs font-bold uppercase text-muted">Status</p>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-line/70 bg-surface/70 px-3 text-sm font-semibold text-ink outline-none focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
              value={feedback.status}
              onChange={(event) => void onStatusChange(feedback, event.target.value as FeedbackStatus)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </div>
          <div className="rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
            <p className="text-xs font-bold uppercase text-muted">Message</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{feedback.message}</p>
          </div>
          <label className="grid gap-2 rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
            <span className="text-xs font-bold uppercase text-muted">Admin note</span>
            <textarea
              className="min-h-32 resize-none rounded-2xl border border-line/70 bg-surface/70 px-4 py-3 text-sm font-medium leading-6 text-ink outline-none focus:border-profit/70 focus:ring-4 focus:ring-profit/10"
              maxLength={1000}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              className="h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950"
              disabled={saving}
              type="button"
              onClick={() => void saveNote()}
            >
              {saving ? "Saving..." : "Save note"}
            </button>
            {notice ? <span className="text-sm font-semibold text-profit">{notice}</span> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-line/60 bg-surface/[0.55] p-4">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function FeedbackTypeBadge({ type }: { type: FeedbackType }) {
  const styles: Record<FeedbackType, string> = {
    bug: "border-loss/20 bg-loss/10 text-loss",
    feature_request: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    general: "border-zinc-500/20 bg-zinc-500/10 text-muted",
    complaint: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    praise: "border-profit/20 bg-profit/10 text-profit"
  };

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${styles[type]}`}>
      {feedbackTypeLabel(type)}
    </span>
  );
}

function buildStatusCounts(feedback: Feedback[]) {
  return feedback.reduce(
    (counts, item) => ({
      ...counts,
      all: counts.all + 1,
      [item.status]: counts[item.status] + 1
    }),
    { all: 0, new: 0, reviewed: 0, in_progress: 0, done: 0 } as Record<StatusFilter, number>
  );
}

function buildFeedbackStats(feedback: Feedback[]) {
  const now = new Date();
  const thisMonth = feedback.filter((item) => {
    if (!item.createdAt) {
      return false;
    }

    const date = new Date(item.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const mostCommon = mostCommonEntry(feedback.map((item) => item.type));
  const mostReportedPage = mostCommonEntry(feedback.map((item) => item.page)).label || "N/A";
  const ratings = feedback.map((item) => item.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length
    ? `${(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)} / 5`
    : "N/A";

  return {
    thisMonth,
    mostCommonType: mostCommon.label
      ? `${feedbackTypeEmoji(mostCommon.label as FeedbackType)} ${feedbackTypeLabel(mostCommon.label as FeedbackType)} — ${mostCommon.percent}%`
      : "N/A",
    averageRating,
    mostReportedPage
  };
}

function mostCommonEntry(values: string[]) {
  if (!values.length) {
    return { label: "", percent: 0 };
  }

  const counts = values.reduce<Record<string, number>>((total, value) => {
    total[value] = (total[value] ?? 0) + 1;
    return total;
  }, {});
  const [label, count] = Object.entries(counts).sort(([, left], [, right]) => right - left)[0];
  return { label, percent: Math.round((count / values.length) * 100) };
}

function sortFeedback(feedback: Feedback[], sortMode: SortMode) {
  return [...feedback].sort((left, right) => {
    if (sortMode === "rating") {
      return (right.rating ?? 0) - (left.rating ?? 0);
    }

    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return sortMode === "oldest" ? leftTime - rightTime : rightTime - leftTime;
  });
}

function feedbackTypeLabel(type: FeedbackType) {
  const labels: Record<FeedbackType, string> = {
    bug: "Bug",
    feature_request: "Feature",
    general: "General",
    complaint: "Complaint",
    praise: "Praise"
  };

  return labels[type];
}

function feedbackTypeEmoji(type: FeedbackType) {
  const emojis: Record<FeedbackType, string> = {
    bug: "🐛",
    feature_request: "✨",
    general: "💬",
    praise: "👍",
    complaint: "😤"
  };

  return emojis[type];
}

function statusLabel(status: FeedbackStatus) {
  const labels: Record<FeedbackStatus, string> = {
    new: "New",
    reviewed: "Reviewed",
    in_progress: "In Progress",
    done: "Done"
  };

  return labels[status];
}

function previewText(message: string, maxLength: number) {
  return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message;
}

function formatRating(rating?: number) {
  return rating ? "⭐".repeat(rating) : "N/A";
}

function formatDate(createdAt?: string) {
  if (!createdAt) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(createdAt));
}
