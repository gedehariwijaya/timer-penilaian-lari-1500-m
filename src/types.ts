export type Gender = "putra" | "putri";

export interface StudentInfo {
  name: string; // Nama Lengkap Siswa
  className: string; // Kelas
  attendanceNumber: string; // No. Absen Siswa
  gender: Gender; // Kategori Putra / Putri
  studentId?: string; // Optional identifier for backward compatibility
}

export interface LapRecord {
  lapNumber: number;
  lapDistanceM: number;
  cumulativeDistanceM: number;
  lapTimeMs: number;
  totalElapsedMs: number;
  speedKmh: number;
  paceSecondsPerKm: number;
}

export interface KmSplit {
  kmMarker: number; // 1.0, 1.5
  splitTimeMs: number;
  elapsedTimeMs: number;
  paceSecondsPerKm: number;
  speedKmh: number;
}

export interface RunSession {
  id: string;
  student: StudentInfo;
  date: string;
  totalDistanceM: number; // 1500
  totalTimeMs: number;
  laps: LapRecord[];
  kmSplits: KmSplit[];
  score: number; // 80 - 100
  gradePredicate: string;
  notes?: string;
  syncedToCloud: boolean;
  updatedAt: string;
}

export interface EvaluationResult {
  score: number; // 80.0 to 100.0
  predicate: string; // "Sangat Baik (A)", "Baik Sekali (A-)", "Baik (B+)", "Cukup (B)"
  color: string;
  badgeBg: string;
  description: string;
  recommendations: string[];
}

export interface AppSettings {
  trackType: "track_400m" | "track_300m" | "free_run";
  soundNotification: boolean;
  voiceNotification: boolean;
  notificationIntervalM: number; // default 500
  speechPitch: number;
  speechRate: number;
}
