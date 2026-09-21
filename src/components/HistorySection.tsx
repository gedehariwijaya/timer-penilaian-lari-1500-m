import React, { useState } from "react";
import { RunSession } from "../types";
import { formatTime, formatPace } from "../utils/grading";
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
  User,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";

interface HistorySectionProps {
  runs: RunSession[];
  onDeleteRun: (id: string) => void;
  onClearAllRuns?: () => void;
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
  const [deleteTarget, setDeleteTarget] = useState<RunSession | "all" | null>(null);

  const filtered = runs.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.student.name.toLowerCase().includes(q) ||
      r.student.className.toLowerCase().includes(q) ||
      r.student.attendanceNumber?.toLowerCase().includes(q) ||
      r.student.studentId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 shrink-0">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Riwayat Ujian & Arsip Nilai
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rekaman tersimpan & siap ekspor ke Excel / PDF
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {runs.length > 0 && (
            <button
              id="btn-export-history-excel"
              onClick={() => exportLeaderboardToExcel(filtered, "Arsip Riwayat Ujian")}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0"
              title="Ekspor seluruh riwayat siswa ke file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Ekspor Excel</span>
            </button>
          )}

          {onClearAllRuns && runs.length > 0 && (
            <button
              id="btn-reset-history"
              onClick={() => setDeleteTarget("all")}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 shadow-xs transition active:scale-95 shrink-0"
              title="Hapus seluruh riwayat ujian siswa untuk mereset data"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Runs Grid / Cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Belum ada riwayat ujian yang tersimpan.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Gunakan tab Timer Ujian untuk merekam waktu lari 1.5K siswa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((run) => {
            const avgSpeedKmh = ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(1);

            return (
              <div
                key={run.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all flex flex-col justify-between"
              >
                <div>
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
                  <div className="my-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs font-mono">
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

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center">
                      {run.syncedToCloud ? (
                        <>
                          <Cloud className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                          <span>Tersinkron Cloud</span>
                        </>
                      ) : (
                        <>
                          <CloudOff className="w-3.5 h-3.5 text-amber-500 mr-1" />
                          <span>Lokal</span>
                        </>
                      )}
                    </span>
                    <span>
                      {new Date(run.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Detail Evaluasi Ujian 1.500m
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRun.student.name} • {selectedRun.student.className}
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
              <LapRecordTable laps={selectedRun.laps} />
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
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
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
          deleteTarget === "all"
            ? "Reset & Hapus Seluruh Riwayat Ujian?"
            : `Hapus Data Siswa: ${deleteTarget?.student.name || ""}?`
        }
        message={
          deleteTarget === "all"
            ? "Semua rekaman riwayat lari 1.500m siswa akan dihapus permanen dari sistem dan server. Guru dapat memulai perekaman baru dengan bersih tanpa terganggu data lama. Tindakan ini tidak dapat dibatalkan."
            : `Rekaman waktu tempuh (${deleteTarget ? formatTime(deleteTarget.totalTimeMs) : ""}) dan nilai (${deleteTarget?.score || ""}) milik siswa ini akan dihapus permanen.`
        }
        confirmLabel={deleteTarget === "all" ? "Ya, Hapus Semua Riwayat" : "Ya, Hapus Siswa"}
        onConfirm={() => {
          if (deleteTarget === "all") {
            onClearAllRuns?.();
            setSelectedRun(null);
          } else if (deleteTarget) {
            onDeleteRun(deleteTarget.id);
            if (selectedRun?.id === deleteTarget.id) {
              setSelectedRun(null);
            }
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
