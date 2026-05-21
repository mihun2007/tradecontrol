import {
  collection,
  deleteDoc,
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
import { deleteTradeScreenshot, uploadTradeScreenshot } from "@/lib/screenshot-storage";
import { calculateRiskReward, type NewTrade, type Trade, type TradeType } from "@/lib/trades";

type FirestoreTrade = Omit<NewTrade, "rr"> & {
  rr?: number;
  type?: TradeType;
  screenshotPath?: string;
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
};

function requireUserId(userId: string) {
  if (!userId) {
    throw new Error("You must be signed in to access trades.");
  }
}

function tradesCollection(userId: string) {
  requireUserId(userId);
  return collection(requireFirestoreDb(), "users", userId, "trades");
}

function serializeDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function tradeFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Trade {
  const data = snapshot.data() as FirestoreTrade;
  const tradeType = data.tradeType ?? data.type ?? "Buy";
  const entryPrice = Number(data.entryPrice) || 0;
  const stopLoss = Number(data.stopLoss) || 0;
  const takeProfit = Number(data.takeProfit) || 0;

  return {
    id: snapshot.id,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    session: data.session ?? "London",
    instrument: data.instrument ?? "XAUUSD",
    tradeType,
    type: tradeType,
    entryPrice,
    stopLoss,
    takeProfit,
    lotSize: Number(data.lotSize) || 0,
    riskAmount: Number(data.riskAmount) || 0,
    result: data.result ?? "Open",
    profitLoss: Number(data.profitLoss) || 0,
    strategy: data.strategy ?? "Manual entry",
    setupQuality: data.setupQuality ?? "A",
    emotion: data.emotion ?? "Calm",
    ruleFollowed: Boolean(data.ruleFollowed),
    notes: data.notes ?? "",
    screenshotUrl: data.screenshotUrl ?? "",
    screenshotPath: data.screenshotPath ?? "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
    rr: Number(data.rr) || calculateRiskReward(entryPrice, stopLoss, takeProfit)
  };
}

export async function createTrade(userId: string, tradeData: NewTrade, screenshotFile?: File | null) {
  const reference = doc(tradesCollection(userId));
  const screenshot = screenshotFile ? await uploadTradeScreenshot(userId, reference.id, screenshotFile) : null;
  const payload: FirestoreTrade = {
    ...tradeData,
    screenshotUrl: screenshot?.screenshotUrl ?? tradeData.screenshotUrl,
    screenshotPath: screenshot?.screenshotPath ?? tradeData.screenshotPath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(reference, payload);
  return reference.id;
}

export async function getTrades(userId: string) {
  const snapshot = await getDocs(query(tradesCollection(userId), orderBy("createdAt", "desc")));
  return snapshot.docs.map(tradeFromSnapshot);
}

export async function getTrade(userId: string, tradeId: string) {
  requireUserId(userId);
  if (!tradeId) {
    throw new Error("A trade id is required to load a trade.");
  }

  const snapshot = await getDoc(doc(requireFirestoreDb(), "users", userId, "trades", tradeId));
  return snapshot.exists() ? tradeFromSnapshot(snapshot) : null;
}

export async function updateTrade(userId: string, tradeId: string, tradeData: Partial<NewTrade>, screenshotFile?: File | null, previousScreenshotPath?: string) {
  requireUserId(userId);
  if (!tradeId) {
    throw new Error("A trade id is required to update a trade.");
  }

  const screenshot = screenshotFile ? await uploadTradeScreenshot(userId, tradeId, screenshotFile) : null;
  await updateDoc(doc(requireFirestoreDb(), "users", userId, "trades", tradeId), {
    ...tradeData,
    ...(screenshot
      ? {
          screenshotPath: screenshot.screenshotPath,
          screenshotUrl: screenshot.screenshotUrl
        }
      : {}),
    updatedAt: serverTimestamp()
  });

  if (screenshot && previousScreenshotPath && previousScreenshotPath !== screenshot.screenshotPath) {
    try {
      await deleteTradeScreenshot(previousScreenshotPath);
    } catch {
      // The trade was updated successfully; stale screenshot cleanup can be retried from Storage if needed.
    }
  }
}

export async function deleteTrade(userId: string, tradeId: string) {
  requireUserId(userId);
  if (!tradeId) {
    throw new Error("A trade id is required to delete a trade.");
  }

  const reference = doc(requireFirestoreDb(), "users", userId, "trades", tradeId);
  const snapshot = await getDoc(reference);
  const screenshotPath = snapshot.exists() ? (snapshot.data() as FirestoreTrade).screenshotPath : undefined;

  await deleteDoc(reference);

  if (screenshotPath) {
    try {
      await deleteTradeScreenshot(screenshotPath);
    } catch {
      // The Firestore trade was deleted; stale screenshot cleanup can be retried from Storage if needed.
    }
  }
}
