import React, { useState } from "react";
import { RunSession } from "../types";
import { PerformanceChart } from "./PerformanceChart";
import { formatTime, formatPace } from "../utils/grading";
import { BarChart3, User, Award, TrendingUp, Layers } from "lucide-react";

interface ChartsTabProps {
  runs: RunSession[];
  darkMode: boolean;
}

export const ChartsTab: React.FC<ChartsTabProps> = ({ runs, darkMode }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id || "");

  const currentRun = runs.find((r) => r.id === selectedRunId) || runs[0];

  if (!currentRun) {
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <BarChart3 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <h3 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Data Grafik</h3>
        <p className="text-xs text-slate-400 mt-1">Lakukan ujian lari 1.5 km terlebih dahulu untuk melihat grafik performa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Grafik Performa 1.5K
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Split waktu, pace menit/km, & tren kecepatan
              </p>
            </div>
          </div>
        </div>

        {/* Student Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Siswa:</span>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden max-w-full truncate"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.student.name} ({r.student.className}) - {formatTime(r.totalTimeMs)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Chart Component */}
      <PerformanceChart run={currentRun} darkMode={darkMode} />

      {/* Additional Deep Analytics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>Kapasitas Aerobik</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {currentRun.score} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Predikat: <span className="font-semibold text-emerald-600">{currentRun.gradePredicate}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4" />
            <span>Konsistensi Putaran</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {currentRun.laps.length} <span className="text-xs font-normal text-slate-400">Lap Putaran</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Jarak: <span className="font-semibold">{currentRun.totalDistanceM} Meter</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-4 h-4" />
            <span>Waktu Tempuh Total</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatTime(currentRun.totalTimeMs)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Rata-rata: <span className="font-semibold">{formatPace((currentRun.totalTimeMs / 1000) / 1.5)}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
