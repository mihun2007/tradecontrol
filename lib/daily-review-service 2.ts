import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
  type FieldValue,
  type QueryDocumentSnapshot,
  type Timestamp
} from "firebase/firestore";
import { requireFirestoreDb } from "@/lib/firebase";
import type { DailyRating, DailyReview, EmotionalState, NewDailyReview } from "@/lib/daily-reviews";

type FirestoreDailyReview = NewDailyReview & {
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
};

function requireUserId(userId: string) {
  if (!userId) {
    throw new Error("You must be signed in to access daily reviews.");
  }
}

function dailyReviewsCollection(userId: string) {
  requireUserId(userId);
  return collection(requireFirestoreDb(), "users", userId, "dailyReviews");
}

function serializeDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function reviewFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): DailyReview {
  const data = snapshot.data() as FirestoreDailyReview;

  return {
    id: snapshot.id,
    date: data.date ?? snapshot.id,
    followedPlan: Boolean(data.followedPlan),
    respectedRisk: Boolean(data.respectedRisk),
    noRevengeTrading: Boolean(data.noRevengeTrading),
    stoppedAtLimit: Boolean(data.stoppedAtLimit),
    journaledEveryTrade: Boolean(data.journaledEveryTrade),
    emotionalState: (data.emotionalState ?? "Calm") as EmotionalState,
    dailyRating: (data.dailyRating ?? "Good") as DailyRating,
    mainMistake: data.mainMistake ?? "",
    bestDecision: data.bestDecision ?? "",
    lessonLearned: data.lessonLearned ?? "",
    planForTomorrow: data.planForTomorrow ?? "",
    notes: data.notes ?? "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt)
  };
}

export async function getDailyReview(userId: string, dateId: string) {
  requireUserId(userId);
  if (!dateId) {
    throw new Error("A date id is required to load a daily review.");
  }

  const snapshot = await getDoc(doc(requireFirestoreDb(), "users", userId, "dailyReviews", dateId));
  return snapshot.exists() ? reviewFromSnapshot(snapshot) : null;
}

export async function getDailyReviews(userId: string) {
  const snapshot = await getDocs(query(dailyReviewsCollection(userId), orderBy("date", "desc")));
  return snapshot.docs.map(reviewFromSnapshot);
}

export async function saveDailyReview(userId: string, dateId: string, reviewData: NewDailyReview) {
  requireUserId(userId);
  if (!dateId) {
    throw new Error("A date id is required to save a daily review.");
  }

  await setDoc(doc(requireFirestoreDb(), "users", userId, "dailyReviews", dateId), {
    ...reviewData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateDailyReview(userId: string, dateId: string, reviewData: Partial<NewDailyReview>) {
  requireUserId(userId);
  if (!dateId) {
    throw new Error("A date id is required to update a daily review.");
  }

  await updateDoc(doc(requireFirestoreDb(), "users", userId, "dailyReviews", dateId), {
    ...reviewData,
    updatedAt: serverTimestamp()
  });
}
