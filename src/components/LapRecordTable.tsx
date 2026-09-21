import React from "react";
import { LapRecord } from "../types";
import { formatTime, formatPace } from "../utils/grading";
import { Zap, Clock, Flame, ChevronRight } from "lucide-react";

interface LapRecordTableProps {
  laps: LapRecord[];
  targetLaps?: number;
}

export const LapRecordTable: React.FC<LapRecordTableProps> = ({ laps, targetLaps = 4 }) => {
  if (laps.length === 0) {
    return (
      <div className="py-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Clock className="w-7 h-7 mx-auto mb-1.5 text-slate-400 dark:text-slate-600 opacity-60" />
        <p className="text-xs sm:text-sm font-medium">Belum ada putaran yang direkam.</p>
      </div>
    );
  }

  // Find fastest & slowest lap
  const minLapTime = Math.min(...laps.map((l) => l.lapTimeMs));
  const maxLapTime = Math.max(...laps.map((l) => l.lapTimeMs));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <table className="w-full min-w-[460px] text-left text-xs sm:text-sm">
        <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3 text-center w-12">Lap</th>
            <th className="py-2.5 px-3">Jarak</th>
            <th className="py-2.5 px-3">Waktu Lap</th>
            <th className="py-2.5 px-3">Total Waktu</th>
            <th className="py-2.5 px-3 text-right">Kecepatan</th>
            <th className="py-2.5 px-3 text-right">Pace</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm">
          {laps.map((lap) => {
            const isFastest = laps.length > 1 && lap.lapTimeMs === minLapTime;
            const isSlowest = laps.length > 1 && lap.lapTimeMs === maxLapTime;

            return (
              <tr
                key={lap.lapNumber}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  isFastest
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                    : isSlowest
                    ? "bg-amber-50/30 dark:bg-amber-950/20"
                    : ""
                }`}
              >
                <td className="py-2.5 px-3.5 text-center font-bold text-slate-700 dark:text-slate-200">
                  <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">
                    {lap.lapNumber}
                  </div>
                </td>
                <td className="py-2.5 px-3.5 font-sans">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">+{lap.lapDistanceM}m</span>
                    <span className="text-slate-400">({lap.cumulativeDistanceM}m)</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                  <div className="flex items-center space-x-2">
                    <span>{formatTime(lap.lapTimeMs)}</span>
                    {isFastest && (
                      <span className="font-sans inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                        <Zap className="w-2.5 h-2.5 mr-0.5" /> Tercepat
                      </span>
                    )}
                    {isSlowest && (
                      <span className="font-sans inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        <Flame className="w-2.5 h-2.5 mr-0.5" /> Terlambat
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400">
                  {formatTime(lap.totalElapsedMs)}
                </td>
                <td className="py-2.5 px-3.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                  {lap.speedKmh.toFixed(1)} <span className="text-xs text-slate-400 font-normal">km/j</span>
                </td>
                <td className="py-2.5 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatPace(lap.paceSecondsPerKm)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {targetLaps && laps.length < targetLaps && (
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <span>Target Total Ujian: {targetLaps} Putaran (1.500m)</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
            Sisa {targetLaps - laps.length} putaran lagi <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </div>
      )}
    </div>
  );
};
