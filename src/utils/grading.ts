import { EvaluationResult, Gender } from "../types";

export function calculateRunGrade(totalTimeMs: number, gender: Gender): EvaluationResult {
  const totalSeconds = totalTimeMs / 1000;

  // Benchmarks in seconds for 1500m
  // Putra: Top: <= 300s (5:00) -> 100, Base: >= 540s (9:00) -> 80
  // Putri: Top: <= 360s (6:00) -> 100, Base: >= 660s (11:00) -> 80
  const topSeconds = gender === "putra" ? 300 : 360;
  const baseSeconds = gender === "putra" ? 540 : 660;

  let rawScore: number;
  if (totalSeconds <= topSeconds) {
    rawScore = 100;
  } else if (totalSeconds >= baseSeconds) {
    rawScore = 80;
  } else {
    // Linear interpolation between topSeconds (100) and baseSeconds (80)
    // Formula: 100 - ((totalSeconds - topSeconds) / (baseSeconds - topSeconds)) * 20
    const ratio = (totalSeconds - topSeconds) / (baseSeconds - topSeconds);
    rawScore = 100 - ratio * 20;
  }

  // Ensure score is strictly clamped within [80, 100]
  const score = Math.min(100, Math.max(80, Math.round(rawScore * 10) / 10));

  if (score >= 95) {
    return {
      score,
      predicate: "Sangat Baik (A)",
      color: "text-emerald-500 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
      description: "Performa daya tahan aerobik dan kecepatan luar biasa! Waktu tempuh melampaui rata-rata standar ujian.",
      recommendations: [
        "Pertahankan ritme lari stabil dan pemanasan dinamis teratur.",
        "Potensial untuk seleksi cabang atletik lari jarak menengah (1.500m).",
        "Tingkatkan latihan interval untuk mempertahankan ambang laktat.",
      ],
    };
  } else if (score >= 90) {
    return {
      score,
      predicate: "Baik Sekali (A-)",
      color: "text-blue-500 dark:text-blue-400",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      description: "Kemampuan kardiovaskular sangat baik dengan pembagian tenaga (pacing) yang efektif di tiap kilometer.",
      recommendations: [
        "Fokus pada efisiensi ayunan tangan dan pernapasan ritmis (2-2).",
        "Latihan lari tempo sejauh 2-3 km untuk memperkuat ketahanan akhir.",
        "Jaga hidrasi dan nutrisi sebelum ujian lari berikutnya.",
      ],
    };
  } else if (score >= 85) {
    return {
      score,
      predicate: "Baik (B+)",
      color: "text-indigo-500 dark:text-indigo-400",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
      description: "Memenuhi kriteria ketuntasan ujian lari dengan baik. Kecepatan relatif konsisten.",
      recommendations: [
        "Kurangi penurunan kecepatan (negative split) pada putaran ke-3.",
        "Perbanyak latihan jogging santai (aerobic base) 20-30 menit 2 kali seminggu.",
        "Lakukan pendinginan dan peregangan statis setelah selesai lari.",
      ],
    };
  } else {
    return {
      score,
      predicate: "Cukup (B)",
      color: "text-amber-500 dark:text-amber-400",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      description: "Berhasil menyelesaikan jarak penuh 1.500 meter dengan usaha yang gigih dan mencapai nilai tuntas dasar.",
      recommendations: [
        "Hindari berlari terlalu kencang di 400 meter pertama agar tidak cepat lelah.",
        "Latih pernapasan diafragma yang dalam dan rileks saat berlari.",
        "Tingkatkan kebugaran jasmani secara bertahap melalui program jalan cepat dan lari berseling.",
      ],
    };
  }
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const cs = String(centiseconds).padStart(2, "0");

  return `${mm}:${ss}.${cs}`;
}

export function formatTimeMinutesSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}d`;
}

export function formatPace(paceSeconds: number): string {
  if (!isFinite(paceSeconds) || paceSeconds <= 0) return "--:--";
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}
