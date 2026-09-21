import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { StudentInfo, LapRecord, KmSplit, RunSession } from "../types";
import { formatTime, formatPace, calculateRunGrade } from "../utils/grading";
import { audioService } from "../utils/audio";
import { LapRecordTable } from "./LapRecordTable";
import { PerformanceChart } from "./PerformanceChart";
import { EvaluationCard } from "./EvaluationCard";
import {
  Play,
  Pause,
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
  Compass,
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
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentLapNumber, setCurrentLapNumber] = useState(1);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [savedRunResult, setSavedRunResult] = useState<RunSession | null>(null);

  // Track settings: 400m track (standard athletic stadium) has 4 laps (400, 400, 400, 300) = 1500m
  const [trackMode, setTrackMode] = useState<"track_400m" | "track_300m" | "manual_500m">("track_400m");

  // Cumulative distance achieved
  const [cumulativeDistanceM, setCumulativeDistanceM] = useState(0);

  // Checkpoint audio tracking (keep track of which 500m multiples have announced)
  const announcedCheckpointsRef = useRef<Set<number>>(new Set());

  // High precision timer loop ref
  const lastTickTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lapStartTimeRef = useRef<number>(0);

  // Track structure definition
  const getLapDistanceForLap = (lapNum: number): number => {
    if (trackMode === "track_400m") {
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
    if (trackMode === "track_400m") return 4;
    if (trackMode === "track_300m") return 5;
    return 3;
  };

  // Timer Tick Loop
  useEffect(() => {
    if (!isRunning) {
      lastTickTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateTimer = (now: number) => {
      if (lastTickTimeRef.current !== null) {
        const delta = now - lastTickTimeRef.current;
        setElapsedMs((prev) => {
          const next = prev + delta;
          return next;
        });
      }
      lastTickTimeRef.current = now;
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

  // Start / Pause
  const handleTogglePlay = () => {
    if (!isRunning) {
      // Validate that student information is provided
      if (!student.name.trim()) {
        onOpenStudentModal();
        return;
      }

      // Start
      if (elapsedMs === 0) {
        lapStartTimeRef.current = 0;
        announcedCheckpointsRef.current.clear();
        if (soundEnabled) {
          audioService.playCountdownBeep(true);
        }
      }
      setIsRunning(true);
    } else {
      // Pause
      setIsRunning(false);
    }
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

  // Finish logic
  const finishTest = (finalLaps: LapRecord[], totalMs: number) => {
    setIsRunning(false);
    setIsFinished(true);

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
    } catch (e) {
      // ignore
    }

    // Calculate KM Splits (KM 1.0 & KM 1.5)
    const kmSplits = calculateKmSplits(finalLaps, totalMs);
    const evalRes = calculateRunGrade(totalMs, student.gender);

    const runSession: RunSession = {
      id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      student,
      date: new Date().toISOString(),
      totalDistanceM: 1500,
      totalTimeMs: totalMs,
      laps: finalLaps,
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

  // Calculate KM 1.0 and KM 1.5 splits
  const calculateKmSplits = (lapsData: LapRecord[], totalMs: number): KmSplit[] => {
    // Find when 1000m was crossed
    let km1TimeMs = 0;
    let distAcc = 0;

    for (const lap of lapsData) {
      distAcc += lap.lapDistanceM;
      if (distAcc >= 1000 && km1TimeMs === 0) {
        km1TimeMs = lap.totalElapsedMs;
        break;
      }
    }

    if (km1TimeMs === 0) {
      // Estimate 66.6% of total
      km1TimeMs = Math.round(totalMs * (1000 / 1500));
    }

    const km1_5SplitMs = Math.max(0, totalMs - km1TimeMs);
    const speedKm1 = (1.0) / (km1TimeMs / 3600000);
    const paceKm1 = (km1TimeMs / 1000);

    const speedKm1_5 = (0.5) / (km1_5SplitMs / 3600000);
    const paceKm1_5 = (km1_5SplitMs / 1000) / 0.5;

    return [
      {
        kmMarker: 1.0,
        splitTimeMs: km1TimeMs,
        elapsedTimeMs: km1TimeMs,
        speedKmh: speedKm1,
        paceSecondsPerKm: paceKm1,
      },
      {
        kmMarker: 1.5,
        splitTimeMs: km1_5SplitMs,
        elapsedTimeMs: totalMs,
        speedKmh: speedKm1_5,
        paceSecondsPerKm: paceKm1_5,
      },
    ];
  };

  // Reset Timer
  const handleReset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    setCurrentLapNumber(1);
    setLaps([]);
    setCumulativeDistanceM(0);
    setIsFinished(false);
    setSavedRunResult(null);
    announcedCheckpointsRef.current.clear();
    lapStartTimeRef.current = 0;
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
    <div className="space-y-4 sm:space-y-6">
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
              onChange={(e) => setTrackMode(e.target.value as "track_400m" | "track_300m" | "manual_500m")}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-60 focus:outline-hidden"
            >
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-sm text-center relative overflow-hidden">
        {/* Subtle Background Glow for Running state */}
        {isRunning && (
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none animate-pulse" />
        )}

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

        {/* Distance Progress Bar with 500m, 1000m, 1500m Pins */}
        <div className="max-w-2xl mx-auto my-4 sm:my-6 px-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
            <span>{cumulativeDistanceM} m</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {progressPercent.toFixed(0)}% Selesai
            </span>
            <span>Target: 1.500 m</span>
          </div>

          <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Checkpoint Indicators */}
          <div className="flex justify-between text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-1.5 px-0.5">
            <span>0m</span>
            <span className={cumulativeDistanceM >= 500 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
              🔔 500m
            </span>
            <span className={cumulativeDistanceM >= 1000 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
              🔔 1.000m
            </span>
            <span className={cumulativeDistanceM >= 1500 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
              🏁 1.500m
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

        {/* Main Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2">
          {/* Start / Pause */}
          <button
            id="btn-timer-start-pause"
            onClick={handleTogglePlay}
            disabled={isFinished}
            className={`py-3 px-5 sm:px-6 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0 ${
              isRunning
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
                <span className="whitespace-nowrap">Jeda</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
                <span className="whitespace-nowrap">{elapsedMs > 0 ? "Lanjutkan" : "Mulai Lari"}</span>
              </>
            )}
          </button>

          {/* Record Lap Button */}
          {isRunning && (
            <button
              id="btn-timer-record-lap"
              onClick={handleRecordLap}
              className="py-3 px-4 sm:px-6 rounded-2xl font-extrabold text-sm sm:text-base bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 flex items-center justify-center space-x-1.5 transition-all active:scale-95 shrink-0"
            >
              <Flag className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="whitespace-nowrap">Rekam Lap {currentLapNumber}</span>
            </button>
          )}

          {/* Selesai / Finish Manual */}
          {!isFinished && elapsedMs > 5000 && (
            <button
              id="btn-timer-finish"
              onClick={handleManualFinish}
              className="py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-sm flex items-center justify-center space-x-1.5 transition shrink-0"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Selesai Ujian</span>
            </button>
          )}

          {/* Reset Button */}
          {(elapsedMs > 0 || isFinished) && (
            <button
              id="btn-timer-reset"
              onClick={handleReset}
              title="Reset Timer"
              className="p-3 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shrink-0"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
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
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Rekaman Waktu Putaran (Lap Splits)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {laps.length} Putaran Tercatat
          </span>
        </div>

        <LapRecordTable laps={laps} targetLaps={totalLapsTarget} />
      </div>
    </div>
  );
};
