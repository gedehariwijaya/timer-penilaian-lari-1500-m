import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { StudentInfo, LapRecord, KmSplit, RunSession, RunMode } from "../types";
import { formatTime, formatPace, calculateRunGrade } from "../utils/grading";
import { audioService } from "../utils/audio";
import { LapRecordTable } from "./LapRecordTable";
import { PerformanceChart } from "./PerformanceChart";
import { EvaluationCard } from "./EvaluationCard";
import {
  Play,
  RotateCcw,
  Flag,
  User,
  UserPlus,
  ClipboardList,
  GraduationCap,
  Hash,
  PenSquare,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle,
  Clock,
  Timer,
  Compass,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface TimerSectionProps {
  onSaveRun: (run: RunSession) => Promise<void>;
  student: StudentInfo;
  onOpenStudentModal: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  darkMode: boolean;
}

export const TimerSection: React.FC<TimerSectionProps> = ({
  onSaveRun,
  student,
  onOpenStudentModal,
  soundEnabled,
  setSoundEnabled,
  darkMode,
}) => {
  // Mode selection: Ujian Lari vs Latihan
  const [runMode, setRunMode] = useState<RunMode>("ujian");
  // Tanggal lari (YYYY-MM-DD)
  const [runDate, setRunDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Waktu Mulai lari (misal: "07:30:15 WIB") untuk meminimalisir kecurangan
  const [runStartTime, setRunStartTime] = useState<string>("");

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentLapNumber, setCurrentLapNumber] = useState(1);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [savedRunResult, setSavedRunResult] = useState<RunSession | null>(null);

  // Split Checkpoints 500m & 1000m untuk akurasi laporan yang tinggi
  const [split500mMs, setSplit500mMs] = useState<number | null>(null);
  const [split1000mMs, setSplit1000mMs] = useState<number | null>(null);
  const [splitBanner, setSplitBanner] = useState<{ message: string; type: "500m" | "1000m" } | null>(null);

  // Modal konfirmasi reset waktu agar tidak terhapus jika salah klik
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  // Track settings: 1500m track is default (1 full 1500m run)
  const [trackMode, setTrackMode] = useState<"track_1500m" | "track_400m" | "track_300m" | "manual_500m">("track_1500m");

  // Cumulative distance achieved
  const [cumulativeDistanceM, setCumulativeDistanceM] = useState(0);

  // Checkpoint audio tracking (keep track of which 500m multiples have announced)
  const announcedCheckpointsRef = useRef<Set<number>>(new Set());

  // High precision timer loop ref based on real wall-clock epoch
  const startEpochRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lapStartTimeRef = useRef<number>(0);

  // Helper formatting jam mulai
  const formatCurrentClock = (d = new Date()): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
  };

  // Restore running timer from session storage if accidental refresh or swipe occurred
  useEffect(() => {
    try {
      const backup = sessionStorage.getItem("active_run_backup");
      if (backup) {
        const parsed = JSON.parse(backup);
        // Only restore if less than 60 minutes old
        if (parsed && parsed.startEpoch && Date.now() - parsed.startEpoch < 3600000) {
          startEpochRef.current = parsed.startEpoch;
          const currentElapsed = Date.now() - parsed.startEpoch;
          setElapsedMs(currentElapsed);
          if (parsed.startTime) setRunStartTime(parsed.startTime);
          if (parsed.runMode) setRunMode(parsed.runMode);
          if (parsed.runDate) setRunDate(parsed.runDate);
          if (parsed.trackMode) setTrackMode(parsed.trackMode);
          if (Array.isArray(parsed.laps)) setLaps(parsed.laps);
          if (parsed.currentLapNumber) setCurrentLapNumber(parsed.currentLapNumber);
          if (parsed.cumulativeDistanceM) setCumulativeDistanceM(parsed.cumulativeDistanceM);
          if (typeof parsed.lapStartTime === "number") lapStartTimeRef.current = parsed.lapStartTime;
          if (typeof parsed.split500mMs === "number") {
            setSplit500mMs(parsed.split500mMs);
            announcedCheckpointsRef.current.add(500);
          }
          if (typeof parsed.split1000mMs === "number") {
            setSplit1000mMs(parsed.split1000mMs);
            announcedCheckpointsRef.current.add(1000);
          }
          setIsRunning(true);
        } else {
          sessionStorage.removeItem("active_run_backup");
        }
      }
    } catch {
      // ignore storage parsing error
    }
  }, []);

  // Prevent accidental unload / back gesture while timer is running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning || (elapsedMs > 0 && !isFinished)) {
        e.preventDefault();
        e.returnValue = "Waktu lari sedang berjalan. Jangan tutup atau segarkan halaman.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, elapsedMs, isFinished]);

  // Track structure definition
  const getLapDistanceForLap = (lapNum: number): number => {
    if (trackMode === "track_1500m") {
      // 1 full 1500m lap
      return 1500;
    } else if (trackMode === "track_400m") {
      // 400 + 400 + 400 + 300 = 1500m (Total 4 laps)
      return lapNum <= 3 ? 400 : 300;
    } else if (trackMode === "track_300m") {
      // 5 laps @ 300m = 1500m
      return 300;
    } else {
      // manual 500m: 3 laps @ 500m = 1500m
      return 500;
    }
  };

  const getTotalLapsForMode = (): number => {
    if (trackMode === "track_1500m") return 1;
    if (trackMode === "track_400m") return 4;
    if (trackMode === "track_300m") return 5;
    return 3;
  };

  // High precision timer loop using real wall-clock time
  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateTimer = () => {
      if (startEpochRef.current !== null) {
        const curElapsed = Date.now() - startEpochRef.current;
        setElapsedMs(curElapsed);
      }
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning]);

  // Handle automatic 500m Checkpoint Audio Announcements
  const checkAndAnnounce500mCheckpoint = (dist: number, timeMs: number) => {
    if (!soundEnabled) return;

    // Check multiples of 500 (500, 1000, 1500)
    const checkpoints = [500, 1000, 1500];
    for (const cp of checkpoints) {
      if (dist >= cp && !announcedCheckpointsRef.current.has(cp)) {
        announcedCheckpointsRef.current.add(cp);
        const speedKmh = ((dist / 1000) / (timeMs / 3600000));
        audioService.announceCheckpoint(cp, timeMs, speedKmh, cp === 1500);
        break;
      }
    }
  };

  // Start Running (Tidak ada jeda saat lari - waktu dihitung terus)
  const handleStart = () => {
    if (isRunning || isFinished) return;

    // Validate that student information is provided
    if (!student.name.trim()) {
      onOpenStudentModal();
      return;
    }

    const nowEpoch = Date.now();
    startEpochRef.current = nowEpoch;
    const timeStr = formatCurrentClock(new Date(nowEpoch));
    setRunStartTime(timeStr);
    lapStartTimeRef.current = 0;
    announcedCheckpointsRef.current.clear();

    if (soundEnabled) {
      audioService.playCountdownBeep(true);
    }

    // Save session backup immediately to prevent data loss on accidental gesture or reload
    try {
      sessionStorage.setItem(
        "active_run_backup",
        JSON.stringify({
          startEpoch: nowEpoch,
          startTime: timeStr,
          runMode,
          runDate,
          student,
          trackMode,
          laps: [],
          currentLapNumber: 1,
          cumulativeDistanceM: 0,
          lapStartTime: 0,
        })
      );
    } catch {
      // ignore
    }

    setIsRunning(true);
  };

  // Record a Lap
  const handleRecordLap = () => {
    if (!isRunning || isFinished) return;

    const lapDist = getLapDistanceForLap(currentLapNumber);
    const newCumulative = Math.min(1500, cumulativeDistanceM + lapDist);
    const lapTimeMs = elapsedMs - lapStartTimeRef.current;

    const speedKmh = lapTimeMs > 0 ? (lapDist / 1000) / (lapTimeMs / 3600000) : 0;
    const paceSec = lapDist > 0 ? (lapTimeMs / 1000) / (lapDist / 1000) : 0;

    const newRecord: LapRecord = {
      lapNumber: currentLapNumber,
      lapDistanceM: lapDist,
      cumulativeDistanceM: newCumulative,
      lapTimeMs,
      totalElapsedMs: elapsedMs,
      speedKmh,
      paceSecondsPerKm: paceSec,
    };

    const updatedLaps = [...laps, newRecord];
    setLaps(updatedLaps);
    setCumulativeDistanceM(newCumulative);
    lapStartTimeRef.current = elapsedMs;

    // Update session backup
    try {
      sessionStorage.setItem(
        "active_run_backup",
        JSON.stringify({
          startEpoch: startEpochRef.current,
          startTime: runStartTime,
          runMode,
          runDate,
          student,
          trackMode,
          laps: updatedLaps,
          currentLapNumber: currentLapNumber + 1,
          cumulativeDistanceM: newCumulative,
          lapStartTime: elapsedMs,
        })
      );
    } catch {
      // ignore
    }

    // Check 500m audio alert
    checkAndAnnounce500mCheckpoint(newCumulative, elapsedMs);

    // If reached 1500m, complete the test
    if (newCumulative >= 1500 || currentLapNumber >= getTotalLapsForMode()) {
      finishTest(updatedLaps, elapsedMs);
    } else {
      setCurrentLapNumber((prev) => prev + 1);
      if (soundEnabled) {
        audioService.playCheckpointChime();
      }
    }
  };

  // Manual Finish
  const handleManualFinish = () => {
    if (elapsedMs === 0) return;

    let finalLaps = [...laps];
    if (finalLaps.length === 0 || cumulativeDistanceM < 1500) {
      const remainingDist = 1500 - cumulativeDistanceM;
      const lastLapTime = elapsedMs - lapStartTimeRef.current;
      const speedKmh = lastLapTime > 0 ? (remainingDist / 1000) / (lastLapTime / 3600000) : 0;
      const paceSec = remainingDist > 0 ? (lastLapTime / 1000) / (remainingDist / 1000) : 0;

      finalLaps.push({
        lapNumber: currentLapNumber,
        lapDistanceM: remainingDist > 0 ? remainingDist : 300,
        cumulativeDistanceM: 1500,
        lapTimeMs: lastLapTime,
        totalElapsedMs: elapsedMs,
        speedKmh,
        paceSecondsPerKm: paceSec,
      });
    }

    setCumulativeDistanceM(1500);
    finishTest(finalLaps, elapsedMs);
  };

  // Record Split (Saat mencapai checkpoint 500m atau 1.000m)
  const handleRecordSplit = (checkpointDist: 500 | 1000) => {
    if (!isRunning || isFinished) return;

    if (checkpointDist === 500) {
      if (split500mMs !== null) return;
      const timeMs = elapsedMs;
      setSplit500mMs(timeMs);
      setCumulativeDistanceM((prev) => Math.max(prev, 500));
      announcedCheckpointsRef.current.add(500);

      const speed500 = 0.5 / (timeMs / 3600000);
      if (soundEnabled) {
        audioService.announceCheckpoint(500, timeMs, speed500);
      }

      setSplitBanner({
        message: `Split 500m Berhasil Dicatat: ${formatTime(timeMs)} (Pace: ${formatPace((timeMs / 1000) / 0.5)}/km)`,
        type: "500m",
      });
      setTimeout(() => setSplitBanner(null), 5000);

      const splitLap1: LapRecord = {
        lapNumber: 1,
        lapDistanceM: 500,
        cumulativeDistanceM: 500,
        lapTimeMs: timeMs,
        totalElapsedMs: timeMs,
        speedKmh: speed500,
        paceSecondsPerKm: (timeMs / 1000) / 0.5,
      };

      setLaps((prev) => (prev.length === 0 ? [splitLap1] : prev));
      lapStartTimeRef.current = timeMs;

      try {
        sessionStorage.setItem(
          "active_run_backup",
          JSON.stringify({
            startEpoch: startEpochRef.current,
            startTime: runStartTime,
            runMode,
            runDate,
            student,
            trackMode,
            laps: laps.length === 0 ? [splitLap1] : laps,
            currentLapNumber: 2,
            cumulativeDistanceM: Math.max(cumulativeDistanceM, 500),
            lapStartTime: timeMs,
            split500mMs: timeMs,
            split1000mMs,
          })
        );
      } catch {
        // ignore
      }
    } else if (checkpointDist === 1000) {
      if (split1000mMs !== null) return;
      const timeMs = elapsedMs;
      setSplit1000mMs(timeMs);
      setCumulativeDistanceM((prev) => Math.max(prev, 1000));
      announcedCheckpointsRef.current.add(1000);

      const prevSplitMs = split500mMs || Math.round(timeMs / 2);
      const segmentTime = Math.max(1000, timeMs - prevSplitMs);
      const speedSeg = 0.5 / (segmentTime / 3600000);
      const speed1000 = 1.0 / (timeMs / 3600000);

      if (soundEnabled) {
        audioService.announceCheckpoint(1000, timeMs, speed1000);
      }

      setSplitBanner({
        message: `Split 1.000m Berhasil Dicatat: ${formatTime(timeMs)} (Waktu Segmen: ${formatTime(segmentTime)})`,
        type: "1000m",
      });
      setTimeout(() => setSplitBanner(null), 5000);

      const splitLap2: LapRecord = {
        lapNumber: 2,
        lapDistanceM: 500,
        cumulativeDistanceM: 1000,
        lapTimeMs: segmentTime,
        totalElapsedMs: timeMs,
        speedKmh: speedSeg,
        paceSecondsPerKm: (segmentTime / 1000) / 0.5,
      };

      setLaps((prev) => {
        if (prev.length === 0) {
          const splitLap1: LapRecord = {
            lapNumber: 1,
            lapDistanceM: 500,
            cumulativeDistanceM: 500,
            lapTimeMs: prevSplitMs,
            totalElapsedMs: prevSplitMs,
            speedKmh: 0.5 / (prevSplitMs / 3600000),
            paceSecondsPerKm: (prevSplitMs / 1000) / 0.5,
          };
          return [splitLap1, splitLap2];
        }
        if (prev.length === 1) return [...prev, splitLap2];
        return prev;
      });
      lapStartTimeRef.current = timeMs;

      try {
        sessionStorage.setItem(
          "active_run_backup",
          JSON.stringify({
            startEpoch: startEpochRef.current,
            startTime: runStartTime,
            runMode,
            runDate,
            student,
            trackMode,
            laps,
            currentLapNumber: 3,
            cumulativeDistanceM: Math.max(cumulativeDistanceM, 1000),
            lapStartTime: timeMs,
            split500mMs,
            split1000mMs: timeMs,
          })
        );
      } catch {
        // ignore
      }
    }
  };

  // Finish logic
  const finishTest = (finalLaps: LapRecord[], totalMs: number) => {
    setIsRunning(false);
    setIsFinished(true);

    // Clear active session backup now that test is officially finished
    try {
      sessionStorage.removeItem("active_run_backup");
    } catch {
      // ignore
    }

    if (soundEnabled) {
      audioService.playFinishFanfare();
      const avgSpeedKmh = ((1.5) / (totalMs / 3600000));
      audioService.announceCheckpoint(1500, totalMs, avgSpeedKmh, true);
    }

    // Celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // If trackMode is track_1500m or if splits were marked, construct detailed 3 laps
    let evaluatedLaps = finalLaps;
    if (trackMode === "track_1500m" || finalLaps.length <= 1) {
      const s500 = split500mMs || Math.round(totalMs * (500 / 1500));
      const s1000 = (split1000mMs && split1000mMs > s500) ? split1000mMs : Math.round(totalMs * (1000 / 1500));
      const seg1 = s500;
      const seg2 = Math.max(1000, s1000 - s500);
      const seg3 = Math.max(1000, totalMs - s1000);

      evaluatedLaps = [
        {
          lapNumber: 1,
          lapDistanceM: 500,
          cumulativeDistanceM: 500,
          lapTimeMs: seg1,
          totalElapsedMs: s500,
          speedKmh: 0.5 / (seg1 / 3600000),
          paceSecondsPerKm: (seg1 / 1000) / 0.5,
        },
        {
          lapNumber: 2,
          lapDistanceM: 500,
          cumulativeDistanceM: 1000,
          lapTimeMs: seg2,
          totalElapsedMs: s1000,
          speedKmh: 0.5 / (seg2 / 3600000),
          paceSecondsPerKm: (seg2 / 1000) / 0.5,
        },
        {
          lapNumber: 3,
          lapDistanceM: 500,
          cumulativeDistanceM: 1500,
          lapTimeMs: seg3,
          totalElapsedMs: totalMs,
          speedKmh: 0.5 / (seg3 / 3600000),
          paceSecondsPerKm: (seg3 / 1000) / 0.5,
        },
      ];
    }

    // Calculate KM Splits (KM 0.5, KM 1.0 & KM 1.5)
    const kmSplits = calculateKmSplits(evaluatedLaps, totalMs);
    const evalRes = calculateRunGrade(totalMs, student.gender);

    const recordedStartTime = runStartTime || formatCurrentClock();

    const s500Val = typeof split500mMs === "number" ? split500mMs : kmSplits[0]?.splitTimeMs;
    const s1000Val = typeof split1000mMs === "number" ? split1000mMs : kmSplits[1]?.elapsedTimeMs;

    const runSession: RunSession = {
      id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      mode: runMode,
      runDate: runDate || new Date().toISOString().slice(0, 10),
      student,
      date: new Date().toISOString(),
      startTime: recordedStartTime,
      totalDistanceM: 1500,
      totalTimeMs: totalMs,
      ...(typeof s500Val === "number" ? { split500mMs: s500Val } : {}),
      ...(typeof s1000Val === "number" ? { split1000mMs: s1000Val } : {}),
      laps: evaluatedLaps,
      kmSplits,
      score: evalRes.score,
      gradePredicate: evalRes.predicate,
      notes: evalRes.description,
      syncedToCloud: false,
      updatedAt: new Date().toISOString(),
    };

    setSavedRunResult(runSession);
    // Auto-save to cloud & local
    onSaveRun(runSession);
  };

  // Calculate KM 0.5, KM 1.0, and KM 1.5 splits
  const calculateKmSplits = (lapsData: LapRecord[], totalMs: number): KmSplit[] => {
    let s500Ms = split500mMs || 0;
    if (!s500Ms) {
      let accDist = 0;
      for (const lap of lapsData) {
        accDist += lap.lapDistanceM;
        if (accDist >= 500) {
          s500Ms = lap.totalElapsedMs;
          break;
        }
      }
    }
    if (!s500Ms || s500Ms >= totalMs) {
      s500Ms = Math.round(totalMs * (500 / 1500));
    }

    let s1000Ms = split1000mMs || 0;
    if (!s1000Ms) {
      let accDist = 0;
      for (const lap of lapsData) {
        accDist += lap.lapDistanceM;
        if (accDist >= 1000) {
          s1000Ms = lap.totalElapsedMs;
          break;
        }
      }
    }
    if (!s1000Ms || s1000Ms <= s500Ms || s1000Ms >= totalMs) {
      s1000Ms = Math.round(totalMs * (1000 / 1500));
    }

    const seg1Time = s500Ms;
    const seg2Time = Math.max(1000, s1000Ms - s500Ms);
    const seg3Time = Math.max(1000, totalMs - s1000Ms);

    return [
      {
        kmMarker: 0.5,
        splitTimeMs: seg1Time,
        elapsedTimeMs: s500Ms,
        speedKmh: 0.5 / (seg1Time / 3600000),
        paceSecondsPerKm: (seg1Time / 1000) / 0.5,
      },
      {
        kmMarker: 1.0,
        splitTimeMs: seg2Time,
        elapsedTimeMs: s1000Ms,
        speedKmh: 0.5 / (seg2Time / 3600000),
        paceSecondsPerKm: (seg2Time / 1000) / 0.5,
      },
      {
        kmMarker: 1.5,
        splitTimeMs: seg3Time,
        elapsedTimeMs: totalMs,
        speedKmh: 0.5 / (seg3Time / 3600000),
        paceSecondsPerKm: (seg3Time / 1000) / 0.5,
      },
    ];
  };

  // Request Reset with safety confirmation
  const handleRequestReset = () => {
    if (isRunning || elapsedMs > 0) {
      setShowConfirmResetModal(true);
    } else {
      executeReset();
    }
  };

  // Execute Actual Reset
  const executeReset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    setRunStartTime("");
    setSplit500mMs(null);
    setSplit1000mMs(null);
    setSplitBanner(null);
    setCurrentLapNumber(1);
    setLaps([]);
    setCumulativeDistanceM(0);
    setIsFinished(false);
    setSavedRunResult(null);
    setShowConfirmResetModal(false);
    announcedCheckpointsRef.current.clear();
    lapStartTimeRef.current = 0;
    startEpochRef.current = null;
    try {
      sessionStorage.removeItem("active_run_backup");
    } catch {
      // ignore
    }
  };

  // Live Calculations
  const currentSpeedKmh =
    elapsedMs > 5000 && cumulativeDistanceM > 0
      ? ((cumulativeDistanceM / 1000) / (elapsedMs / 3600000)).toFixed(1)
      : "--.-";

  const currentPace =
    elapsedMs > 5000 && cumulativeDistanceM > 0
      ? formatPace((elapsedMs / 1000) / (cumulativeDistanceM / 1000))
      : "--:--";

  const totalLapsTarget = getTotalLapsForMode();
  const progressPercent = Math.min(100, (cumulativeDistanceM / 1500) * 100);

  return (
    <div className="space-y-4 sm:space-y-6 overscroll-contain touch-manipulation">
      {/* Top Bar: Mode Selector & Tanggal Lari */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Toggle Mode: Ujian Lari vs Latihan */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
          <button
            id="btn-mode-ujian"
            disabled={isRunning}
            onClick={() => setRunMode("ujian")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 ${
              runMode === "ujian"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🏃 Mode Ujian Lari
          </button>
          <button
            id="btn-mode-latihan"
            disabled={isRunning}
            onClick={() => setRunMode("latihan")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 ${
              runMode === "latihan"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            👟 Mode Latihan
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Active Mode Highlight Badge */}
          {runMode === "ujian" ? (
            <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>UJIAN RESMI</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>LATIHAN</span>
            </span>
          )}

          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanggal:</span>
            </span>
            <input
              type="date"
              disabled={isRunning}
              value={runDate}
              onChange={(e) => setRunDate(e.target.value)}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Student Identity Card / Registration Prompt */}
      {!student.name.trim() ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-slate-900 dark:to-amber-950/20 border-2 border-amber-300/80 dark:border-amber-700/60 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                Identitas Siswa Belum Diatur
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wajib isi nama, kelas, no. absen, & gender sebelum lari
              </p>
            </div>
          </div>

          <button
            id="btn-register-student-prompt"
            onClick={onOpenStudentModal}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] shrink-0"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Isi Data Siswa</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-lg border border-emerald-200 dark:border-emerald-800 shadow-xs shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate max-w-[160px] sm:max-w-none">
                  {student.name}
                </span>
                <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                  <GraduationCap className="w-3 h-3 text-slate-500" />
                  <span>{student.className}</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                  <Hash className="w-3 h-3 text-slate-500" />
                  <span>Absen: {student.attendanceNumber || "-"}</span>
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ${
                    student.gender === "putra"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {student.gender === "putra" ? "Putra" : "Putri"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
            {/* Track Mode Selector */}
            <select
              id="select-track-mode"
              disabled={isRunning || elapsedMs > 0}
              value={trackMode}
              onChange={(e) =>
                setTrackMode(
                  e.target.value as "track_1500m" | "track_400m" | "track_300m" | "manual_500m"
                )
              }
              className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-60 focus:outline-hidden"
            >
              <option value="track_1500m">Lintasan 1500m (1 Putaran)</option>
              <option value="track_400m">Lintasan 400m (4 Putaran)</option>
              <option value="track_300m">Lintasan 300m (5 Putaran)</option>
              <option value="manual_500m">Segmen 500m (3 Putaran)</option>
            </select>

            <button
              id="btn-open-student-modal"
              disabled={isRunning}
              onClick={onOpenStudentModal}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50 flex items-center space-x-1 whitespace-nowrap"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Ganti</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Stopwatch Card */}
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-7 text-center relative overflow-hidden transition-all select-none ${
          runMode === "ujian"
            ? "border-2 border-red-500/80 dark:border-red-600/80 shadow-lg shadow-red-500/10 ring-4 ring-red-500/5"
            : "border border-slate-200 dark:border-slate-800 shadow-sm"
        }`}
      >
        {/* Subtle Background Glow for Running state */}
        {isRunning && (
          <div
            className={`absolute inset-0 pointer-events-none animate-pulse ${
              runMode === "ujian" ? "bg-red-500/10" : "bg-emerald-500/5"
            }`}
          />
        )}

        {/* Status & Waktu Mulai Bar (Meminimalisir Kecurangan) */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {runStartTime ? (
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Waktu Mulai:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{runStartTime}</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs font-medium border border-slate-100 dark:border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Waktu mulai akan otomatis dicatat saat mulai lari</span>
            </div>
          )}

          {isRunning && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-0.5" />
              <span>Sedang Berlari (Waktu Nyata - Tanpa Jeda)</span>
            </div>
          )}
        </div>

        {/* Big Stopwatch Display */}
        <div className="my-1 sm:my-2">
          <div
            id="stopwatch-display"
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums drop-shadow-xs"
          >
            {formatTime(elapsedMs)}
          </div>
          <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-slate-400 mt-1">
            Menit : Detik . Milidetik
          </div>
        </div>

        {/* Banner Notifikasi Split Real-Time */}
        {splitBanner && (
          <div className="my-2 p-2.5 max-w-lg mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/90 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-bold flex items-center justify-center space-x-2 animate-in fade-in duration-200 shadow-xs">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{splitBanner.message}</span>
          </div>
        )}

        {/* Distance Progress Bar with 500m, 1000m, 1500m Pins */}
        <div className="max-w-2xl mx-auto my-4 sm:my-6 px-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
            <span>{cumulativeDistanceM} m</span>
            <span
              className={
                runMode === "ujian"
                  ? "text-red-600 dark:text-red-400 font-extrabold"
                  : "text-emerald-600 dark:text-emerald-400"
              }
            >
              {progressPercent.toFixed(0)}% Selesai
            </span>
            <span>Target: 1.500 m</span>
          </div>

          <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                runMode === "ujian"
                  ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-400"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Checkpoint Indicators (Interaktif untuk Split 500m & 1.000m) */}
          <div className="flex justify-between items-center text-[10px] sm:text-xs font-semibold text-slate-400 mt-2 px-0.5">
            <span>0m (Start)</span>

            {/* Checkpoint 500m */}
            {split500mMs !== null ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                <CheckCircle className="w-3 h-3 text-blue-600" />
                <span>Split 500m ({formatTime(split500mMs)})</span>
              </span>
            ) : isRunning ? (
              <button
                type="button"
                onClick={() => handleRecordSplit(500)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 transition active:scale-95 shadow-2xs cursor-pointer animate-pulse"
                title="Klik untuk rekam Split 500m"
              >
                <Timer className="w-3 h-3 text-blue-500" />
                <span>🔔 500m (Klik Split)</span>
              </button>
            ) : (
              <span className={cumulativeDistanceM >= 500 ? (runMode === "ujian" ? "text-red-600 font-bold" : "text-emerald-600 font-bold") : ""}>
                🔔 500m
              </span>
            )}

            {/* Checkpoint 1000m */}
            {split1000mMs !== null ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                <CheckCircle className="w-3 h-3 text-indigo-600" />
                <span>Split 1.000m ({formatTime(split1000mMs)})</span>
              </span>
            ) : isRunning ? (
              <button
                type="button"
                onClick={() => handleRecordSplit(1000)}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-indigo-600 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 transition active:scale-95 shadow-2xs cursor-pointer ${
                  split500mMs !== null
                    ? "bg-indigo-100/90 hover:bg-indigo-200/90 dark:bg-indigo-950/90 dark:hover:bg-indigo-900/90 animate-pulse"
                    : "bg-indigo-50/60 hover:bg-indigo-100/60 dark:bg-indigo-950/40"
                }`}
                title="Klik untuk rekam Split 1.000m"
              >
                <Timer className="w-3 h-3 text-indigo-500" />
                <span>🔔 1.000m (Klik Split)</span>
              </button>
            ) : (
              <span className={cumulativeDistanceM >= 1000 ? (runMode === "ujian" ? "text-red-600 font-bold" : "text-emerald-600 font-bold") : ""}>
                🔔 1.000m
              </span>
            )}

            {/* Garis Finish */}
            <span
              className={
                cumulativeDistanceM >= 1500
                  ? runMode === "ujian"
                    ? "text-red-600 dark:text-red-400 font-bold"
                    : "text-emerald-600 dark:text-emerald-400 font-bold"
                  : ""
              }
            >
              🏁 Garis Finish (1.500m)
            </span>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-3 max-w-xl mx-auto gap-2 sm:gap-3 my-3 sm:my-5 py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <div>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate block">
              Putaran
            </span>
            <p className="text-base sm:text-xl font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
              Lap {currentLapNumber} <span className="text-[11px] sm:text-xs text-slate-400 font-normal">/{totalLapsTarget}</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate block">
              Kecepatan
            </span>
            <p className="text-base sm:text-xl font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
              {currentSpeedKmh} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">km/j</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate block">
              Pace
            </span>
            <p className="text-base sm:text-xl font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
              {currentPace}
            </p>
          </div>
        </div>

        {/* Main Action Buttons (Tanpa Fitur Jeda Saat Lari) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 pt-2">
          {/* 1. KONDISI SEBELUM LARI: Tombol Mulai */}
          {!isRunning && !isFinished && elapsedMs === 0 && (
            <button
              id="btn-timer-start"
              onClick={handleStart}
              className={`py-3.5 px-6 sm:px-8 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-lg transition-all active:scale-95 shrink-0 ${
                runMode === "ujian"
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/35 ring-4 ring-red-500/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-4 ring-emerald-500/20"
              }`}
            >
              <Play className="w-5 h-5 fill-current shrink-0" />
              <span className="whitespace-nowrap">
                {runMode === "ujian" ? "Mulai Ujian Lari" : "Mulai Latihan Lari"}
              </span>
            </button>
          )}

          {/* 2. KONDISI SEDANG LARI (BERJALAN TANPA JEDA): Tombol Split 500m, Split 1.000m, & Selesai */}
          {isRunning && !isFinished && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {/* Tombol Split 500m */}
              <button
                id="btn-split-500m"
                type="button"
                onClick={() => handleRecordSplit(500)}
                disabled={split500mMs !== null}
                className={`py-3 px-3.5 sm:px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-md shrink-0 ${
                  split500mMs !== null
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 ring-2 ring-blue-500/20"
                }`}
              >
                <Timer className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {split500mMs !== null
                    ? `✓ Split 500m (${formatTime(split500mMs)})`
                    : "⏱️ Split 500m"}
                </span>
              </button>

              {/* Tombol Split 1.000m */}
              <button
                id="btn-split-1000m"
                type="button"
                onClick={() => handleRecordSplit(1000)}
                disabled={split1000mMs !== null}
                className={`py-3 px-3.5 sm:px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-md shrink-0 ${
                  split1000mMs !== null
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80"
                    : split500mMs !== null
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 ring-4 ring-indigo-500/20 animate-pulse"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 ring-2 ring-indigo-500/15"
                }`}
              >
                <Timer className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {split1000mMs !== null
                    ? `✓ Split 1.000m (${formatTime(split1000mMs)})`
                    : "⏱️ Split 1.000m"}
                </span>
              </button>

              {/* Tombol Utama Finish / Selesai (1.500m) atau Rekam Lap */}
              <button
                id="btn-timer-record-lap"
                type="button"
                onClick={trackMode === "track_1500m" ? handleManualFinish : handleRecordLap}
                className={`py-3.5 px-5 sm:px-8 rounded-2xl font-black text-sm sm:text-base text-white shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95 shrink-0 ${
                  runMode === "ujian"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/35 ring-4 ring-red-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/35 ring-4 ring-emerald-500/20"
                }`}
              >
                <Flag className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">
                  {trackMode === "track_1500m"
                    ? "🏁 Garis Finish (1.500m)"
                    : `Rekam Lap ${currentLapNumber}`}
                </span>
              </button>

              {/* Tombol manual finish jika bukan track 1500m dan sudah lebih dari 5 detik */}
              {trackMode !== "track_1500m" && elapsedMs > 5000 && (
                <button
                  id="btn-timer-finish"
                  type="button"
                  onClick={handleManualFinish}
                  className="py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-sm flex items-center justify-center space-x-1.5 transition shrink-0"
                >
                  <CheckCircle
                    className={`w-4 h-4 shrink-0 ${
                      runMode === "ujian" ? "text-red-400" : "text-emerald-400"
                    }`}
                  />
                  <span className="whitespace-nowrap">
                    {runMode === "ujian" ? "Selesai Ujian" : "Selesai Latihan"}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* 3. KONDISI SELESAI: Tombol Ulangi / Siswa Baru */}
          {isFinished && (
            <button
              id="btn-timer-new-student"
              onClick={executeReset}
              className="py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95 shrink-0"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">Siswa Baru / Ulangi</span>
            </button>
          )}

          {/* Tombol Reset (Dilindungi Konfirmasi agar tidak ter-reset saat salah klik atau geser layar) */}
          {(elapsedMs > 0 || isFinished) && (
            <button
              id="btn-timer-reset"
              onClick={handleRequestReset}
              title="Reset Timer (Perlu Konfirmasi)"
              className="p-3.5 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition active:scale-95 shrink-0"
            >
              <RotateCcw className="w-5 h-5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Finished State: Detailed Evaluation, Splits, and Charts */}
      {isFinished && savedRunResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Automatic Grade 80 - 100 Result Card */}
          <EvaluationCard run={savedRunResult} />

          {/* KM Splits and Performance Chart */}
          <PerformanceChart run={savedRunResult} darkMode={darkMode} />
        </div>
      )}

      {/* Recorded Laps Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock
              className={`w-5 h-5 ${
                runMode === "ujian" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            />
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Rekaman Waktu Putaran ({runMode === "ujian" ? "Ujian 1.500m" : "Latihan"})
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {laps.length} Putaran Tercatat
          </span>
        </div>

        <LapRecordTable laps={laps} targetLaps={totalLapsTarget} mode={runMode} />
      </div>

      {/* Modal Konfirmasi Reset Timer (Mencegah Salah Klik & Tidak Sengaja Menggeser Layar) */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Konfirmasi Reset Waktu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Waktu lari sedang berjalan ({formatTime(elapsedMs)}). Apakah Anda yakin ingin membatalkan dan mereset sesi lari ini?
                </p>
                <div className="my-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">{student.name}</span>
                  {runStartTime && (
                    <span className="text-slate-500 dark:text-slate-400"> • Mulai: {runStartTime}</span>
                  )}
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                  Waktu lari tetap berjalan di latar belakang jika Anda membatalkan dialog ini.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Batal (Lanjutkan Lari)
              </button>
              <button
                type="button"
                onClick={executeReset}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
              >
                Ya, Reset Waktu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
