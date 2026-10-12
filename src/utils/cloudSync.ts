import { RunSession, RunMode } from "../types";
import { FirebaseRunService } from "../services/firebaseRunService";

export class CloudSyncService {
  static getLocalRuns(): RunSession[] {
    return FirebaseRunService.getLocalRuns();
  }

  static setLocalRuns(runs: RunSession[]): void {
    FirebaseRunService.setLocalRuns(runs);
  }

  static async fetchCloudRuns(): Promise<{ success: boolean; data: RunSession[]; error?: string }> {
    const data = FirebaseRunService.getLocalRuns();
    return { success: true, data };
  }

  static async saveRun(run: RunSession): Promise<{ success: boolean; synced: boolean; run: RunSession }> {
    const saved = await FirebaseRunService.saveRun(run);
    return { success: true, synced: saved.syncedToCloud, run: saved };
  }

  static async deleteRun(id: string): Promise<boolean> {
    await FirebaseRunService.deleteRun(id);
    return true;
  }

  static async clearAllRuns(mode?: RunMode | "all"): Promise<boolean> {
    await FirebaseRunService.clearAllRuns(mode);
    return true;
  }
}
