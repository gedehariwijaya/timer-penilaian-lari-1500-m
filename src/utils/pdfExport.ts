import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RunSession } from "../types";
import { formatTime, formatPace, calculateRunGrade } from "./grading";

export function exportStudentRunToPDF(run: RunSession, teacherName = "Drs. Budi Santoso, M.Pd."): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const evalResult = calculateRunGrade(run.totalTimeMs, run.student.gender);
  const avgSpeedKmh = ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(2);
  const avgPaceSec = (run.totalTimeMs / 1000) / (run.totalDistanceM / 1000);

  // Header / Kop Laporan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LAPORAN HASIL UJIAN PRAKTIK PENJASORKES", 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Tes Kesegaran Jasmani Indonesia (TKJI) - Lari Jarak Menengah 1.500 Meter", 105, 24, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Tahun Ajaran 2025/2026 - Standar Penilaian Otomatis Kemampuan Aerobik", 105, 29, { align: "center" });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(14, 33, 196, 33);
  doc.setLineWidth(0.2);
  doc.line(14, 34.5, 196, 34.5);

  // Student Information Box
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("I. IDENTITAS PESERTA UJIAN", 14, 43);

  const studentData = [
    ["Nama Peserta", `: ${run.student.name}`, "Kelas", `: ${run.student.className}`],
    ["Nomor Absen", `: ${run.student.attendanceNumber || run.student.studentId || "-"}`, "Kategori Gender", `: ${run.student.gender === "putra" ? "Laki-laki (Putra)" : "Perempuan (Putri)"}`],
    ["Tanggal Pelaksanaan", `: ${new Date(run.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`, "Target Jarak", ": 1.500 Meter (1,5 KM)"],
  ];

  autoTable(doc, {
    startY: 46,
    margin: { left: 14, right: 14 },
    body: studentData,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", cellWidth: 35 },
      3: { cellWidth: 55 },
    },
  });

  // Performance Summary Box
  const summaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("II. RINGKASAN CAPAIAN WAKTU & EVALUASI NILAI", 14, summaryY);

  const scoreBoxY = summaryY + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, scoreBoxY, 182, 28, 3, 3, "FD");

  // Inside Box: Metric Grid
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("WAKTU TEMPUH TOTAL", 22, scoreBoxY + 8);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatTime(run.totalTimeMs), 22, scoreBoxY + 16);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("KECEPATAN RATA-RATA", 68, scoreBoxY + 8);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${avgSpeedKmh} km/jam`, 68, scoreBoxY + 16);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("RATA-RATA PACE", 114, scoreBoxY + 8);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatPace(avgPaceSec), 114, scoreBoxY + 16);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("NILAI AKHIR (80-100)", 156, scoreBoxY + 8);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${evalResult.score}`, 156, scoreBoxY + 16);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Predikat: ${evalResult.predicate}`, 156, scoreBoxY + 23);

  // KM Splits Table
  const kmTableY = scoreBoxY + 34;
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("III. GRAFIK & ANALISIS SPLIT PER KILOMETER", 14, kmTableY);

  const kmBody = (run.kmSplits && run.kmSplits.length > 0)
    ? run.kmSplits.map((km) => [
        `KM ${km.kmMarker.toFixed(1)}`,
        formatTime(km.splitTimeMs),
        formatTime(km.elapsedTimeMs),
        `${km.speedKmh.toFixed(1)} km/jam`,
        formatPace(km.paceSecondsPerKm),
      ])
    : [
        ["KM 1.0 (0-1000m)", formatTime(Math.min(run.totalTimeMs * 0.67, 300000)), formatTime(Math.min(run.totalTimeMs * 0.67, 300000)), `${avgSpeedKmh} km/jam`, formatPace(avgPaceSec)],
        ["KM 1.5 (1000-1500m)", formatTime(run.totalTimeMs - Math.min(run.totalTimeMs * 0.67, 300000)), formatTime(run.totalTimeMs), `${avgSpeedKmh} km/jam`, formatPace(avgPaceSec)],
      ];

  autoTable(doc, {
    startY: kmTableY + 4,
    margin: { left: 14, right: 14 },
    head: [["Segmen Jarak", "Waktu Segmen (Split)", "Waktu Kumulatif", "Kecepatan", "Pace"]],
    body: kmBody,
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2, halign: "center" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
  });

  // Detailed Lap Times Table
  const lapTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("IV. REKAM WAKTU PUTARAN (LAP TIME RECORD)", 14, lapTableY);

  const lapBody = run.laps.map((lap) => [
    `Putaran ${lap.lapNumber}`,
    `${lap.lapDistanceM} meter`,
    `${lap.cumulativeDistanceM} m`,
    formatTime(lap.lapTimeMs),
    formatTime(lap.totalElapsedMs),
    `${lap.speedKmh.toFixed(1)} km/jam`,
    formatPace(lap.paceSecondsPerKm),
  ]);

  autoTable(doc, {
    startY: lapTableY + 4,
    margin: { left: 14, right: 14 },
    head: [["Putaran", "Jarak Lap", "Total Jarak", "Waktu Putaran", "Total Elapsed", "Kecepatan", "Pace"]],
    body: lapBody.length > 0 ? lapBody : [["-", "-", "-", "-", "-", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // Teacher Evaluation & Signature Block
  const notesY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, notesY, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Catatan Evaluasi Guru Penjasorkes:", 18, notesY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(run.notes || evalResult.description, 18, notesY + 11, { maxWidth: 174 });
  doc.text(`Rekomendasi: ${evalResult.recommendations.join(" • ")}`, 18, notesY + 17, { maxWidth: 174 });

  // Signature Block
  const signY = notesY + 28;
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Peserta Ujian,", 25, signY);
  doc.text("Mengetahui, Guru Penguji Penjas", 130, signY);

  doc.setFont("helvetica", "bold");
  doc.text(run.student.name, 25, signY + 18);
  doc.text(teacherName, 130, signY + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text(`No. Absen: ${run.student.attendanceNumber || run.student.studentId || "-"}`, 25, signY + 22);
  doc.text("NIP. 19820415 200801 1 009", 130, signY + 22);

  // Footer
  doc.setFontSize(7);
  doc.text(`Dicetak secara otomatis melalui Sistem Evaluasi Lari 1.5K pada ${new Date().toLocaleString("id-ID")}`, 105, 290, { align: "center" });

  doc.save(`Laporan_Ujian_Lari_1500m_${run.student.name.replace(/\s+/g, "_")}.pdf`);
}

export function exportClassLeaderboardToPDF(runs: RunSession[], classNameFilter = "Semua Kelas"): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REKAPITULASI HASIL & KLASEMEN UJIAN LARI 1.500 METER", 148, 16, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Mata Pelajaran: Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK) • Filter: ${classNameFilter}`, 148, 22, { align: "center" });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(14, 26, 283, 26);

  // Table Body
  const sorted = [...runs].sort((a, b) => a.totalTimeMs - b.totalTimeMs);
  const rows = sorted.map((run, idx) => {
    const evalRes = calculateRunGrade(run.totalTimeMs, run.student.gender);
    const avgSpeed = ((run.totalDistanceM / 1000) / (run.totalTimeMs / 3600000)).toFixed(1);
    const avgPace = (run.totalTimeMs / 1000) / (run.totalDistanceM / 1000);

    return [
      String(idx + 1),
      run.student.name,
      run.student.attendanceNumber || run.student.studentId || "-",
      run.student.className,
      run.student.gender === "putra" ? "Putra" : "Putri",
      formatTime(run.totalTimeMs),
      `${avgSpeed} km/j`,
      formatPace(avgPace),
      String(evalRes.score),
      evalRes.predicate,
      new Date(run.date).toLocaleDateString("id-ID"),
    ];
  });

  autoTable(doc, {
    startY: 30,
    margin: { left: 14, right: 14 },
    head: [["Peringkat", "Nama Siswa", "No. Absen", "Kelas", "Gender", "Waktu 1.5K", "Kecepatan", "Pace", "Nilai (80-100)", "Predikat", "Tanggal"]],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 8.5, halign: "center" },
    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 16 },
      1: { halign: "left", fontStyle: "bold", cellWidth: 45 },
      2: { cellWidth: 26 },
      3: { cellWidth: 24 },
      4: { cellWidth: 18 },
      8: { fontStyle: "bold", textColor: [16, 185, 129] },
    },
  });

  // Footer Stats
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const avgScore = (sorted.reduce((acc, curr) => acc + curr.score, 0) / (sorted.length || 1)).toFixed(1);
  const bestRun = sorted[0];

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Peserta Didik: ${sorted.length} Siswa | Rata-rata Nilai: ${avgScore} | Waktu Tercepat: ${bestRun ? `${bestRun.student.name} (${formatTime(bestRun.totalTimeMs)})` : "-"}`, 14, finalY);

  doc.save(`Rekap_Klasemen_Lari_1500m_${classNameFilter.replace(/\s+/g, "_")}.pdf`);
}
