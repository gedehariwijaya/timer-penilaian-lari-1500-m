import { RunSession } from "../types";

const LOCAL_STORAGE_KEY = "lari_1500m_sessions_v1";

export class CloudSyncService {
  // Read local runs cache
  static getLocalRuns(): RunSession[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to read local runs:", e);
      return [];
    }
  }

  // Save local runs cache
  static setLocalRuns(runs: RunSession[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(runs));
    } catch (e) {
      console.error("Failed to save local runs:", e);
    }
  }

  // Fetch all runs from Cloud API
  static async fetchCloudRuns(): Promise<{ success: boolean; data: RunSession[]; error?: string }> {
    try {
      const res = await fetch("/api/runs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Merge with local storage
        this.mergeLocalAndRemote(json.data);
        return { success: true, data: json.data };
      }
      return { success: false, data: this.getLocalRuns(), error: "Respon server tidak valid" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, data: this.getLocalRuns(), error: msg };
    }
  }

  // Save a single run to cloud and local
  static async saveRun(run: RunSession): Promise<{ success: boolean; synced: boolean; run: RunSession }> {
    const localRuns = this.getLocalRuns();
    const existingIdx = localRuns.findIndex((r) => r.id === run.id);

    let isCloudSynced = false;
    let savedRun = { ...run };

    // Try posting to Cloud API
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(run),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          isCloudSynced = true;
          savedRun = { ...json.data, syncedToCloud: true };
        }
      }
    } catch (e) {
      console.warn("Offline or cloud save failed. Stored locally first:", e);
      savedRun.syncedToCloud = false;
    }

    // Update local storage
    if (existingIdx >= 0) {
      localRuns[existingIdx] = savedRun;
    } else {
      localRuns.unshift(savedRun);
    }
    this.setLocalRuns(localRuns);

    return { success: true, synced: isCloudSynced, run: savedRun };
  }

  // Sync all local unsynced runs with Cloud API
  static async syncAllRuns(): Promise<{ success: boolean; total: number; synced: number }> {
    const localRuns = this.getLocalRuns();

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runs: localRuns }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        this.setLocalRuns(json.data);
        return { success: true, total: json.totalCount, synced: json.syncedCount };
      }
      return { success: false, total: localRuns.length, synced: 0 };
    } catch (e) {
      console.error("Bulk sync error:", e);
      return { success: false, total: localRuns.length, synced: 0 };
    }
  }

  // Delete single run
  static async deleteRun(id: string): Promise<boolean> {
    const local = this.getLocalRuns().filter((r) => r.id !== id);
    this.setLocalRuns(local);

    try {
      await fetch(`/api/runs/${id}`, { method: "DELETE" });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Delete all runs (Reset entire database & local storage)
  static async clearAllRuns(): Promise<boolean> {
    this.setLocalRuns([]);

    try {
      await fetch("/api/runs", { method: "DELETE" });
      return true;
    } catch (e) {
      console.warn("Could not delete cloud runs:", e);
      return false;
    }
  }

  // Helper to merge local and remote
  private static mergeLocalAndRemote(remoteRuns: RunSession[]): void {
    const localRuns = this.getLocalRuns();
    const map = new Map<string, RunSession>();

    remoteRuns.forEach((r) => map.set(r.id, { ...r, syncedToCloud: true }));
    localRuns.forEach((l) => {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    this.setLocalRuns(merged);
  }
}
