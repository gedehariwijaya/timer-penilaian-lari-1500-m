import React, { useState, useEffect } from "react";
import { StudentInfo, RunSession, RunMode } from "./types";
import { FirebaseRunService } from "./services/firebaseRunService";
import { testConnection } from "./lib/firebase";
import { audioService } from "./utils/audio";
import { Navbar } from "./components/Navbar";
import { TimerSection } from "./components/TimerSection";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { HistorySection } from "./components/HistorySection";
import { ChartsTab } from "./components/ChartsTab";
import { StudentModal } from "./components/StudentModal";
import { CheckCircle2, ShieldCheck } from "lucide-react";

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

  // Runs State
  const [runs, setRuns] = useState<RunSession[]>(() => FirebaseRunService.getLocalRuns());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Student Info for Current Run - Empty by default
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

  // Real-time Firebase Sync listener
  useEffect(() => {
    testConnection();
    setIsSyncing(true);

    const unsubscribe = FirebaseRunService.subscribeRuns(
      (updatedRuns) => {
        setRuns(updatedRuns);
        setIsCloudConnected(true);
        setIsSyncing(false);
      },
      (err) => {
        console.warn("Real-time Firebase sync issue:", err);
        setIsCloudConnected(false);
        setIsSyncing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handle Save New Run
  const handleSaveRun = async (newRun: RunSession) => {
    try {
      const saved = await FirebaseRunService.saveRun(newRun);
      const modeLabel = saved.mode === "latihan" ? "Latihan" : "Ujian";
      showToast(`${modeLabel} ${saved.student.name} tersimpan di Firebase! Nilai: ${saved.score}`);
    } catch (e) {
      showToast(`Data tersimpan di perangkat.`);
    }
  };

  // Handle Manual Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    const local = FirebaseRunService.getLocalRuns();
    setRuns(local);
    setIsSyncing(false);
    setIsCloudConnected(true);
    showToast("Data tersinkronisasi dengan Firebase Cloud.");
  };

  // Handle Delete Run
  const handleDeleteRun = async (id: string) => {
    try {
      await FirebaseRunService.deleteRun(id);
      showToast("Data berhasil dihapus dari Firebase.");
    } catch (e) {
      showToast("Gagal menghapus data.");
    }
  };

  // Handle Delete All Runs (Clear/Reset by mode or all)
  const handleClearAllRuns = async (mode?: RunMode | "all") => {
    try {
      await FirebaseRunService.clearAllRuns(mode);
      if (selectedRunForDetails) {
        setSelectedRunForDetails(null);
      }
      const label =
        mode === "latihan"
          ? "Data latihan"
          : mode === "ujian"
          ? "Data ujian lari"
          : "Seluruh data lari";
      showToast(`${label} berhasil dibersihkan dari Firebase.`);
    } catch (e) {
      showToast("Gagal mereset data.");
    }
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 pb-24 md:pb-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 sm:py-3 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Timer Ujian & Latihan */}
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
          showToast(`Siswa: ${student.name} (${student.className} • Absen ${student.attendanceNumber})`);
        }}
        initialStudent={currentStudent}
      />

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Pencatat Waktu Lari 1.500m PJOK • Mode Latihan & Ujian • Penilaian 80 - 100
          </p>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Firebase Firestore Online
            </span>
            <span>•</span>
            <span>Ekspor Excel & PDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
