import React from "react";
import {
  Timer,
  BarChart3,
  Trophy,
  History,
  Moon,
  Sun,
  CloudCheck,
  CloudAlert,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PWAInstallButton } from "./PWAInstallButton";

interface NavbarProps {
  activeTab: "timer" | "charts" | "leaderboard" | "history";
  setActiveTab: (tab: "timer" | "charts" | "leaderboard" | "history") => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCloudConnected: boolean;
  isSyncing: boolean;
  onManualSync: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  onTestAudio: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  isCloudConnected,
  isSyncing,
  onManualSync,
  soundEnabled,
  setSoundEnabled,
  onTestAudio,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Lari 1.5K
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap">
                PJOK
              </span>
            </div>
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              id="nav-tab-timer"
              onClick={() => setActiveTab("timer")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "timer"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>Timer Ujian</span>
            </button>

            <button
              id="nav-tab-charts"
              onClick={() => setActiveTab("charts")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "charts"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Grafik Performa</span>
            </button>

            <button
              id="nav-tab-leaderboard"
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "leaderboard"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => setActiveTab("history")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat</span>
            </button>
          </nav>

          {/* Quick Actions & Utilities */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Cloud Sync Status */}
            <button
              id="btn-cloud-sync"
              onClick={onManualSync}
              disabled={isSyncing}
              title={isCloudConnected ? "Cloud Aktif" : "Mode Offline (Data tersimpan di perangkat)"}
              className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                isCloudConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80"
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              ) : isCloudConnected ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CloudAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="hidden md:inline">
                {isSyncing ? "Sinkron..." : isCloudConnected ? "Cloud" : "Offline"}
              </span>
            </button>

            {/* Audio Toggle & Test */}
            <div className="flex items-center shrink-0">
              <button
                id="btn-toggle-sound"
                onClick={() => setSoundEnabled((prev) => !prev)}
                title={soundEnabled ? "Audio Notifikasi Aktif" : "Audio Dimatikan"}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
                  soundEnabled
                    ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
              {soundEnabled && (
                <button
                  id="btn-test-audio"
                  onClick={onTestAudio}
                  title="Tes Suara Audio 500m"
                  className="hidden lg:inline-flex ml-1 text-xs px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  Tes Suara
                </button>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              id="btn-toggle-theme"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Ubah Tema Gelap/Terang"
              title={darkMode ? "Mode Terang" : "Mode Gelap"}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar (Bottom Docked or Inline Subnav) */}
        <div className="flex md:hidden items-center justify-around py-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab("timer")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "timer"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Timer className="w-4 h-4 mb-0.5" />
            <span className="whitespace-nowrap">Timer</span>
          </button>

          <button
            onClick={() => setActiveTab("charts")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "charts"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span className="whitespace-nowrap">Grafik</span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "leaderboard"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Trophy className="w-4 h-4 mb-0.5" />
            <span className="whitespace-nowrap">Klasemen</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              activeTab === "history"
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span className="whitespace-nowrap">Riwayat</span>
          </button>
        </div>
      </div>
    </header>
  );
};
