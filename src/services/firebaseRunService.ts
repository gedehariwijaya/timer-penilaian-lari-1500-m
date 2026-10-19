import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { RunSession, RunMode } from "../types";

const RUNS_COLLECTION = "runs";
const LOCAL_STORAGE_KEY = "lari_1500m_sessions_v1";

/**
 * Recursively strips keys with `undefined` values from an object,
 * ensuring Firestore setDoc doesn't fail with 'Unsupported field value: undefined'.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as unknown as T;
  }
  return data;
}

// Helper to normalize runs
export function normalizeRun(raw: any, docId?: string): RunSession {
  const id = raw.id || docId || `run-${Date.now()}`;
  const rawDate = raw.date || new Date().toISOString();
  const runDate =
    typeof raw.runDate === "string" && raw.runDate.length >= 8
      ? raw.runDate
      : rawDate.slice(0, 10);
  const mode: RunMode = raw.mode === "latihan" ? "latihan" : "ujian";

  const run: RunSession = {
    id,
    mode,
    runDate,
    student: {
      name: raw.student?.name || "Siswa",
      className: raw.student?.className || "XII",
      attendanceNumber: raw.student?.attendanceNumber || "01",
      gender: raw.student?.gender === "putri" ? "putri" : "putra",
    },
    date: rawDate,
    totalDistanceM: raw.totalDistanceM || 1500,
    totalTimeMs: raw.totalTimeMs || 360000,
    laps: Array.isArray(raw.laps) ? raw.laps : [],
    kmSplits: Array.isArray(raw.kmSplits) ? raw.kmSplits : [],
    score: typeof raw.score === "number" ? raw.score : 85,
    gradePredicate: raw.gradePredicate || "Baik (B+)",
    notes: raw.notes || "",
    syncedToCloud: true,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };

  if (typeof raw.startTime === "string" && raw.startTime.trim()) {
    run.startTime = raw.startTime;
  }
  if (typeof raw.split500mMs === "number" && !isNaN(raw.split500mMs)) {
    run.split500mMs = raw.split500mMs;
  }
  if (typeof raw.split1000mMs === "number" && !isNaN(raw.split1000mMs)) {
    run.split1000mMs = raw.split1000mMs;
  }
  if (typeof raw.student?.studentId === "string" && raw.student.studentId.trim()) {
    run.student.studentId = raw.student.studentId;
  }

  return run;
}

export class FirebaseRunService {
  // Read local storage cache
  static getLocalRuns(): RunSession[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => normalizeRun(item));
    } catch (e) {
      console.warn("Failed to read local runs:", e);
      return [];
    }
  }

  // Save to local storage cache
  static setLocalRuns(runs: RunSession[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(runs));
    } catch (e) {
      console.warn("Failed to set local runs:", e);
    }
  }

  // Real-time listener for Firestore runs collection
  static subscribeRuns(
    onUpdate: (runs: RunSession[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const colRef = collection(db, RUNS_COLLECTION);

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const remoteRuns: RunSession[] = [];
        snapshot.forEach((docSnap) => {
          remoteRuns.push(normalizeRun(docSnap.data(), docSnap.id));
        });

        // Sort descending by date
        remoteRuns.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Update local cache
        this.setLocalRuns(remoteRuns);
        onUpdate(remoteRuns);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
        // Fallback to local storage if offline or permissions issue
        const local = this.getLocalRuns();
        if (local.length > 0) {
          onUpdate(local);
        }
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, RUNS_COLLECTION);
        } catch (_) {
          // handled
        }
      }
    );

    return unsubscribe;
  }

  // Save run session to Firestore & local cache
  static async saveRun(run: RunSession): Promise<RunSession> {
    const normalized = normalizeRun(run);
    normalized.syncedToCloud = true;
    normalized.updatedAt = new Date().toISOString();

    // 1. Update local cache immediately
    const localRuns = this.getLocalRuns();
    const existingIndex = localRuns.findIndex((r) => r.id === normalized.id);
    if (existingIndex >= 0) {
      localRuns[existingIndex] = normalized;
    } else {
      localRuns.unshift(normalized);
    }
    this.setLocalRuns(localRuns);

    // 2. Write to Firestore
    const docRef = doc(db, RUNS_COLLECTION, normalized.id);
    try {
      const firestoreData = sanitizeForFirestore(normalized);
      await setDoc(docRef, firestoreData);
    } catch (error) {
      console.warn("Failed to write to Firestore, saved to local cache:", error);
      normalized.syncedToCloud = false;
      this.setLocalRuns(localRuns);
      try {
        handleFirestoreError(
          error,
          OperationType.WRITE,
          `${RUNS_COLLECTION}/${normalized.id}`
        );
      } catch (_) {
        // preserve local run
      }
    }

    return normalized;
  }

  // Delete single run from Firestore & local cache
  static async deleteRun(id: string): Promise<void> {
    // 1. Update local cache immediately
    const local = this.getLocalRuns().filter((r) => r.id !== id);
    this.setLocalRuns(local);

    // 2. Delete from Firestore
    const docRef = doc(db, RUNS_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.warn("Failed to delete from Firestore:", error);
      try {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `${RUNS_COLLECTION}/${id}`
        );
      } catch (_) {
        // handled
      }
    }
  }

  // Clear runs (can filter by mode: "ujian" | "latihan" | "all")
  static async clearAllRuns(mode?: "ujian" | "latihan" | "all"): Promise<void> {
    const colRef = collection(db, RUNS_COLLECTION);

    try {
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      let count = 0;

      snap.forEach((d) => {
        const data = d.data();
        if (!mode || mode === "all" || data.mode === mode) {
          batch.delete(d.ref);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }

      // Update local storage
      if (!mode || mode === "all") {
        this.setLocalRuns([]);
      } else {
        const remaining = this.getLocalRuns().filter((r) => r.mode !== mode);
        this.setLocalRuns(remaining);
      }
    } catch (error) {
      console.warn("Batch delete failed, clearing locally:", error);
      if (!mode || mode === "all") {
        this.setLocalRuns([]);
      }
      try {
        handleFirestoreError(error, OperationType.DELETE, RUNS_COLLECTION);
      } catch (_) {
        // handled
      }
    }
  }
}
