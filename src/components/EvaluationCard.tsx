import React from "react";
import { RunSession } from "../types";
import { calculateRunGrade, formatTime, formatPace } from "../utils/grading";
import { exportStudentRunToPDF } from "../utils/pdfExport";
import { Award, FileDown, CheckCircle2, Cloud, User, Calendar, Flame } from "lucide-react";

interface EvaluationCardProps {
  run: RunSession;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ run }) => {
  const evalResult = calculateRunGrade(run.totalTimeMs, run.student.gender);
  const avgSpeedKmh = ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(2);
  const avgPaceSec = (run.totalTimeMs / 1000) / (run.totalDistanceM / 1000);

  const handleExportPDF = () => {
    exportStudentRunToPDF(run);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs transition-all">
      {/* Top Banner with Student Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              Evaluasi Ujian 1.500m
            </span>
            {run.syncedToCloud && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center">
                <Cloud className="w-3 h-3 mr-1 text-emerald-500" /> Cloud
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center space-x-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {run.student.name}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              {run.student.className}
            </span>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
            <span>No. Absen: {run.student.attendanceNumber || run.student.studentId || "-"}</span>
            <span>•</span>
            <span>{run.student.gender === "putra" ? "Putra" : "Putri"}</span>
            <span>•</span>
            <span className="inline-flex items-center">
              <Calendar className="w-3 h-3 mr-1 shrink-0" />
              {new Date(run.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <button
          id="btn-export-single-pdf"
          onClick={handleExportPDF}
          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] w-full sm:w-auto shrink-0"
        >
          <FileDown className="w-4 h-4" />
          <span>Ekspor PDF</span>
        </button>
      </div>

      {/* Main Score Hero Block */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 my-4 sm:my-6 items-center">
        {/* Score Display (80 - 100) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-emerald-50/40 dark:from-slate-800/80 dark:to-emerald-950/20 border border-slate-200/80 dark:border-slate-700 text-center">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-emerald-500/30 flex items-center justify-center bg-white dark:bg-slate-900 shadow-inner">
              <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {evalResult.score}
              </span>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-2.5">
            Nilai Ujian (80 - 100)
          </span>

          <div className="mt-1.5 inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border bg-white dark:bg-slate-900 shadow-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
            {evalResult.predicate}
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5">
            Standar Penjasorkes TKJI 1.500m
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">Waktu Tempuh</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatTime(run.totalTimeMs)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              1.500m Selesai
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">Kecepatan</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {avgSpeedKmh} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">km/j</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Rata-rata
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">Pace Rata-rata</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatPace(avgPaceSec)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              /km
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">Putaran Lap</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {run.laps.length} <span className="text-xs font-normal text-slate-400">Lap</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Tercatat
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">Split KM 1.0</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {run.kmSplits?.[0] ? formatTime(run.kmSplits[0].splitTimeMs) : "--:--"}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              1.000m Pertama
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">Split KM 1.5</span>
            <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {run.kmSplits?.[1] ? formatTime(run.kmSplits[1].splitTimeMs) : "--:--"}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              500m Terakhir
            </span>
          </div>
        </div>
      </div>

      {/* Description & Recommendations */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center">
            <Flame className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
            Evaluasi Performa Aerobik:
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
            {evalResult.description}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Rekomendasi Latihan Fisik:
          </h4>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
            {evalResult.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
