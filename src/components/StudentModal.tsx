import React, { useState, useEffect } from "react";
import { StudentInfo, Gender } from "../types";
import { User, GraduationCap, Hash, Check, X, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { CLASS_OPTIONS, ATTENDANCE_OPTIONS } from "../constants";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: StudentInfo) => void;
  initialStudent?: StudentInfo;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStudent,
}) => {
  const [name, setName] = useState(initialStudent?.name || "");
  const [className, setClassName] = useState(initialStudent?.className || "");
  const [attendanceNumber, setAttendanceNumber] = useState(initialStudent?.attendanceNumber || "");
  const [gender, setGender] = useState<Gender>(initialStudent?.gender || "putra");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync with initialStudent when opened
  useEffect(() => {
    if (isOpen) {
      setName(initialStudent?.name || "");
      setClassName(initialStudent?.className || "");
      setAttendanceNumber(initialStudent?.attendanceNumber || "");
      setGender(initialStudent?.gender || "putra");
      setErrorMsg(null);
    }
  }, [isOpen, initialStudent]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Mohon masukkan nama lengkap siswa.");
      return;
    }
    if (!className.trim()) {
      setErrorMsg("Mohon masukkan kelas siswa.");
      return;
    }
    if (!attendanceNumber.trim()) {
      setErrorMsg("Mohon masukkan nomor absen siswa.");
      return;
    }

    setErrorMsg(null);
    onSave({
      name: name.trim(),
      className: className.trim(),
      attendanceNumber: attendanceNumber.trim(),
      gender,
      studentId: attendanceNumber.trim(), // for backwards compatibility
    });
    onClose();
  };

  const handleClear = () => {
    setName("");
    setClassName("");
    setAttendanceNumber("");
    setGender("putra");
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Formulir Registrasi Peserta
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                Data Identitas Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ujian Praktik Lari Jarak Menengah 1.500 Meter (PJOK)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Alert */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Manual Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* 1. Nama Lengkap */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Nama Lengkap Siswa *</span>
            </label>
            <input
              id="input-student-name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Ketik nama lengkap siswa sesuai absensi..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition"
            />
          </div>

          {/* 2. Kelas & 3. No. Absen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Kelas *</span>
                </label>
                {className && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {className}
                  </span>
                )}
              </div>
              <select
                id="select-student-class"
                required
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition cursor-pointer"
              >
                <option value="">-- Pilih Kelas (XII 1 - XII 9) --</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
                {className && !CLASS_OPTIONS.includes(className) && (
                  <option value={className}>{className}</option>
                )}
              </select>

              {/* Quick-tap class buttons for fast 1-click selection */}
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {CLASS_OPTIONS.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setClassName(cls);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      className === cls
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.02]"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>No. Absen *</span>
                </label>
                {attendanceNumber && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Absen {attendanceNumber}
                  </span>
                )}
              </div>
              <select
                id="select-student-attendance"
                required
                value={attendanceNumber}
                onChange={(e) => {
                  setAttendanceNumber(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition cursor-pointer"
              >
                <option value="">-- Pilih No. Absen (1 - 36) --</option>
                {ATTENDANCE_OPTIONS.map((num) => (
                  <option key={num} value={num}>
                    Nomor Absen {num}
                  </option>
                ))}
                {attendanceNumber && !ATTENDANCE_OPTIONS.includes(attendanceNumber) && (
                  <option value={attendanceNumber}>Nomor Absen {attendanceNumber}</option>
                )}
              </select>

              <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Pilihan absen: 1 s.d. 36</span>
                {attendanceNumber ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Terpilih: Absen {attendanceNumber}
                  </span>
                ) : (
                  <span className="italic text-slate-400">Belum dipilih</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Gender Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori Gender (Standar Norma Penilaian) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-gender-putra"
                onClick={() => setGender("putra")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-between transition ${
                  gender === "putra"
                    ? "bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="text-left">
                  <p className="font-bold">Putra</p>
                  <p className="text-[11px] font-normal opacity-80">Laki-laki</p>
                </div>
                {gender === "putra" && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                id="btn-gender-putri"
                onClick={() => setGender("putri")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-between transition ${
                  gender === "putri"
                    ? "bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="text-left">
                  <p className="font-bold">Putri</p>
                  <p className="text-[11px] font-normal opacity-80">Perempuan</p>
                </div>
                {gender === "putri" && (
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              *Tolak ukur konversi nilai 80–100 mengacu pada norma waktu tes fisik 1.500m putra (&le; 5:30) dan putri (&le; 6:30).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium underline underline-offset-4"
            >
              Kosongkan Form
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Tutup
              </button>

              <button
                type="submit"
                id="btn-save-student-info"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Simpan & Pasang Data Siswa
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
