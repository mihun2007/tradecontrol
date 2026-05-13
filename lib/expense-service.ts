import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FieldValue,
  type QueryDocumentSnapshot,
  type Timestamp
} from "firebase/firestore";
import { requireFirestoreDb } from "@/lib/firebase";
import type { Expense, ExpenseCategory, ExpenseStatus, NewExpense } from "@/lib/expenses";

type FirestoreExpense = NewExpense & {
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
};

function requireUserId(userId: string) {
  if (!userId) {
    throw new Error("You must be signed in to access expenses.");
  }
}

function expensesCollection(userId: string) {
  requireUserId(userId);
  return collection(requireFirestoreDb(), "users", userId, "expenses");
}

function serializeDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function expenseFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): Expense {
  const data = snapshot.data() as FirestoreExpense;

  return {
    id: snapshot.id,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    category: (data.category ?? "Other") as ExpenseCategory,
    amount: Number(data.amount) || 0,
    status: (data.status ?? "Paid") as ExpenseStatus,
    notes: data.notes ?? "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt)
  };
}

export async function createExpense(userId: string, expenseData: NewExpense) {
  const reference = await addDoc(expensesCollection(userId), {
    ...expenseData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return reference.id;
}

export async function getExpenses(userId: string) {
  const snapshot = await getDocs(query(expensesCollection(userId), orderBy("createdAt", "desc")));
  return snapshot.docs.map(expenseFromSnapshot);
}

export async function updateExpense(userId: string, expenseId: string, expenseData: Partial<NewExpense>) {
  requireUserId(userId);
  if (!expenseId) {
    throw new Error("An expense id is required to update an expense.");
  }

  await updateDoc(doc(requireFirestoreDb(), "users", userId, "expenses", expenseId), {
    ...expenseData,
    updatedAt: serverTimestamp()
  });
}

export async function deleteExpense(userId: string, expenseId: string) {
  requireUserId(userId);
  if (!expenseId) {
    throw new Error("An expense id is required to delete an expense.");
  }

  await deleteDoc(doc(requireFirestoreDb(), "users", userId, "expenses", expenseId));
}
