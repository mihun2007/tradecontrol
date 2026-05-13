export type ExpenseCategory =
  | "Prop Firm Challenge"
  | "TradingView"
  | "Broker Fees"
  | "VPS"
  | "Signals"
  | "Courses"
  | "Tools"
  | "Other";

export type ExpenseStatus = "Paid" | "Pending";

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  status: ExpenseStatus;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NewExpense = {
  date: string;
  category: ExpenseCategory;
  amount: number;
  status: ExpenseStatus;
  notes: string;
};

export const expenseCategories: ExpenseCategory[] = [
  "Prop Firm Challenge",
  "TradingView",
  "Broker Fees",
  "VPS",
  "Signals",
  "Courses",
  "Tools",
  "Other"
];

export function money(value: number, signed = true) {
  const prefix = signed ? (value >= 0 ? "+" : "-") : "";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2
  })}`;
}
