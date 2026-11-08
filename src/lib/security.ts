import crypto from 'crypto';

/**
 * 1. SANITIZER ANTI-FORMULA INJECTION (CSV / Google Sheets Injection)
 * Mencegah peserta memasukkan formula berbahaya seperti `=IMPORTRANGE(...)`, `=IMAGE(...)`, `+`, `-`, `@`
 * yang dapat dieksekusi oleh Google Spreadsheet atau memicu error `#NAME?` / `#ERROR!`.
 */
export function sanitizeSheetValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Jika diawali karakter pemicu rumus spreadsheet (=, +, -, @, Tab, CR), tambahkan apostrof atau spasi aman
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function sanitizeSheetRow(row: unknown[]): (string | number)[] {
  return row.map((cell) => {
    if (typeof cell === 'number') return cell;
    return sanitizeSheetValue(cell);
  });
}

/**
 * 2. VERIFIKASI PIN ADMIN UNTUK HALAMAN & ENDPOINT MONITORING
 * Default PIN jika belum disetel di .env.local adalah `bps7312` (Kode Wilayah BPS Kab. Soppeng: 7312).
 */
export function verifyAdminPin(inputPin: string | null | undefined): boolean {
  const expectedPin = (process.env.ADMIN_PIN || 'bps7312').trim();
  const provided = (inputPin || '').trim();
  if (!provided) return false;
  return provided === expectedPin;
}

/**
 * 3. SERVER-SIDE SESSION & ANTI-TAMPERING STORE (In-Memory)
 * Menyimpan:
 * - Batas waktu resmi (`endTimeMs`) masing-masing peserta (agar peserta tidak bisa menambah waktu lewat DevTools/localStorage)
 * - Jumlah pelanggaran resmi yang tercatat di server (`violationsCount`) (agar peserta tidak bisa mereset pelanggaran ke 0 lewat DevTools)
 * - Status `hasSubmitted` (Idempotency Lock untuk mencegah Double Submit / Spam Submit)
 */
export interface ServerParticipantSession {
  key: string;
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  endTimeMs: number;
  violationsCount: number;
  hasSubmitted: boolean;
  monitoringRowNumber: number | null;
  sessionToken: string;
}

export interface ResetAccountRequest {
  id: string;
  rowNumber: number;
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  alasan?: string;
  waktu: string;
}

const globalForSecurity = globalThis as unknown as {
  bpsParticipantSessions?: Map<string, ServerParticipantSession>;
  bpsSubmittedKeys?: Set<string>;
  bpsApprovedKompetensiRows?: Set<number>;
  bpsApprovedKompetensiKeys?: Set<string>;
  bpsResetAccountRequests?: Map<string, ResetAccountRequest>;
  bpsApprovedResetKeys?: Set<string>;
  bpsRejectedResetKeys?: Set<string>;
};

if (!globalForSecurity.bpsParticipantSessions) {
  globalForSecurity.bpsParticipantSessions = new Map<string, ServerParticipantSession>();
}
if (!globalForSecurity.bpsSubmittedKeys) {
  globalForSecurity.bpsSubmittedKeys = new Set<string>();
}
if (!globalForSecurity.bpsApprovedKompetensiRows) {
  globalForSecurity.bpsApprovedKompetensiRows = new Set<number>();
}
if (!globalForSecurity.bpsApprovedKompetensiKeys) {
  globalForSecurity.bpsApprovedKompetensiKeys = new Set<string>();
}
if (!globalForSecurity.bpsResetAccountRequests) {
  globalForSecurity.bpsResetAccountRequests = new Map<string, ResetAccountRequest>();
}
if (!globalForSecurity.bpsApprovedResetKeys) {
  globalForSecurity.bpsApprovedResetKeys = new Set<string>();
}
if (!globalForSecurity.bpsRejectedResetKeys) {
  globalForSecurity.bpsRejectedResetKeys = new Set<string>();
}

function getSecretKey(): string {
  return (process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SHEET_ID || 'bps-soppeng-7312-secret').slice(0, 64);
}

export function normalizeParticipantKey(email?: string, nama?: string): string {
  const e = (email || '').trim().toLowerCase();
  const n = (nama || '').trim().toLowerCase();
  return e || n;
}

export function createSessionToken(email: string, nama: string, endTimeMs: number): string {
  const payload = `${normalizeParticipantKey(email, nama)}|${endTimeMs}`;
  return crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
}

export function registerServerParticipantSession(params: {
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  endTimeMs: number;
  monitoringRowNumber: number | null;
}): ServerParticipantSession {
  const key = normalizeParticipantKey(params.emailPeserta, params.namaPeserta);
  const nameKey = normalizeParticipantKey('', params.namaPeserta);
  const sessionToken = createSessionToken(params.emailPeserta, params.namaPeserta, params.endTimeMs);

  const session: ServerParticipantSession = {
    key,
    namaPeserta: params.namaPeserta.trim(),
    emailPeserta: params.emailPeserta.trim(),
    posisiDilamar: params.posisiDilamar,
    endTimeMs: params.endTimeMs,
    violationsCount: 0,
    hasSubmitted: false,
    monitoringRowNumber: params.monitoringRowNumber,
    sessionToken,
  };

  globalForSecurity.bpsParticipantSessions!.set(key, session);
  if (nameKey && nameKey !== key) {
    globalForSecurity.bpsParticipantSessions!.set(nameKey, session);
  }
  if (key) globalForSecurity.bpsSubmittedKeys!.delete(key);
  if (nameKey) globalForSecurity.bpsSubmittedKeys!.delete(nameKey);
  return session;
}

export function incrementServerViolation(email?: string, nama?: string): number {
  const key = normalizeParticipantKey(email, nama);
  const nameKey = normalizeParticipantKey('', nama);
  const store = globalForSecurity.bpsParticipantSessions!;

  const session = store.get(key) || store.get(nameKey);
  if (session) {
    session.violationsCount += 1;
    return session.violationsCount;
  }
  return 1;
}

export function getServerParticipantSession(
  email?: string,
  nama?: string
): ServerParticipantSession | undefined {
  const key = normalizeParticipantKey(email, nama);
  const nameKey = normalizeParticipantKey('', nama);
  const store = globalForSecurity.bpsParticipantSessions!;
  return store.get(key) || store.get(nameKey);
}

export function hasParticipantAlreadySubmitted(email?: string, nama?: string): boolean {
  const emailKey = normalizeParticipantKey(email, '');
  const nameKey = normalizeParticipantKey('', nama);
  const submittedSet = globalForSecurity.bpsSubmittedKeys!;

  if (emailKey && submittedSet.has(emailKey)) return true;
  if (nameKey && submittedSet.has(nameKey)) return true;

  const session = getServerParticipantSession(email, nama);
  return Boolean(session?.hasSubmitted);
}

export function markParticipantSubmitted(email?: string, nama?: string): void {
  const emailKey = normalizeParticipantKey(email, '');
  const nameKey = normalizeParticipantKey('', nama);
  const submittedSet = globalForSecurity.bpsSubmittedKeys!;

  if (emailKey) submittedSet.add(emailKey);
  if (nameKey) submittedSet.add(nameKey);

  const session = getServerParticipantSession(email, nama);
  if (session) {
    session.hasSubmitted = true;
  }
}

/**
 * 4. MANAJEMEN APPROVE AKSES TES KOMPETENSI (TANPA MENGISI KOLOM STATUS UJIAN SEBELUM PESERTA KLIK MULAI)
 */
export function setKompetensiApproved(
  rowNumber?: number | null,
  email?: string,
  nama?: string,
  approved = true
): void {
  const rowSet = globalForSecurity.bpsApprovedKompetensiRows!;
  const keySet = globalForSecurity.bpsApprovedKompetensiKeys!;
  const emailKey = normalizeParticipantKey(email, '');
  const nameKey = normalizeParticipantKey('', nama);

  if (approved) {
    if (rowNumber) rowSet.add(Number(rowNumber));
    if (emailKey) keySet.add(emailKey);
    if (nameKey) keySet.add(nameKey);
  } else {
    if (rowNumber) rowSet.delete(Number(rowNumber));
    if (emailKey) keySet.delete(emailKey);
    if (nameKey) keySet.delete(nameKey);
  }
}

export function isKompetensiApproved(
  rowNumber?: number | null,
  email?: string,
  nama?: string,
  sheetStatusUjian?: string
): boolean {
  const upperStatus = (sheetStatusUjian || '').toUpperCase().trim();
  if (
    upperStatus.includes('SIAP') ||
    upperStatus.includes('APPROVED') ||
    upperStatus.includes('SEDANG') ||
    upperStatus.includes('SELESAI')
  ) {
    return true;
  }

  const rowSet = globalForSecurity.bpsApprovedKompetensiRows!;
  const keySet = globalForSecurity.bpsApprovedKompetensiKeys!;
  const emailKey = normalizeParticipantKey(email, '');
  const nameKey = normalizeParticipantKey('', nama);

  if (rowNumber && rowSet.has(Number(rowNumber))) return true;
  if (emailKey && keySet.has(emailKey)) return true;
  if (nameKey && keySet.has(nameKey)) return true;

  return false;
}

/**
 * Mengecek apakah di memori server (RAM) masih tersimpan riwayat sesi ujian atau status submit
 * untuk peserta tertentu (digunakan untuk mendeteksi apakah data ujian di Sheet baru saja dihapus/di-reset Admin).
 */
export function hasParticipantExamMemory(
  rowNumber?: number | null,
  email?: string,
  nama?: string
): boolean {
  const emailKey = normalizeParticipantKey(email, '');
  const nameKey = normalizeParticipantKey('', nama);
  const submittedSet = globalForSecurity.bpsSubmittedKeys!;
  const sessionStore = globalForSecurity.bpsParticipantSessions!;

  if (emailKey && (submittedSet.has(emailKey) || sessionStore.has(emailKey))) return true;
  if (nameKey && (submittedSet.has(nameKey) || sessionStore.has(nameKey))) return true;

  if (rowNumber) {
    for (const sess of sessionStore.values()) {
      if (sess.monitoringRowNumber && Number(sess.monitoringRowNumber) === Number(rowNumber)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Membersihkan seluruh state in-memory di server (Approve Kompetensi, Sesi Ujian, Status Submit, Reset Akun)
 * ketika data peserta di Monitoring_Peserta dihapus / di-reset oleh Admin.
 */
export function clearParticipantServerState(
  rowNumber?: number | null,
  email?: string,
  nama?: string
): void {
  const rowSet = globalForSecurity.bpsApprovedKompetensiRows!;
  const keySet = globalForSecurity.bpsApprovedKompetensiKeys!;
  const submittedSet = globalForSecurity.bpsSubmittedKeys!;
  const sessionStore = globalForSecurity.bpsParticipantSessions!;

  const emailKey = normalizeParticipantKey(email, '');
  const nameKey = normalizeParticipantKey('', nama);

  if (rowNumber) {
    rowSet.delete(Number(rowNumber));
  }
  if (emailKey) {
    keySet.delete(emailKey);
    submittedSet.delete(emailKey);
  }
  if (nameKey) {
    keySet.delete(nameKey);
    submittedSet.delete(nameKey);
  }

  for (const [k, sess] of sessionStore.entries()) {
    const sessEmailKey = normalizeParticipantKey(sess.emailPeserta, '');
    const sessNameKey = normalizeParticipantKey('', sess.namaPeserta);
    const matchRow =
      rowNumber &&
      sess.monitoringRowNumber &&
      Number(sess.monitoringRowNumber) === Number(rowNumber);
    const matchEmail = emailKey && (k === emailKey || sessEmailKey === emailKey);
    const matchName = nameKey && (k === nameKey || sessNameKey === nameKey);

    if (matchRow || matchEmail || matchName) {
      sessionStore.delete(k);
      if (sessEmailKey) {
        keySet.delete(sessEmailKey);
        submittedSet.delete(sessEmailKey);
      }
      if (sessNameKey) {
        keySet.delete(sessNameKey);
        submittedSet.delete(sessNameKey);
      }
    }
  }
}

/**
 * 5. MANAJEMEN PENGAJUAN GANTI AKUN / KELUAR DARI LOBBY (APPROVAL ADMIN)
 */
export function requestAccountReset(params: {
  rowNumber: number;
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  alasan?: string;
}): ResetAccountRequest {
  const key = normalizeParticipantKey(params.emailPeserta, params.namaPeserta);
  const waktu = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const request: ResetAccountRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    rowNumber: params.rowNumber,
    namaPeserta: params.namaPeserta.trim(),
    emailPeserta: params.emailPeserta.trim(),
    posisiDilamar: params.posisiDilamar,
    alasan: params.alasan || 'Ingin ganti akun / data kehadiran',
    waktu,
  };

  globalForSecurity.bpsResetAccountRequests!.set(key, request);
  globalForSecurity.bpsApprovedResetKeys!.delete(key);
  globalForSecurity.bpsRejectedResetKeys!.delete(key);
  return request;
}

export function getPendingAccountResetRequests(): ResetAccountRequest[] {
  return Array.from(globalForSecurity.bpsResetAccountRequests!.values());
}

export function checkAccountResetStatus(
  email?: string,
  nama?: string
): 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE' {
  const key = normalizeParticipantKey(email, nama);
  if (globalForSecurity.bpsApprovedResetKeys!.has(key)) {
    return 'APPROVED';
  }
  if (globalForSecurity.bpsRejectedResetKeys!.has(key)) {
    return 'REJECTED';
  }
  if (globalForSecurity.bpsResetAccountRequests!.has(key)) {
    return 'PENDING';
  }
  return 'NONE';
}

export function resolveAccountResetRequest(
  keyOrId: string,
  action: 'APPROVE' | 'REJECT'
): boolean {
  const store = globalForSecurity.bpsResetAccountRequests!;
  let targetKey: string | null = null;

  for (const [key, req] of store.entries()) {
    if (key === keyOrId || req.id === keyOrId) {
      targetKey = key;
      break;
    }
  }

  if (!targetKey) return false;

  store.delete(targetKey);

  if (action === 'APPROVE') {
    globalForSecurity.bpsApprovedResetKeys!.add(targetKey);
    globalForSecurity.bpsRejectedResetKeys!.delete(targetKey);
  } else {
    globalForSecurity.bpsRejectedResetKeys!.add(targetKey);
    globalForSecurity.bpsApprovedResetKeys!.delete(targetKey);
  }

  return true;
}

export function clearAccountResetResolution(email?: string, nama?: string): void {
  const key = normalizeParticipantKey(email, nama);
  globalForSecurity.bpsApprovedResetKeys!.delete(key);
  globalForSecurity.bpsRejectedResetKeys!.delete(key);
  globalForSecurity.bpsResetAccountRequests!.delete(key);
}



