"use client";

import type { ElementType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Pencil,
  PieChart,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
  WalletCards,
  X
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useUserExpenses } from "@/hooks/use-user-expenses";
import { useUserTrades } from "@/hooks/use-user-trades";
import { createExpense, deleteExpense, updateExpense } from "@/lib/expense-service";
import { expenseCategories, money, type Expense, type ExpenseCategory, type ExpenseStatus, type NewExpense } from "@/lib/expenses";

type ExpenseFormState = {
  date: string;
  category: ExpenseCategory;
  amount: string;
  status: ExpenseStatus;
  notes: string;
};

const emptyForm: ExpenseFormState = {
  date: new Date().toISOString().slice(0, 10),
  category: "Prop Firm Challenge",
  amount: "",
  status: "Paid",
  notes: ""
};

const inputClass =
  "h-11 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

const textareaClass =
  "min-h-24 rounded-2xl border border-line/70 bg-surface/70 px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-profit/70 focus:ring-4 focus:ring-profit/10";

export function ExpensesClient() {
  const { currentUser } = useAuth();
  const { expenses, loading: expensesLoading, error: expensesError, refresh } = useUserExpenses();
  const { trades, loading: tradesLoading } = useUserTrades();
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeout = window.setTimeout(() => setError(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [error]);

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = useMemo(() => expenses.filter((expense) => expense.date.startsWith(monthPrefix)), [expenses, monthPrefix]);
  const tradingProfit = useMemo(
    () => trades.filter((trade) => trade.date.startsWith(monthPrefix)).reduce((sum, trade) => sum + trade.profitLoss, 0),
    [monthPrefix, trades]
  );
  const expenseTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const realNetProfit = tradingProfit - expenseTotal;
  const breakdown = buildCategoryBreakdown(monthlyExpenses);
  const biggestCategory = breakdown[0]?.category ?? "None";
  const expenseRatio = tradingProfit > 0 ? Math.round((expenseTotal / tradingProfit) * 100) : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentUser) {
      setError("You must be signed in before saving expenses.");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid expense amount.");
      return;
    }

    const payload: NewExpense = {
      amount,
      category: form.category,
      date: form.date,
      notes: form.notes.trim(),
      status: form.status
    };

    try {
      setSaving(true);
      if (editingId) {
        await updateExpense(currentUser.uid, editingId, payload);
        setNotice("Expense updated in Firestore.");
      } else {
        await createExpense(currentUser.uid, payload);
        setNotice("Expense added to Firestore.");
      }

      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this expense.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      notes: expense.notes,
      status: expense.status
    });
  }

  async function confirmDelete() {
    if (!currentUser || !deleteTarget) {
      setError("You must be signed in before deleting expenses.");
      return;
    }

    try {
      setDeleting(true);
      await deleteExpense(currentUser.uid, deleteTarget.id);
      if (editingId === deleteTarget.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setDeleteTarget(null);
      setNotice("Expense deleted.");
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this expense.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/[0.55]">Expenses</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Track the real cost of trading.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.55]">
            Monitor subscriptions, prop firm costs, tools, fees, and the true net profit left after every trading expense.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/75">
          <ReceiptText className="h-4 w-4 text-profit" />
          Firestore expense ledger
        </div>
      </section>

      <Toast message={notice} tone="success" />
      <Toast message={error || expensesError || ""} tone="error" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CreditCard} label="Total Expenses This Month" value={money(expenseTotal, false)} tone="loss" detail={`${monthlyExpenses.length} expense records`} />
        <SummaryCard icon={WalletCards} label="Trading Profit This Month" value={tradesLoading ? "Loading..." : money(tradingProfit)} tone={tradingProfit >= 0 ? "profit" : "loss"} detail="Gross trading result" />
        <SummaryCard icon={PieChart} label="Real Net Profit" value={tradesLoading ? "Loading..." : money(realNetProfit)} tone={realNetProfit >= 0 ? "profit" : "loss"} detail="Profit after costs" />
        <SummaryCard icon={AlertTriangle} label="Biggest Expense Category" value={biggestCategory} tone="neutral" detail={breakdown[0] ? money(breakdown[0].total, false) : "$0"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <AddExpenseForm
          editing={Boolean(editingId)}
          form={form}
          loading={saving}
          onCancel={() => {
            setEditingId(null);
            setForm(emptyForm);
          }}
          onChange={setForm}
          onSubmit={handleSubmit}
        />
        <ExpensesTable
          expenses={expenses}
          loading={expensesLoading}
          onDelete={setDeleteTarget}
          onEdit={handleEdit}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <CategoryBreakdown loading={expensesLoading} rows={breakdown} />
        <ProfitAfterExpenses tradingProfit={tradingProfit} expenses={expenseTotal} realProfit={realNetProfit} ratio={expenseRatio} />
      </section>

      <InsightsBox expenseTotal={expenseTotal} realNetProfit={realNetProfit} biggestCategory={biggestCategory} ratio={expenseRatio} />

      {deleteTarget ? (
        <DeleteExpenseModal
          deleting={deleting}
          expense={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}

function AddExpenseForm({
  editing,
  form,
  loading,
  onCancel,
  onChange,
  onSubmit
}: {
  editing: boolean;
  form: ExpenseFormState;
  loading: boolean;
  onCancel: () => void;
  onChange: (form: ExpenseFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted">Add Expense Form</p>
          <h2 className="text-xl font-semibold text-ink">{editing ? "Edit trading cost" : "Log a trading cost"}</h2>
        </div>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Date
          <input className={inputClass} type="date" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} required />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Category
          <select className={inputClass} value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value as ExpenseCategory })}>
            {expenseCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Amount
            <input className={inputClass} min="0" step="0.01" type="number" value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} placeholder="0.00" required />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink">
            Payment status
            <select className={inputClass} value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as ExpenseStatus })}>
              {["Paid", "Pending"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Notes
          <textarea className={textareaClass} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} placeholder="Add context for this expense" />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-zinc-950" type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
            {loading ? "Saving..." : editing ? "Update Expense" : "Save Expense"}
          </button>
          <button className="h-11 rounded-2xl border border-line/70 bg-surface/60 px-5 text-sm font-semibold text-muted transition hover:text-ink" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function ExpensesTable({
  expenses,
  loading,
  onDelete,
  onEdit
}: {
  expenses: Expense[];
  loading: boolean;
  onDelete: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted">Expenses Table</p>
          <h2 className="text-xl font-semibold text-ink">Trading cost ledger</h2>
        </div>
        <p className="text-sm font-semibold text-muted">{expenses.length} entries</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-line/60">
        <div className="hidden grid-cols-[0.75fr_1fr_0.7fr_0.7fr_1.3fr_0.8fr] border-b border-line/60 bg-zinc-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted dark:bg-white/[0.04] xl:grid">
          <span>Date</span>
          <span>Category</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Notes</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-line/60">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid gap-3 bg-surface/40 px-4 py-4 sm:px-5 xl:grid-cols-[0.75fr_1fr_0.7fr_0.7fr_1.3fr_0.8fr]">
                {Array.from({ length: 6 }).map((__, cellIndex) => (
                  <div key={cellIndex} className="h-5 animate-pulse rounded-full bg-zinc-200/80 dark:bg-white/10" />
                ))}
              </div>
            ))
          ) : expenses.length ? (
            expenses.map((expense) => (
              <article key={expense.id} className="grid gap-3 bg-surface/40 px-4 py-4 text-sm sm:px-5 xl:grid-cols-[0.75fr_1fr_0.7fr_0.7fr_1.3fr_0.8fr] xl:items-center">
                <MobileField label="Date" className="font-medium text-muted">{expense.date}</MobileField>
                <MobileField label="Category" className="font-semibold text-ink">{expense.category}</MobileField>
                <MobileField label="Amount" className="font-semibold text-loss">{money(expense.amount, false)}</MobileField>
                <div>
                  <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted xl:hidden">Status</span>
                  <StatusPill status={expense.status} />
                </div>
                <MobileField label="Notes" className="text-muted">{expense.notes || "No notes"}</MobileField>
                <div className="flex gap-2">
                  <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-line/70 bg-surface/70 text-muted transition hover:text-ink focus-visible:ring-4 focus-visible:ring-profit/15" type="button" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.category}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-loss/20 bg-loss/[0.08] text-loss transition hover:bg-loss/[0.14] focus-visible:ring-4 focus-visible:ring-loss/15" type="button" onClick={() => onDelete(expense)} aria-label={`Delete ${expense.category}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="bg-surface/40 px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line/70 bg-surface/80 text-muted">
                <ReceiptText className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">No expenses saved yet.</p>
              <p className="mt-2 text-sm text-muted">Add your first trading cost to calculate real net profit.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MobileField({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <p className={className}>
      <span className="mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted xl:hidden">{label}</span>
      {children}
    </p>
  );
}

function CategoryBreakdown({ loading, rows }: { loading: boolean; rows: { category: ExpenseCategory; total: number; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.total));

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <p className="text-sm font-medium text-muted">Category Breakdown</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">Where money is going</h2>
      <div className="mt-6 space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-white/10" />)
        ) : rows.length ? (
          rows.map((row) => (
            <div key={row.category}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">{row.category}</span>
                <span className="font-semibold text-loss">{money(row.total, false)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-zinc-950 dark:bg-white" style={{ width: `${Math.max(7, (row.total / max) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs font-medium text-muted">{row.count} records</p>
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-line bg-surface/50 p-5 text-sm text-muted">
            Category totals will appear after you add expenses.
          </div>
        )}
      </div>
    </section>
  );
}

function ProfitAfterExpenses({
  expenses,
  ratio,
  realProfit,
  tradingProfit
}: {
  expenses: number;
  ratio: number;
  realProfit: number;
  tradingProfit: number;
}) {
  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-zinc-950 p-5 text-white shadow-premium dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <p className="text-sm font-medium text-white/[0.55]">Profit After Expenses</p>
      <h2 className="mt-1 text-xl font-semibold">Real profitability</h2>
      <div className="mt-6 grid gap-3">
        <ProfitLine label="Gross trading profit" value={money(tradingProfit)} tone={tradingProfit >= 0 ? "profit" : "loss"} />
        <ProfitLine label="Total expenses" value={money(expenses, false)} tone="loss" />
        <ProfitLine label="Real profit" value={money(realProfit)} tone={realProfit >= 0 ? "profit" : "loss"} />
      </div>
      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.075] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white/[0.58]">Expense-to-profit ratio</p>
          <p className="text-2xl font-semibold">{ratio}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-profit" style={{ width: `${Math.min(100, Math.max(4, ratio))}%` }} />
        </div>
      </div>
    </section>
  );
}

function InsightsBox({ biggestCategory, expenseTotal, ratio, realNetProfit }: { biggestCategory: string; expenseTotal: number; ratio: number; realNetProfit: number }) {
  const insights = [
    expenseTotal > 0
      ? `Expenses reduce your trading result by ${ratio}% this month.`
      : "No expenses logged yet, so real net profit currently matches trading profit.",
    biggestCategory !== "None" ? `${biggestCategory} is your biggest cost category this month.` : "Add expenses to reveal your largest cost category.",
    realNetProfit >= 0 ? "Your real net profit is positive after all trading costs." : "Your real net profit is negative after expenses. Review fixed costs and risk."
  ];

  return (
    <section className="rounded-[2rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted">Smart Insight Box</p>
          <h2 className="text-xl font-semibold text-ink">Cost discipline readout</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {insights.map((insight) => (
          <div key={insight} className="rounded-[1.5rem] border border-line/60 bg-surface/[0.55] p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-profit" />
              <p className="text-sm leading-6 text-muted">{insight}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeleteExpenseModal({
  deleting,
  expense,
  onCancel,
  onConfirm
}: {
  deleting: boolean;
  expense: Expense;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[2rem] border border-white/[0.55] bg-white p-5 text-ink shadow-premium dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-loss/10 text-loss">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Delete this expense?</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Are you sure you want to delete this expense? This action cannot be undone.
              </p>
            </div>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-line/70 bg-surface/70 text-muted" type="button" onClick={onCancel} aria-label="Close delete confirmation">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-line/70 bg-surface/60 p-4">
          <p className="text-sm font-semibold text-ink">{expense.category}</p>
          <p className="mt-1 text-sm text-muted">{expense.date} · {money(expense.amount, false)} · {expense.status}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="h-11 rounded-2xl border border-line/70 bg-surface/70 text-sm font-semibold text-ink" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-loss px-4 text-sm font-semibold text-white shadow-premium disabled:cursor-not-allowed disabled:opacity-70" type="button" disabled={deleting} onClick={onConfirm}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Expense
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  detail,
  icon: Icon,
  label,
  tone,
  value
}: {
  detail: string;
  icon: ElementType;
  label: string;
  tone: "profit" | "loss" | "neutral";
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/[0.55] bg-white/[0.72] p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-normal sm:text-3xl ${toneClass(tone)}`}>{value}</p>
      <p className="mt-2 text-sm font-medium text-muted">{detail}</p>
    </article>
  );
}

function StatusPill({ status }: { status: ExpenseStatus }) {
  const tone = status === "Paid" ? "bg-profit/[0.12] text-profit" : "bg-amber-400/[0.16] text-amber-600 dark:text-amber-300";
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}

function ProfitLine({ label, tone, value }: { label: string; tone: "profit" | "loss"; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.075] px-4 py-3">
      <p className="text-sm font-medium text-white/[0.6]">{label}</p>
      <p className={`text-lg font-semibold ${tone === "profit" ? "text-profit" : "text-loss"}`}>{value}</p>
    </div>
  );
}

function Toast({ message, tone }: { message: string; tone: "success" | "error" }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-premium ${
      tone === "success"
        ? "border-profit/20 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
        : "border-loss/25 bg-loss text-white"
    }`}>
      {tone === "success" ? <CheckCircle2 className="h-4 w-4 text-profit" /> : <AlertTriangle className="h-4 w-4" />}
      {message}
    </div>
  );
}

function buildCategoryBreakdown(expenses: Expense[]) {
  return expenseCategories
    .map((category) => {
      const rows = expenses.filter((expense) => expense.category === category);
      return {
        category,
        count: rows.length,
        total: rows.reduce((sum, expense) => sum + expense.amount, 0)
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

function toneClass(tone: "profit" | "loss" | "neutral") {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  return "text-ink";
}
