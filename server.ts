import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface StudentInfo {
  name: string;
  className: string;
  attendanceNumber: string;
  gender: "putra" | "putri";
  studentId?: string;
}

interface LapRecord {
  lapNumber: number;
  lapDistanceM: number;
  cumulativeDistanceM: number;
  lapTimeMs: number;
  totalElapsedMs: number;
  speedKmh: number;
  paceSecondsPerKm: number;
}

interface KmSplit {
  kmMarker: number;
  splitTimeMs: number;
  elapsedTimeMs: number;
  paceSecondsPerKm: number;
  speedKmh: number;
}

interface RunSession {
  id: string;
  student: StudentInfo;
  date: string;
  totalDistanceM: number;
  totalTimeMs: number;
  laps: LapRecord[];
  kmSplits: KmSplit[];
  score: number;
  gradePredicate: string;
  notes?: string;
  syncedToCloud: boolean;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "runs.json");

// Default seed runs with realistic high school students
const DEFAULT_RUNS: RunSession[] = [
  {
    id: "run-seed-1",
    student: {
      name: "Bima Arya Pratama",
      attendanceNumber: "07",
      className: "XII MIPA 1",
      gender: "putra",
    },
    date: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    totalDistanceM: 1500,
    totalTimeMs: 318000, // 5m 18s
    score: 98,
    gradePredicate: "Sangat Baik (A)",
    notes: "Pace sangat konsisten, sprint akhir 300m luar biasa.",
    syncedToCloud: true,
    updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    kmSplits: [
      { kmMarker: 1.0, splitTimeMs: 210000, elapsedTimeMs: 210000, paceSecondsPerKm: 210, speedKmh: 17.1 },
      { kmMarker: 1.5, splitTimeMs: 108000, elapsedTimeMs: 318000, paceSecondsPerKm: 216, speedKmh: 16.7 },
    ],
    laps: [
      { lapNumber: 1, lapDistanceM: 400, cumulativeDistanceM: 400, lapTimeMs: 82000, totalElapsedMs: 82000, speedKmh: 17.5, paceSecondsPerKm: 205 },
      { lapNumber: 2, lapDistanceM: 400, cumulativeDistanceM: 800, lapTimeMs: 84000, totalElapsedMs: 166000, speedKmh: 17.1, paceSecondsPerKm: 210 },
      { lapNumber: 3, lapDistanceM: 400, cumulativeDistanceM: 1200, lapTimeMs: 87000, totalElapsedMs: 253000, speedKmh: 16.5, paceSecondsPerKm: 217 },
      { lapNumber: 4, lapDistanceM: 300, cumulativeDistanceM: 1500, lapTimeMs: 65000, totalElapsedMs: 318000, speedKmh: 16.6, paceSecondsPerKm: 216 },
    ],
  },
  {
    id: "run-seed-2",
    student: {
      name: "Siti Rahmawati",
      attendanceNumber: "28",
      className: "XII IPS 2",
      gender: "putri",
    },
    date: new Date(Date.now() - 3600000 * 24 * 1.5).toISOString(),
    totalDistanceM: 1500,
    totalTimeMs: 382000, // 6m 22s
    score: 97,
    gradePredicate: "Sangat Baik (A)",
    notes: "Daya tahan kardiovaskular sangat prima untuk kategori putri.",
    syncedToCloud: true,
    updatedAt: new Date(Date.now() - 3600000 * 24 * 1.5).toISOString(),
    kmSplits: [
      { kmMarker: 1.0, splitTimeMs: 252000, elapsedTimeMs: 252000, paceSecondsPerKm: 252, speedKmh: 14.3 },
      { kmMarker: 1.5, splitTimeMs: 130000, elapsedTimeMs: 382000, paceSecondsPerKm: 260, speedKmh: 13.8 },
    ],
    laps: [
      { lapNumber: 1, lapDistanceM: 400, cumulativeDistanceM: 400, lapTimeMs: 98000, totalElapsedMs: 98000, speedKmh: 14.7, paceSecondsPerKm: 245 },
      { lapNumber: 2, lapDistanceM: 400, cumulativeDistanceM: 800, lapTimeMs: 102000, totalElapsedMs: 200000, speedKmh: 14.1, paceSecondsPerKm: 255 },
      { lapNumber: 3, lapDistanceM: 400, cumulativeDistanceM: 1200, lapTimeMs: 105000, totalElapsedMs: 305000, speedKmh: 13.7, paceSecondsPerKm: 262 },
      { lapNumber: 4, lapDistanceM: 300, cumulativeDistanceM: 1500, lapTimeMs: 77000, totalElapsedMs: 382000, speedKmh: 14.0, paceSecondsPerKm: 257 },
    ],
  },
  {
    id: "run-seed-3",
    student: {
      name: "Dimas Anggara",
      attendanceNumber: "12",
      className: "XII MIPA 2",
      gender: "putra",
    },
    date: new Date(Date.now() - 3600000 * 20).toISOString(),
    totalDistanceM: 1500,
    totalTimeMs: 375000, // 6m 15s
    score: 93,
    gradePredicate: "Baik Sekali (A-)",
    notes: "Mampu mempertahankan kecepatan stabil sepanjang ujian.",
    syncedToCloud: true,
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    kmSplits: [
      { kmMarker: 1.0, splitTimeMs: 246000, elapsedTimeMs: 246000, paceSecondsPerKm: 246, speedKmh: 14.6 },
      { kmMarker: 1.5, splitTimeMs: 129000, elapsedTimeMs: 375000, paceSecondsPerKm: 258, speedKmh: 13.9 },
    ],
    laps: [
      { lapNumber: 1, lapDistanceM: 400, cumulativeDistanceM: 400, lapTimeMs: 95000, totalElapsedMs: 95000, speedKmh: 15.1, paceSecondsPerKm: 237 },
      { lapNumber: 2, lapDistanceM: 400, cumulativeDistanceM: 800, lapTimeMs: 99000, totalElapsedMs: 194000, speedKmh: 14.5, paceSecondsPerKm: 247 },
      { lapNumber: 3, lapDistanceM: 400, cumulativeDistanceM: 1200, lapTimeMs: 104000, totalElapsedMs: 298000, speedKmh: 13.8, paceSecondsPerKm: 260 },
      { lapNumber: 4, lapDistanceM: 300, cumulativeDistanceM: 1500, lapTimeMs: 77000, totalElapsedMs: 375000, speedKmh: 14.0, paceSecondsPerKm: 257 },
    ],
  },
  {
    id: "run-seed-4",
    student: {
      name: "Anisa Putri Maharani",
      attendanceNumber: "04",
      className: "XII MIPA 1",
      gender: "putri",
    },
    date: new Date(Date.now() - 3600000 * 8).toISOString(),
    totalDistanceM: 1500,
    totalTimeMs: 440000, // 7m 20s
    score: 92,
    gradePredicate: "Baik Sekali (A-)",
    notes: "Irama pernapasan terjaga dengan baik di lap 3.",
    syncedToCloud: true,
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    kmSplits: [
      { kmMarker: 1.0, splitTimeMs: 290000, elapsedTimeMs: 290000, paceSecondsPerKm: 290, speedKmh: 12.4 },
      { kmMarker: 1.5, splitTimeMs: 150000, elapsedTimeMs: 440000, paceSecondsPerKm: 300, speedKmh: 12.0 },
    ],
    laps: [
      { lapNumber: 1, lapDistanceM: 400, cumulativeDistanceM: 400, lapTimeMs: 112000, totalElapsedMs: 112000, speedKmh: 12.8, paceSecondsPerKm: 280 },
      { lapNumber: 2, lapDistanceM: 400, cumulativeDistanceM: 800, lapTimeMs: 117000, totalElapsedMs: 229000, speedKmh: 12.3, paceSecondsPerKm: 292 },
      { lapNumber: 3, lapDistanceM: 400, cumulativeDistanceM: 1200, lapTimeMs: 120000, totalElapsedMs: 349000, speedKmh: 12.0, paceSecondsPerKm: 300 },
      { lapNumber: 4, lapDistanceM: 300, cumulativeDistanceM: 1500, lapTimeMs: 91000, totalElapsedMs: 440000, speedKmh: 11.9, paceSecondsPerKm: 303 },
    ],
  },
  {
    id: "run-seed-5",
    student: {
      name: "Rizky Fauzi",
      attendanceNumber: "23",
      className: "XII IPS 1",
      gender: "putra",
    },
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    totalDistanceM: 1500,
    totalTimeMs: 420000, // 7m 00s
    score: 89,
    gradePredicate: "Baik (B+)",
    notes: "Memenuhi standar kriteria ketuntasan minimal penjasorkes.",
    syncedToCloud: true,
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    kmSplits: [
      { kmMarker: 1.0, splitTimeMs: 275000, elapsedTimeMs: 275000, paceSecondsPerKm: 275, speedKmh: 13.1 },
      { kmMarker: 1.5, splitTimeMs: 145000, elapsedTimeMs: 420000, paceSecondsPerKm: 290, speedKmh: 12.4 },
    ],
    laps: [
      { lapNumber: 1, lapDistanceM: 400, cumulativeDistanceM: 400, lapTimeMs: 105000, totalElapsedMs: 105000, speedKmh: 13.7, paceSecondsPerKm: 262 },
      { lapNumber: 2, lapDistanceM: 400, cumulativeDistanceM: 800, lapTimeMs: 112000, totalElapsedMs: 217000, speedKmh: 12.8, paceSecondsPerKm: 280 },
      { lapNumber: 3, lapDistanceM: 400, cumulativeDistanceM: 1200, lapTimeMs: 118000, totalElapsedMs: 335000, speedKmh: 12.2, paceSecondsPerKm: 295 },
      { lapNumber: 4, lapDistanceM: 300, cumulativeDistanceM: 1500, lapTimeMs: 85000, totalElapsedMs: 420000, speedKmh: 12.7, paceSecondsPerKm: 283 },
    ],
  },
];

function readRuns(): RunSession[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_RUNS, null, 2), "utf-8");
      return DEFAULT_RUNS;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading runs file:", err);
    return DEFAULT_RUNS;
  }
}

function writeRuns(runs: RunSession[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(runs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving runs file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API: Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "Lari 1.5K Cloud Sync API", timestamp: new Date().toISOString() });
  });

  // API: Get all runs
  app.get("/api/runs", (_req: Request, res: Response) => {
    const runs = readRuns();
    res.json({ success: true, count: runs.length, data: runs });
  });

  // API: Save or update run
  app.post("/api/runs", (req: Request, res: Response) => {
    try {
      const run = req.body as RunSession;
      if (!run || !run.student || !run.totalTimeMs) {
        return res.status(400).json({ success: false, message: "Data lari tidak valid" });
      }

      const runs = readRuns();
      const existingIndex = runs.findIndex((r) => r.id === run.id);
      const updatedRun: RunSession = {
        ...run,
        syncedToCloud: true,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        runs[existingIndex] = updatedRun;
      } else {
        runs.unshift(updatedRun);
      }

      writeRuns(runs);
      return res.status(200).json({ success: true, data: updatedRun });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Gagal menyimpan data ke cloud" });
    }
  });

  // API: Bulk Sync
  app.post("/api/sync", (req: Request, res: Response) => {
    try {
      const clientRuns = req.body.runs as RunSession[];
      if (!Array.isArray(clientRuns)) {
        return res.status(400).json({ success: false, message: "Format payload sync tidak valid" });
      }

      const serverRuns = readRuns();
      const runMap = new Map<string, RunSession>();

      serverRuns.forEach((r) => runMap.set(r.id, r));
      clientRuns.forEach((c) => {
        runMap.set(c.id, {
          ...c,
          syncedToCloud: true,
          updatedAt: new Date().toISOString(),
        });
      });

      const mergedRuns = Array.from(runMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      writeRuns(mergedRuns);
      return res.json({
        success: true,
        syncedCount: clientRuns.length,
        totalCount: mergedRuns.length,
        data: mergedRuns,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Sinkronisasi cloud gagal" });
    }
  });

  // API: Leaderboard
  app.get("/api/leaderboard", (req: Request, res: Response) => {
    const runs = readRuns();
    const gender = req.query.gender as string;
    const className = req.query.className as string;

    let filtered = runs;
    if (gender && gender !== "all") {
      filtered = filtered.filter((r) => r.student.gender === gender);
    }
    if (className && className !== "all") {
      filtered = filtered.filter((r) => r.student.className === className);
    }

    // Sort by fastest total time (ascending) and highest score (descending)
    filtered.sort((a, b) => a.totalTimeMs - b.totalTimeMs);

    // Group by student so best personal record is shown or rank all attempts
    const leaderboard = filtered.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    res.json({ success: true, count: leaderboard.length, data: leaderboard });
  });

  // API: Delete all runs (Reset Database)
  app.delete("/api/runs", (_req: Request, res: Response) => {
    writeRuns([]);
    res.json({ success: true, message: "Semua data lari berhasil dihapus", count: 0, data: [] });
  });

  // API: Delete run
  app.delete("/api/runs/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    let runs = readRuns();
    runs = runs.filter((r) => r.id !== id);
    writeRuns(runs);
    res.json({ success: true, message: "Data berhasil dihapus" });
  });

  // API: Reset with fresh seed
  app.post("/api/reset-seeds", (_req: Request, res: Response) => {
    writeRuns(DEFAULT_RUNS);
    res.json({ success: true, count: DEFAULT_RUNS.length, data: DEFAULT_RUNS });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lari 1.5K Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
