import * as XLSX from "xlsx";
import { RunSession } from "../types";
import { formatTime, formatPace } from "./grading";

export function exportLeaderboardToExcel(
  runs: RunSession[],
  filterTitle: string = "Semua Data"
) {
  if (!runs || runs.length === 0) {
    alert("Tidak ada data siswa untuk diekspor ke Excel.");
    return;
  }

  const reportDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const exportTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sheetData: (string | number)[][] = [
    ["REKAPITULASI HASIL LARI 1.500 METER PJOK"],
    [`Kategori / Filter: ${filterTitle}`],
    [`Tanggal Ekspor: ${reportDate}, Pukul ${exportTime} WIB`],
    [],
    [
      "No",
      "Peringkat",
      "Mode",
      "Tanggal Lari",
      "Nama Lengkap Siswa",
      "No. Absen",
      "Kelas",
      "Gender",
      "Waktu Tempuh (1.5K)",
      "Waktu (Detik)",
      "Kecepatan (km/jam)",
      "Pace (menit/km)",
      "Nilai (80-100)",
      "Predikat",
      "Status",
    ],
  ];

  runs.forEach((run, index) => {
    const rank = index + 1;
    const speedKmh = Number(
      ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(2)
    );
    const timeInSeconds = Number((run.totalTimeMs / 1000).toFixed(2));
    const paceStr = formatPace(run.totalTimeMs / 1000 / 1.5);
    const status = run.score >= 80 ? "TUNTAS" : "REMIDIAL";
    const modeLabel = run.mode === "latihan" ? "Latihan" : "Ujian Lari";
    const runDateStr = run.runDate || run.date.slice(0, 10);

    sheetData.push([
      index + 1,
      `#${rank}`,
      modeLabel,
      runDateStr,
      run.student.name,
      run.student.attendanceNumber || run.student.studentId || "-",
      run.student.className,
      run.student.gender === "putra" ? "Putra" : "Putri",
      formatTime(run.totalTimeMs),
      timeInSeconds,
      speedKmh,
      paceStr,
      run.score,
      run.gradePredicate,
      status,
    ]);
  });

  if (runs.length > 0) {
    const avgScore = Number(
      (runs.reduce((acc, r) => acc + r.score, 0) / runs.length).toFixed(1)
    );
    sheetData.push([]);
    sheetData.push([
      "Ringkasan:",
      "",
      `Total: ${runs.length} Siswa`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Rata-rata Nilai:",
      avgScore,
      "",
      "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 6 },  // No
    { wch: 10 }, // Peringkat
    { wch: 14 }, // Mode
    { wch: 14 }, // Tanggal Lari
    { wch: 28 }, // Nama
    { wch: 12 }, // Absen
    { wch: 14 }, // Kelas
    { wch: 10 }, // Gender
    { wch: 18 }, // Waktu
    { wch: 14 }, // Detik
    { wch: 18 }, // Kecepatan
    { wch: 16 }, // Pace
    { wch: 14 }, // Nilai
    { wch: 18 }, // Predikat
    { wch: 12 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Lari 1.5K");

  const cleanTitle = filterTitle.replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Rekap_Lari_1.5K_${cleanTitle}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
