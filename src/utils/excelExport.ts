import * as XLSX from "xlsx";
import { RunSession } from "../types";
import { formatTime, formatPace } from "./grading";

export function exportLeaderboardToExcel(
  runs: RunSession[],
  filterTitle: string = "Semua Kelas"
) {
  if (!runs || runs.length === 0) {
    alert("Tidak ada data siswa untuk diekspor ke Excel.");
    return;
  }

  // Prepare header info rows
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

  // Build rows as array of objects or arrays
  // Using 2D array for exact layout with title banner
  const sheetData: (string | number)[][] = [
    ["REKAPITULASI NILAI UJIAN LARI JARAK MENENGAH 1.500 METER"],
    ["Mata Pelajaran: Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)"],
    [`Filter / Kelompok: ${filterTitle}`],
    [`Tanggal Ekspor: ${reportDate}, Pukul ${exportTime} WIB`],
    [], // Blank separator row
    [
      "No",
      "Peringkat",
      "Nama Lengkap Siswa",
      "No. Absen",
      "Kelas",
      "Gender",
      "Waktu Tempuh (1.5K)",
      "Waktu (Detik)",
      "Kecepatan (km/jam)",
      "Pace (menit/km)",
      "Nilai Akhir (80-100)",
      "Predikat Nilai",
      "Status",
      "Tanggal Ujian",
    ],
  ];

  // Append student rows
  runs.forEach((run, index) => {
    const rank = index + 1;
    const speedKmh = Number(
      ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(2)
    );
    const timeInSeconds = Number((run.totalTimeMs / 1000).toFixed(2));
    const paceStr = formatPace(run.totalTimeMs / 1000 / 1.5);
    const status = run.score >= 80 ? "TUNTAS" : "REMIDIAL";
    const runDate = new Date(run.date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    sheetData.push([
      index + 1,
      `Juara ${rank}`,
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
      runDate,
    ]);
  });

  // Append summary row
  if (runs.length > 0) {
    const avgScore = Number(
      (runs.reduce((acc, r) => acc + r.score, 0) / runs.length).toFixed(1)
    );
    sheetData.push([]);
    sheetData.push([
      "Ringkasan:",
      "",
      `Total Siswa: ${runs.length} Orang`,
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
      "",
    ]);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws["!cols"] = [
    { wch: 6 },  // No
    { wch: 12 }, // Peringkat
    { wch: 28 }, // Nama Lengkap Siswa
    { wch: 12 }, // No. Absen
    { wch: 14 }, // Kelas
    { wch: 10 }, // Gender
    { wch: 18 }, // Waktu Tempuh
    { wch: 14 }, // Waktu (Detik)
    { wch: 18 }, // Kecepatan (km/jam)
    { wch: 16 }, // Pace
    { wch: 18 }, // Nilai Akhir
    { wch: 18 }, // Predikat
    { wch: 12 }, // Status
    { wch: 20 }, // Tanggal Ujian
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nilai Lari 1.5K");

  // Generate clean filename
  const cleanTitle = filterTitle.replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Nilai_Lari_1.5K_${cleanTitle}_${dateStr}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(wb, fileName);
}
