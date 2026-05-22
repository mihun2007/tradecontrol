import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
  type DocumentData,
  type FieldValue,
  type QueryDocumentSnapshot,
  type Timestamp
} from "firebase/firestore";
import { requireFirestoreDb } from "@/lib/firebase";

export type FeedbackType = "bug" | "feature_request" | "general" | "complaint" | "praise";
export type FeedbackStatus = "new" | "reviewed" | "in_progress" | "done";

export type Feedback = {
  id: string;
  userId: string;
  userEmail: string;
  type: FeedbackType;
  rating?: number;
  message: string;
  page: string;
  status: FeedbackStatus;
  createdAt?: string;
  adminNote?: string;
};

export type NewFeedback = {
  userId: string;
  userEmail: string;
  type: FeedbackType;
  rating?: number;
  message: string;
  page: string;
};

type FirestoreFeedback = Omit<Feedback, "createdAt"> & {
  createdAt?: Timestamp | FieldValue | string;
};

const feedbackTypes: FeedbackType[] = ["bug", "feature_request", "general", "complaint", "praise"];
const feedbackStatuses: FeedbackStatus[] = ["new", "reviewed", "in_progress", "done"];

function feedbackCollection() {
  return collection(requireFirestoreDb(), "feedback");
}

function serializeTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function normalizeFeedback(snapshot: QueryDocumentSnapshot<DocumentData>): Feedback {
  const data = snapshot.data() as Partial<FirestoreFeedback>;

  return {
    id: typeof data.id === "string" ? data.id : snapshot.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    userEmail: typeof data.userEmail === "string" ? data.userEmail : "",
    type: feedbackTypes.includes(data.type as FeedbackType) ? data.type as FeedbackType : "general",
    rating: typeof data.rating === "number" ? data.rating : undefined,
    message: typeof data.message === "string" ? data.message : "",
    page: typeof data.page === "string" ? data.page : "",
    status: feedbackStatuses.includes(data.status as FeedbackStatus) ? data.status as FeedbackStatus : "new",
    createdAt: serializeTimestamp(data.createdAt),
    adminNote: typeof data.adminNote === "string" ? data.adminNote : undefined
  };
}

export async function createFeedback(input: NewFeedback) {
  const message = input.message.trim();

  if (!input.userId) {
    throw new Error("You must be signed in to submit feedback.");
  }

  if (!input.userEmail) {
    throw new Error("A user email is required to submit feedback.");
  }

  if (!feedbackTypes.includes(input.type)) {
    throw new Error("Invalid feedback type.");
  }

  if (!message || message.length > 1000) {
    throw new Error("Feedback message must be between 1 and 1000 characters.");
  }

  if (input.rating !== undefined && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)) {
    throw new Error("Feedback rating must be a whole number from 1 to 5.");
  }

  const reference = doc(feedbackCollection());
  const payload: FirestoreFeedback = {
    id: reference.id,
    userId: input.userId,
    userEmail: input.userEmail,
    type: input.type,
    ...(input.rating === undefined ? {} : { rating: input.rating }),
    message,
    page: input.page || "/",
    status: "new",
    createdAt: serverTimestamp()
  };

  await setDoc(reference, payload);
  return reference.id;
}

export async function getFeedbackSubmissions() {
  const snapshot = await getDocs(query(feedbackCollection(), orderBy("createdAt", "desc")));
  return snapshot.docs.map(normalizeFeedback);
}

export async function getUserFeedbackSubmissions(userId: string) {
  if (!userId) {
    throw new Error("You must be signed in to view feedback.");
  }

  const snapshot = await getDocs(query(feedbackCollection(), where("userId", "==", userId)));
  return sortFeedbackByCreatedAt(snapshot.docs.map(normalizeFeedback)).slice(0, 3);
}

export async function updateFeedbackStatus(feedbackId: string, input: { status?: FeedbackStatus; adminNote?: string }) {
  if (!feedbackId) {
    throw new Error("A feedback id is required.");
  }

  const payload: Partial<Pick<Feedback, "status" | "adminNote">> = {};

  if (input.status !== undefined) {
    if (!feedbackStatuses.includes(input.status)) {
      throw new Error("Invalid feedback status.");
    }

    payload.status = input.status;
  }

  if (input.adminNote !== undefined) {
    if (input.adminNote.length > 1000) {
      throw new Error("Admin note must be 1000 characters or less.");
    }

    payload.adminNote = input.adminNote;
  }

  await updateDoc(doc(requireFirestoreDb(), "feedback", feedbackId), payload);
}

function sortFeedbackByCreatedAt(feedback: Feedback[]) {
  return [...feedback].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}
