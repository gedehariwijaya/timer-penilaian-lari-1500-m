import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { RunSession } from "../types";
import { formatTime, formatPace } from "../utils/grading";
import { Activity, Gauge, TrendingUp, Sparkles } from "lucide-react";

interface PerformanceChartProps {
  run: RunSession;
  darkMode?: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ run, darkMode = false }) => {
  const [activeMetric, setActiveMetric] = useState<"splits" | "laps">("splits");

  // Format data for Per Kilometer Splits (0 - 1.0 KM vs 1.0 - 1.5 KM)
  const kmSplits = run.kmSplits && run.kmSplits.length > 0 ? run.kmSplits : [];

  // If kmSplits not yet recorded (e.g. test run in progress), calculate based on laps or total
  const splitChartData = kmSplits.map((split) => ({
    name: split.kmMarker === 1.0 ? "KM 1.0 (0-1000m)" : "KM 1.5 (1000-1500m)",
    marker: `KM ${split.kmMarker.toFixed(1)}`,
    speed: Number(split.speedKmh.toFixed(1)),
    splitSeconds: Math.round(split.splitTimeMs / 1000),
    splitFormatted: formatTime(split.splitTimeMs),
    pace: formatPace(split.paceSecondsPerKm),
    paceSeconds: Math.round(split.paceSecondsPerKm),
  }));

  // Format data for Laps
  const lapChartData = run.laps.map((lap) => ({
    name: `Lap ${lap.lapNumber}`,
    distance: `${lap.cumulativeDistanceM}m`,
    speed: Number(lap.speedKmh.toFixed(1)),
    lapSeconds: Math.round(lap.lapTimeMs / 1000),
    lapFormatted: formatTime(lap.lapTimeMs),
    pace: formatPace(lap.paceSecondsPerKm),
    paceSeconds: Math.round(lap.paceSecondsPerKm),
  }));

  const gridStroke = darkMode ? "#334155" : "#e2e8f0";
  const textColor = darkMode ? "#94a3b8" : "#64748b";

  // Check pacing strategy
  const km1 = splitChartData.find((s) => s.marker.includes("1.0"));
  const km1_5 = splitChartData.find((s) => s.marker.includes("1.5"));
  let pacingStrategy = "Stabil";
  let pacingDesc = "Pace terjaga konsisten di setiap kilometer lari.";

  if (km1 && km1_5) {
    if (km1_5.speed > km1.speed + 0.5) {
      pacingStrategy = "Negative Split (Sangat Positif)";
      pacingDesc = "Siswa berhasil meningkatkan kecepatan di 500m terakhir. Strategi lari sangat efisien!";
    } else if (km1.speed > km1_5.speed + 1.2) {
      pacingStrategy = "Penurunan Kecepatan Akhir";
      pacingDesc = "Kecepatan di 500m terakhir menurun akibat kelelahan aerobik. Disarankan melatih daya tahan tempo.";
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Grafik Performa & Analisis Split
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analisis detail per kilometer (KM 1.0 & KM 1.5) serta tren putaran
          </p>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveMetric("splits")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMetric === "splits"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Per Kilometer (KM)
          </button>
          <button
            onClick={() => setActiveMetric("laps")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMetric === "laps"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Tren Tiap Putaran
          </button>
        </div>
      </div>

      {/* Split KM Comparison Highlight Cards */}
      {splitChartData.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Segmen KM 1.0 (0 - 1.000 Meter)
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                {splitChartData[0]?.splitFormatted}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {splitChartData[0]?.speed}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">km/jam</span>
              </div>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                Pace: {splitChartData[0]?.pace}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Segmen KM 1.5 (1.000 - 1.500 Meter)
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold">
                {splitChartData[1]?.splitFormatted}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {splitChartData[1]?.speed}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">km/jam</span>
              </div>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                Pace: {splitChartData[1]?.pace}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Chart Area */}
      <div className="w-full h-72">
        {activeMetric === "splits" ? (
          splitChartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Gauge className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Data split kilometer akan muncul setelah lari selesai atau checkpoint tercapai.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={splitChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} />
                <YAxis stroke={textColor} fontSize={12} unit=" km/j" domain={[0, "dataMax + 4"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-slate-700">
                          <p className="font-bold text-emerald-400 mb-1">{data.name}</p>
                          <p>Kecepatan: <span className="font-bold">{data.speed} km/jam</span></p>
                          <p>Waktu Segmen: <span className="font-mono">{data.splitFormatted}</span></p>
                          <p>Pace: <span className="font-mono">{data.pace}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={12} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: "Standar Minimal KKM (12 km/j)", fill: "#3b82f6", fontSize: 10, position: "insideTopRight" }} />
                <Bar dataKey="speed" name="Kecepatan (km/jam)" fill="#10b981" radius={[8, 8, 0, 0]} barSize={56} />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : lapChartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Belum ada data putaran untuk ditampilkan.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lapChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} />
              <YAxis stroke={textColor} fontSize={12} unit=" km/j" domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-slate-700">
                        <p className="font-bold text-emerald-400 mb-1">{data.name} ({data.distance})</p>
                        <p>Kecepatan: <span className="font-bold">{data.speed} km/jam</span></p>
                        <p>Waktu Putaran: <span className="font-mono">{data.lapFormatted}</span></p>
                        <p>Pace: <span className="font-mono">{data.pace}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pacing Analysis Footer */}
      <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-2.5">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-emerald-900 dark:text-emerald-300">
            Analisis Pacing: {pacingStrategy}
          </span>
          <p className="text-slate-600 dark:text-slate-300 mt-0.5">
            {pacingDesc}
          </p>
        </div>
      </div>
    </div>
  );
};
