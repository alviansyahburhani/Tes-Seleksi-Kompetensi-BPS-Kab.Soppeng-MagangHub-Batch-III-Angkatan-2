export const EXAM_DURATION_SECONDS = 60 * 60; // 60 Menit
export const EXAM_SESSION_STORAGE_KEY = 'bps_skd_session_v1';

export const POSISI_OPTIONS = [
  'Staff Administrasi',
  'Publisitas dan Kehumasan',
  'Asisten Pengelola Keuangan',
] as const;

export const PILIHAN_OPSI_HURUF = ['A', 'B', 'C', 'D', 'E'] as const;

export const SHEET_NAMES = {
  SOAL: 'Soal',
  MONITORING: 'Monitoring_Peserta',
  LOG_PELANGGARAN: 'Log_Pelanggaran',
  JAWABAN_ADMIN: 'Jawaban_Administrasi',
  JAWABAN_HUMAS: 'Jawaban_Kehumasan',
  JAWABAN_KEUANGAN: 'Jawaban_Keuangan',
} as const;

/**
 * Menentukan nama tab Google Sheet tujuan berdasarkan posisi yang dipilih saat login.
 */
export function getTargetResultSheetName(posisiDilamar: string): string {
  const pos = (posisiDilamar || '').toUpperCase().trim();
  if (pos.includes('PUBLISITAS') || pos.includes('HUMAS') || pos.includes('KEHUMASAN')) {
    return SHEET_NAMES.JAWABAN_HUMAS;
  }
  if (pos.includes('KEUANGAN') || pos.includes('FINANCE')) {
    return SHEET_NAMES.JAWABAN_KEUANGAN;
  }
  return SHEET_NAMES.JAWABAN_ADMIN;
}
