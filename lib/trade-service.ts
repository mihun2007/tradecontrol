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
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type FieldValue,
  type QueryDocumentSnapshot,
  type Timestamp
} from "firebase/firestore";
import { requireFirestoreDb } from "@/lib/firebase";
import { calculateDisciplineStreak, type DisciplineStreakStats } from "@/lib/discipline-streak";
import { deleteTradeScreenshot, uploadTradeScreenshot } from "@/lib/screenshot-storage";
import { calculateRiskReward, type NewTrade, type Trade, type TradeType } from "@/lib/trades";

type FirestoreTrade = Omit<NewTrade, "rr"> & {
  rr?: number;
  type?: TradeType;
  screenshotPath?: string;
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
};

type FirestoreDisciplineStreak = DisciplineStreakStats & {
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

function disciplineStreakDoc(userId: string) {
  requireUserId(userId);
  return doc(requireFirestoreDb(), "users", userId, "stats", "disciplineStreak");
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
    ruleFollowed: data.ruleFollowed === true ? true : data.ruleFollowed === false ? false : null,
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
  await recalculateDisciplineStreakSafely(userId, "create");
  return reference.id;
}

export async function createTradesBulk(userId: string, trades: NewTrade[]) {
  requireUserId(userId);

  if (!trades.length) {
    return 0;
  }

  const db = requireFirestoreDb();
  const batchSize = 400;

  for (let index = 0; index < trades.length; index += batchSize) {
    const batch = writeBatch(db);
    const chunk = trades.slice(index, index + batchSize);

    chunk.forEach((tradeData) => {
      const reference = doc(tradesCollection(userId));
      batch.set(reference, {
        ...tradeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      } satisfies FirestoreTrade);
    });

    await batch.commit();
  }

  await recalculateDisciplineStreakSafely(userId, "bulk import");

  return trades.length;
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
  await recalculateDisciplineStreakSafely(userId, "update");

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
  await recalculateDisciplineStreakSafely(userId, "delete");

  if (screenshotPath) {
    try {
      await deleteTradeScreenshot(screenshotPath);
    } catch {
      // The Firestore trade was deleted; stale screenshot cleanup can be retried from Storage if needed.
    }
  }
}

export async function getDisciplineStreak(userId: string): Promise<DisciplineStreakStats> {
  const snapshot = await getDoc(disciplineStreakDoc(userId));

  if (!snapshot.exists()) {
    return recalculateDisciplineStreak(userId);
  }

  const data = snapshot.data() as Partial<FirestoreDisciplineStreak>;

  return {
    bestStreak: Number(data.bestStreak) || 0,
    currentStreak: Number(data.currentStreak) || 0,
    isPersonalRecord: Boolean(data.isPersonalRecord),
    lastCleanTradingDay: typeof data.lastCleanTradingDay === "string" ? data.lastCleanTradingDay : "",
    lastTradingDay: typeof data.lastTradingDay === "string" ? data.lastTradingDay : ""
  };
}

export async function recalculateDisciplineStreak(userId: string): Promise<DisciplineStreakStats> {
  const snapshot = await getDocs(query(tradesCollection(userId), orderBy("date", "asc")));
  const stats = calculateDisciplineStreak(snapshot.docs.map(tradeFromSnapshot));

  await setDoc(disciplineStreakDoc(userId), {
    ...stats,
    updatedAt: serverTimestamp()
  });

  return stats;
}

async function recalculateDisciplineStreakSafely(userId: string, source: string) {
  try {
    await recalculateDisciplineStreak(userId);
  } catch (streakError) {
    console.warn(`Discipline streak recalculation failed after trade ${source}.`, streakError);
  }
}
