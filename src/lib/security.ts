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

const globalForSecurity = globalThis as unknown as {
  bpsParticipantSessions?: Map<string, ServerParticipantSession>;
  bpsSubmittedKeys?: Set<string>;
};

if (!globalForSecurity.bpsParticipantSessions) {
  globalForSecurity.bpsParticipantSessions = new Map<string, ServerParticipantSession>();
}
if (!globalForSecurity.bpsSubmittedKeys) {
  globalForSecurity.bpsSubmittedKeys = new Set<string>();
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

