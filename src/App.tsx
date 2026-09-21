import React, { useState, useEffect, useCallback } from "react";
import { StudentInfo, RunSession } from "./types";
import { CloudSyncService } from "./utils/cloudSync";
import { audioService } from "./utils/audio";
import { Navbar } from "./components/Navbar";
import { TimerSection } from "./components/TimerSection";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { HistorySection } from "./components/HistorySection";
import { ChartsTab } from "./components/ChartsTab";
import { StudentModal } from "./components/StudentModal";
import { BatteryCharging, Sparkles, CheckCircle2, ShieldCheck, Award } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"timer" | "charts" | "leaderboard" | "history">("timer");

  // Dark Mode State with LocalStorage Persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("lari_dark_mode");
    if (saved !== null) {
      return saved === "true";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Sound Notifications Toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Cloud & Local Runs
  const [runs, setRuns] = useState<RunSession[]>(() => CloudSyncService.getLocalRuns());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Student Info for Current Run - Empty by default as requested
  const [currentStudent, setCurrentStudent] = useState<StudentInfo>({
    name: "",
    className: "",
    attendanceNumber: "",
    gender: "putra",
  });
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Selected Run for Detailed Modal View
  const [selectedRunForDetails, setSelectedRunForDetails] = useState<RunSession | null>(null);

  // Sync Dark Mode class with HTML root
  useEffect(() => {
    localStorage.setItem("lari_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Initial Fetch from Cloud Backend
  const loadCloudRuns = useCallback(async () => {
    setIsSyncing(true);
    const result = await CloudSyncService.fetchCloudRuns();
    setIsSyncing(false);

    if (result.success && result.data) {
      setRuns(result.data);
      setIsCloudConnected(true);
    } else {
      setIsCloudConnected(false);
      // Fallback to local
      const local = CloudSyncService.getLocalRuns();
      if (local.length > 0) {
        setRuns(local);
      }
    }
  }, []);

  useEffect(() => {
    loadCloudRuns();
  }, [loadCloudRuns]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handle Save New Run
  const handleSaveRun = async (newRun: RunSession) => {
    const saveRes = await CloudSyncService.saveRun(newRun);
    if (saveRes.success) {
      setRuns((prev) => {
        const idx = prev.findIndex((r) => r.id === saveRes.run.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saveRes.run;
          return updated;
        }
        return [saveRes.run, ...prev];
      });

      if (saveRes.synced) {
        setIsCloudConnected(true);
        showToast(`Ujian ${newRun.student.name} tersimpan & tersinkron ke cloud! Nilai: ${newRun.score}`);
      } else {
        showToast(`Ujian ${newRun.student.name} tersimpan lokal (akan disinkron saat online). Nilai: ${newRun.score}`);
      }
    }
  };

  // Handle Manual Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await CloudSyncService.syncAllRuns();
    setIsSyncing(false);

    if (res.success) {
      setIsCloudConnected(true);
      const updated = CloudSyncService.getLocalRuns();
      setRuns(updated);
      showToast(`Berhasil sinkronisasi ${res.total} data ke cloud!`);
    } else {
      setIsCloudConnected(false);
      showToast("Gagal terhubung ke server cloud. Data tersimpan aman di perangkat.");
    }
  };

  // Handle Delete Run
  const handleDeleteRun = async (id: string) => {
    await CloudSyncService.deleteRun(id);
    setRuns((prev) => prev.filter((r) => r.id !== id));
    showToast("Data ujian berhasil dihapus.");
  };

  // Handle Delete All Runs (Clear/Reset database & local storage)
  const handleClearAllRuns = async () => {
    await CloudSyncService.clearAllRuns();
    setRuns([]);
    if (selectedRunForDetails) {
      setSelectedRunForDetails(null);
    }
    showToast("Seluruh data lari berhasil dibersihkan & direset.");
  };

  // Test Audio
  const handleTestAudio = () => {
    audioService.announceCheckpoint(500, 135000, 13.3, false);
    showToast("Memutar contoh notifikasi suara 500m...");
  };

  // Select run from leaderboard to view details
  const handleSelectRunFromLeaderboard = (run: RunSession) => {
    setSelectedRunForDetails(run);
    setActiveTab("history");
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isCloudConnected={isCloudConnected}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onTestAudio={handleTestAudio}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 sm:py-3 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Timer Ujian (Lari 1.500m) */}
        {activeTab === "timer" && (
          <TimerSection
            onSaveRun={handleSaveRun}
            student={currentStudent}
            onOpenStudentModal={() => setIsStudentModalOpen(true)}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            darkMode={darkMode}
          />
        )}

        {/* Tab 2: Grafik Performa */}
        {activeTab === "charts" && (
          <ChartsTab runs={runs} darkMode={darkMode} />
        )}

        {/* Tab 3: Leaderboard (Klasemen Nilai & Waktu) */}
        {activeTab === "leaderboard" && (
          <LeaderboardSection
            runs={runs}
            onSelectRunForDetails={handleSelectRunFromLeaderboard}
            onDeleteRun={handleDeleteRun}
            onClearAllRuns={handleClearAllRuns}
          />
        )}

        {/* Tab 4: Riwayat & PDF */}
        {activeTab === "history" && (
          <HistorySection
            runs={runs}
            onDeleteRun={handleDeleteRun}
            onClearAllRuns={handleClearAllRuns}
            darkMode={darkMode}
            selectedRun={selectedRunForDetails}
            setSelectedRun={setSelectedRunForDetails}
          />
        )}
      </main>

      {/* Student Setup Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={(student) => {
          setCurrentStudent(student);
          showToast(`Peserta ujian diatur: ${student.name} (${student.className} • No. Absen ${student.attendanceNumber})`);
        }}
        initialStudent={currentStudent}
      />

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Sistem Pencatat Waktu & Evaluasi Ujian Lari 1.500m (PJOK) • Penilaian Otomatis 80 - 100
          </p>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3 mr-1" /> Cloud Sync
            </span>
            <span>•</span>
            <span>Ekspor Excel & PDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
