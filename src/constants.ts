/**
 * Standar kelas dan nomor absen untuk ujian PJOK Lari 1.500m
 */

export const CLASS_OPTIONS: readonly string[] = [
  "XII 1",
  "XII 2",
  "XII 3",
  "XII 4",
  "XII 5",
  "XII 6",
  "XII 7",
  "XII 8",
  "XII 9",
] as const;

export const ATTENDANCE_OPTIONS: readonly string[] = Array.from(
  { length: 36 },
  (_, i) => String(i + 1)
);
