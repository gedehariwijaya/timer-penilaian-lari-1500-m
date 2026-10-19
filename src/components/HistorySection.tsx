import React, { useState, useMemo } from "react";
import { RunSession, RunMode } from "../types";
import { formatTime } from "../utils/grading";
import { exportStudentRunToPDF } from "../utils/pdfExport";
import { exportLeaderboardToExcel } from "../utils/excelExport";
import { PerformanceChart } from "./PerformanceChart";
import { LapRecordTable } from "./LapRecordTable";
import { EvaluationCard } from "./EvaluationCard";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  History,
  FileDown,
  FileSpreadsheet,
  Trash2,
  Eye,
  Cloud,
  CloudOff,
  X,
  Search,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { CLASS_OPTIONS } from "../constants";

interface HistorySectionProps {
  runs: RunSession[];
  onDeleteRun: (id: string) => void;
  onClearAllRuns?: (mode?: RunMode | "all") => void;
  darkMode: boolean;
  selectedRun: RunSession | null;
  setSelectedRun: (run: RunSession | null) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  runs,
  onDeleteRun,
  onClearAllRuns,
  darkMode,
  selectedRun,
  setSelectedRun,
}) => {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | RunMode>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<RunSession | "current_filter" | "all" | null>(null);

  // Distinct dates
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => {
      const d = r.runDate || r.date.slice(0, 10);
      if (d) set.add(d);
    });
    return Array.from(set).sort().reverse();
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      // Mode filter
      if (modeFilter !== "all" && r.mode !== modeFilter) return false;
      // Date filter
      if (dateFilter !== "all") {
        const d = r.runDate || r.date.slice(0, 10);
        if (d !== dateFilter) return false;
      }
      // Class filter
      if (classFilter !== "all" && r.student.className !== classFilter) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.student.name.toLowerCase().includes(q) ||
          r.student.className.toLowerCase().includes(q) ||
          r.student.attendanceNumber?.toLowerCase().includes(q) ||
          r.student.studentId?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [runs, modeFilter, dateFilter, classFilter, search]);

  const handleExportExcel = () => {
    const title = `Riwayat_${modeFilter === "all" ? "Semua" : modeFilter === "ujian" ? "Ujian" : "Latihan"}${
      classFilter !== "all" ? `_${classFilter}` : ""
    }${dateFilter !== "all" ? `_${dateFilter}` : ""}`;
    exportLeaderboardToExcel(filtered, title);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 shrink-0">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Riwayat & Arsip Lari 1.5K
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemisahan data latihan & ujian lari tersinkron otomatis ke Firebase
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {runs.length > 0 && (
              <button
                id="btn-export-history-excel"
                onClick={handleExportExcel}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0"
                title="Ekspor seluruh riwayat siswa ke file Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Ekspor Excel</span>
              </button>
            )}

            {onClearAllRuns && filtered.length > 0 && (
              <button
                id="btn-reset-history"
                onClick={() => setDeleteTarget(modeFilter === "all" ? "all" : "current_filter")}
                className="inline-flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 shadow-xs transition active:scale-95 shrink-0"
                title="Hapus riwayat terpilih"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Hapus {modeFilter === "all" ? "Semua" : modeFilter === "ujian" ? "Ujian" : "Latihan"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Selector & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setModeFilter("all")}
                className={`px-3 py-1 rounded-lg transition ${
                  modeFilter === "all"
                    ? "bg-white dark:bg-slate-900 font-bold shadow-xs text-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Semua Mode ({runs.length})
              </button>
              <button
                onClick={() => setModeFilter("ujian")}
                className={`px-3 py-1 rounded-lg transition ${
                  modeFilter === "ujian"
                    ? "bg-red-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                🏃 Ujian ({runs.filter((r) => r.mode === "ujian").length})
              </button>
              <button
                onClick={() => setModeFilter("latihan")}
                className={`px-3 py-1 rounded-lg transition ${
                  modeFilter === "latihan"
                    ? "bg-teal-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                👟 Latihan ({runs.filter((r) => r.mode === "latihan").length})
              </button>
            </div>

            {/* Tanggal Filter */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden"
              >
                <option value="all">Semua Tanggal</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas Filter */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden"
              >
                <option value="all">Semua Kelas</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Runs Grid / Cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Tidak ada riwayat {modeFilter === "all" ? "" : modeFilter === "ujian" ? "ujian " : "latihan "}yang sesuai filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((run) => {
            const avgSpeedKmh = ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(1);
            const runDateStr = run.runDate || run.date.slice(0, 10);
            const isExam = run.mode !== "latihan";

            return (
              <div
                key={run.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isExam
                    ? "border-red-200/80 dark:border-red-950/80 hover:border-red-400 dark:hover:border-red-700/70"
                    : "border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-700/70"
                }`}
              >
                <div>
                  {/* Card Header with Mode Badge & Date */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isExam
                          ? "bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800/80 font-extrabold"
                          : "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                      }`}
                    >
                      {isExam ? "🏃 Ujian Lari" : "👟 Latihan"}
                    </span>
                    <div className="text-right">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        {runDateStr}
                      </span>
                      {run.startTime && (
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                          Mulai: {run.startTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                        {run.student.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {run.student.className} • Absen {run.student.attendanceNumber || run.student.studentId || "-"} • {run.student.gender === "putra" ? "Putra" : "Putri"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {run.score}
                      </span>
                      <span className="text-[10px] text-slate-400">Nilai</span>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 font-sans text-[11px]">Waktu Tempuh</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatTime(run.totalTimeMs)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans text-[11px]">Kecepatan</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {avgSpeedKmh} km/j
                      </p>
                    </div>
                  </div>

                  {(run.split500mMs || run.split1000mMs) && (
                    <div className="mb-2 px-2 py-1 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-[10px] font-mono text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <span>Split 500m: {run.split500mMs ? formatTime(run.split500mMs) : "-"}</span>
                      <span>Split 1.000m: {run.split1000mMs ? formatTime(run.split1000mMs) : "-"}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center">
                      {run.syncedToCloud ? (
                        <>
                          <Cloud className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                          <span>Firebase Cloud</span>
                        </>
                      ) : (
                        <>
                          <CloudOff className="w-3.5 h-3.5 text-amber-500 mr-1" />
                          <span>Lokal</span>
                        </>
                      )}
                    </span>
                    <span>
                      {new Date(run.date).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedRun(run)}
                    className="flex items-center space-x-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => exportStudentRunToPDF(run)}
                      title="Unduh PDF Laporan Guru"
                      className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(run)}
                      title="Hapus data siswa ini"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal View */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Detail Evaluasi {selectedRun.mode === "latihan" ? "Latihan" : "Ujian"} 1.500m
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      selectedRun.mode === "latihan"
                        ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {selectedRun.mode === "latihan" ? "Latihan" : "Ujian Lari"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedRun.student.name} • {selectedRun.student.className} • Tanggal: {selectedRun.runDate || selectedRun.date.slice(0, 10)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <EvaluationCard run={selectedRun} />

            <PerformanceChart run={selectedRun} darkMode={darkMode} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                Rekaman Waktu Tiap Putaran (Laps)
              </h4>
              <LapRecordTable laps={selectedRun.laps} mode={selectedRun.mode} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedRun)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Rekaman Ini</span>
              </button>

              <button
                onClick={() => setSelectedRun(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs sm:text-sm font-semibold hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title={
          deleteTarget === "current_filter"
            ? `Hapus Seluruh Data ${modeFilter === "ujian" ? "Ujian Lari" : "Latihan"}?`
            : deleteTarget === "all"
            ? "Reset & Hapus Seluruh Riwayat Lari?"
            : `Hapus Data Siswa: ${deleteTarget?.student.name || ""}?`
        }
        message={
          deleteTarget === "current_filter"
            ? `Semua rekaman ${modeFilter === "ujian" ? "ujian lari" : "latihan"} akan dihapus permanen dari Firebase database.`
            : deleteTarget === "all"
            ? "Semua data lari siswa akan dihapus permanen dari Firebase database."
            : `Rekaman waktu tempuh (${deleteTarget ? formatTime(deleteTarget.totalTimeMs) : ""}) milik siswa ini akan dihapus permanen.`
        }
        confirmLabel={
          deleteTarget === "current_filter"
            ? `Ya, Hapus Data ${modeFilter === "ujian" ? "Ujian" : "Latihan"}`
            : deleteTarget === "all"
            ? "Ya, Hapus Semua"
            : "Ya, Hapus Siswa"
        }
        onConfirm={() => {
          if (deleteTarget === "current_filter") {
            onClearAllRuns?.(modeFilter === "all" ? undefined : modeFilter);
            setSelectedRun(null);
          } else if (deleteTarget === "all") {
            onClearAllRuns?.("all");
            setSelectedRun(null);
          } else if (deleteTarget) {
            onDeleteRun(deleteTarget.id);
            if (selectedRun?.id === deleteTarget.id) {
              setSelectedRun(null);
            }
          }
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
