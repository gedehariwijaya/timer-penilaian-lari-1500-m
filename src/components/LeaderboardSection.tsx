import React, { useState, useMemo } from "react";
import { RunSession, Gender } from "../types";
import { formatTime, formatPace, calculateRunGrade } from "../utils/grading";
import { exportClassLeaderboardToPDF, exportStudentRunToPDF } from "../utils/pdfExport";
import { exportLeaderboardToExcel } from "../utils/excelExport";
import {
  Trophy,
  Medal,
  Crown,
  Search,
  Filter,
  FileDown,
  FileSpreadsheet,
  ArrowUpDown,
  Sparkles,
  Award,
  Trash2,
} from "lucide-react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface LeaderboardSectionProps {
  runs: RunSession[];
  onSelectRunForDetails: (run: RunSession) => void;
  onDeleteRun?: (id: string) => void;
  onClearAllRuns?: () => void;
}

export const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({
  runs,
  onSelectRunForDetails,
  onDeleteRun,
  onClearAllRuns,
}) => {
  const [genderFilter, setGenderFilter] = useState<"all" | Gender>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"time" | "score">("time");
  const [deleteTarget, setDeleteTarget] = useState<RunSession | "all" | null>(null);

  // Get distinct classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => {
      if (r.student.className) set.add(r.student.className);
    });
    return Array.from(set).sort();
  }, [runs]);

  // Filter & Sort
  const filteredRuns = useMemo(() => {
    return runs
      .filter((r) => {
        if (genderFilter !== "all" && r.student.gender !== genderFilter) return false;
        if (classFilter !== "all" && r.student.className !== classFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.student.name.toLowerCase().includes(q);
          const matchAttendance = r.student.attendanceNumber?.toLowerCase().includes(q);
          const matchId = r.student.studentId?.toLowerCase().includes(q);
          const matchClass = r.student.className.toLowerCase().includes(q);
          if (!matchName && !matchAttendance && !matchId && !matchClass) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "time") {
          return a.totalTimeMs - b.totalTimeMs;
        } else {
          return b.score - a.score;
        }
      });
  }, [runs, genderFilter, classFilter, searchQuery, sortBy]);

  const topThree = filteredRuns.slice(0, 3);

  const handleExportPDF = () => {
    const filterTitle =
      classFilter === "all" ? (genderFilter === "all" ? "Semua Kelas" : `Kategori ${genderFilter}`) : classFilter;
    exportClassLeaderboardToPDF(filteredRuns, filterTitle);
  };

  const handleExportExcel = () => {
    const filterTitle =
      classFilter === "all" ? (genderFilter === "all" ? "Semua Kelas" : `Kategori ${genderFilter}`) : classFilter;
    exportLeaderboardToExcel(filteredRuns, filterTitle);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Klasemen & Leaderboard Lari 1.5K
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peringkat kecepatan siswa & evaluasi nilai otomatis (80 - 100)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-class-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 shrink-0"
            title="Download seluruh nilai klasemen dalam format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="btn-export-class-pdf"
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95 shrink-0"
            title="Download lembar rekap klasemen format PDF"
          >
            <FileDown className="w-4 h-4 text-slate-300" />
            <span>Ekspor PDF</span>
          </button>

          {onClearAllRuns && runs.length > 0 && (
            <button
              id="btn-reset-leaderboard"
              onClick={() => setDeleteTarget("all")}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm border border-rose-200 dark:border-rose-800 shadow-xs transition-all active:scale-95 shrink-0"
              title="Hapus seluruh data siswa di leaderboard untuk memulai sesi/kelas baru"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Podium (1st, 2nd, 3rd) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* 2nd Place */}
          {topThree[1] && (
            <div className="order-2 md:order-1 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center relative mt-0 md:mt-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-base mb-1.5 shadow-xs">
                2
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Juara 2 (Perak)
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5 truncate max-w-full">
                {topThree[1].student.name}
              </h4>
              <span className="text-xs text-slate-500">{topThree[1].student.className}</span>

              <div className="my-2.5 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 w-full">
                <div className="text-lg sm:text-xl font-black font-mono text-slate-800 dark:text-slate-100">
                  {formatTime(topThree[1].totalTimeMs)}
                </div>
                <div className="text-xs text-emerald-600 font-bold mt-0.5">
                  Nilai: {topThree[1].score} ({topThree[1].gradePredicate})
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Emas) */}
          {topThree[0] && (
            <div className="order-1 md:order-2 p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/40 dark:from-slate-900 dark:to-amber-950/20 border-2 border-amber-300 dark:border-amber-700 shadow-sm flex flex-col items-center text-center relative">
              <div className="w-11 h-11 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-lg mb-1.5 shadow-sm">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Juara 1 (Emas)
              </span>
              <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-0.5 truncate max-w-full">
                {topThree[0].student.name}
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {topThree[0].student.className} • {topThree[0].student.gender === "putra" ? "Putra" : "Putri"}
              </span>

              <div className="my-2.5 py-2 px-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-amber-800/80 w-full shadow-xs">
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {formatTime(topThree[0].totalTimeMs)}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Nilai: {topThree[0].score} ({topThree[0].gradePredicate})
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="order-3 md:order-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center relative mt-0 md:mt-3">
              <div className="w-9 h-9 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-black text-base mb-1.5 shadow-xs">
                3
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-600">
                Juara 3 (Perunggu)
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5 truncate max-w-full">
                {topThree[2].student.name}
              </h4>
              <span className="text-xs text-slate-500">{topThree[2].student.className}</span>

              <div className="my-2.5 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 w-full">
                <div className="text-lg sm:text-xl font-black font-mono text-slate-800 dark:text-slate-100">
                  {formatTime(topThree[2].totalTimeMs)}
                </div>
                <div className="text-xs text-emerald-600 font-bold mt-0.5">
                  Nilai: {topThree[2].score} ({topThree[2].gradePredicate})
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Gender Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setGenderFilter("all")}
              className={`px-2.5 py-1 rounded-md transition ${
                genderFilter === "all" ? "bg-white dark:bg-slate-900 font-bold shadow-xs text-emerald-600" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Semua Gender
            </button>
            <button
              onClick={() => setGenderFilter("putra")}
              className={`px-2.5 py-1 rounded-md transition ${
                genderFilter === "putra" ? "bg-white dark:bg-slate-900 font-bold shadow-xs text-blue-600" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Putra
            </button>
            <button
              onClick={() => setGenderFilter("putri")}
              className={`px-2.5 py-1 rounded-md transition ${
                genderFilter === "putri" ? "bg-white dark:bg-slate-900 font-bold shadow-xs text-rose-600" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Putri
            </button>
          </div>

          {/* Class Filter */}
          {availableClasses.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          )}

          {/* Sort By Toggle */}
          <button
            onClick={() => setSortBy((prev) => (prev === "time" ? "score" : "time"))}
            className="flex items-center space-x-1 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>Urut: {sortBy === "time" ? "Waktu" : "Nilai"}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5 text-center w-14">Rank</th>
                <th className="py-3 px-3.5">Nama Siswa</th>
                <th className="py-3 px-3.5">Kelas</th>
                <th className="py-3 px-3.5 text-center">Gender</th>
                <th className="py-3 px-3.5 text-right">Waktu 1.5K</th>
                <th className="py-3 px-3.5 text-right">Kecepatan</th>
                <th className="py-3 px-3.5 text-right">Nilai (80-100)</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-xs sm:text-sm">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run, idx) => {
                  const rank = idx + 1;
                  const speedKmh = ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(1);

                  return (
                    <tr
                      key={run.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center font-bold">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold text-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-bold text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-bold text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400">#{rank}</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-sans font-bold text-slate-900 dark:text-white">
                        <div>
                          <span>{run.student.name}</span>
                          <p className="text-[11px] font-mono text-slate-400 font-normal">
                            No. Absen: {run.student.attendanceNumber || run.student.studentId || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-sans text-slate-700 dark:text-slate-300">
                        {run.student.className}
                      </td>

                      <td className="py-3 px-3.5 text-center font-sans">
                        <span
                          className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                            run.student.gender === "putra"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {run.student.gender === "putra" ? "Putra" : "Putri"}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                        {formatTime(run.totalTimeMs)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                        {speedKmh} <span className="text-xs text-slate-400 font-normal">km/j</span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {run.score}
                          </span>
                          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {run.gradePredicate.split(" ")[0]}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-center font-sans">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onSelectRunForDetails(run)}
                            title="Lihat Detail & Grafik"
                            className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => exportStudentRunToPDF(run)}
                            title="Unduh PDF Laporan Guru"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          {onDeleteRun && (
                            <button
                              onClick={() => setDeleteTarget(run)}
                              title={`Hapus data lari ${run.student.name}`}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title={
          deleteTarget === "all"
            ? "Reset & Hapus Seluruh Data Klasemen?"
            : `Hapus Data Siswa: ${deleteTarget?.student.name || ""}?`
        }
        message={
          deleteTarget === "all"
            ? "Semua rekaman nilai ujian lari 1.500m siswa akan dihapus dari leaderboard dan database. Guru dapat memulai sesi kelas baru dengan bersih tanpa terganggu data lama. Tindakan ini tidak dapat dibatalkan."
            : `Rekaman waktu tempuh (${deleteTarget ? formatTime(deleteTarget.totalTimeMs) : ""}) dan nilai (${deleteTarget?.score || ""}) milik siswa ini akan dihapus permanen.`
        }
        confirmLabel={deleteTarget === "all" ? "Ya, Hapus Semua Data" : "Ya, Hapus Siswa"}
        onConfirm={() => {
          if (deleteTarget === "all") {
            onClearAllRuns?.();
          } else if (deleteTarget) {
            onDeleteRun?.(deleteTarget.id);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
