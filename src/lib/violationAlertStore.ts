export interface ActiveViolationAlert {
  id: string;
  namaPeserta: string;
  emailPeserta?: string;
  posisiDilamar: string;
  jenisPelanggaran: string;
  waktu: string;
  timestampMs: number;
  pelanggaranKe?: number;
}

const ALERT_TTL_MS = 60 * 60 * 1000; // Simpan riwayat alert aktif selama 60 menit (selama sesi ujian berlangsung)

const globalForAlert = globalThis as unknown as {
  bpsViolationAlerts?: ActiveViolationAlert[];
};

if (!globalForAlert.bpsViolationAlerts) {
  globalForAlert.bpsViolationAlerts = [];
}

export function addViolationAlert(alert: Omit<ActiveViolationAlert, 'id' | 'timestampMs'>) {
  const now = Date.now();
  const list = globalForAlert.bpsViolationAlerts || [];

  // Bersihkan yang sudah kedaluwarsa (> 60 menit)
  const filtered = list.filter((a) => now - a.timestampMs < ALERT_TTL_MS);

  // Jika ini adalah pembaruan untuk nomor pelanggaran (pelanggaranKe) dari peserta yang sama,
  // perbarui teks jenisPelanggaran pada item yang sudah ada agar detail di /monitoring selalu sama persis dengan Log_Pelanggaran
  const existingIdx = filtered.findIndex(
    (a) =>
      a.namaPeserta.toLowerCase() === alert.namaPeserta.toLowerCase() &&
      ((alert.pelanggaranKe && a.pelanggaranKe === alert.pelanggaranKe) ||
        (!alert.pelanggaranKe && now - a.timestampMs < 30000))
  );

  if (existingIdx !== -1) {
    filtered[existingIdx] = {
      ...filtered[existingIdx],
      jenisPelanggaran: alert.jenisPelanggaran,
      waktu: alert.waktu,
      pelanggaranKe: alert.pelanggaranKe ?? filtered[existingIdx].pelanggaranKe,
    };
    globalForAlert.bpsViolationAlerts = filtered;
    return filtered[existingIdx];
  }

  const newAlert: ActiveViolationAlert = {
    ...alert,
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    timestampMs: now,
  };

  filtered.unshift(newAlert);
  globalForAlert.bpsViolationAlerts = filtered.slice(0, 50);
  return newAlert;
}

export function getActiveViolationAlerts(): ActiveViolationAlert[] {
  const now = Date.now();
  const list = globalForAlert.bpsViolationAlerts || [];
  const valid = list.filter((a) => now - a.timestampMs < ALERT_TTL_MS);
  globalForAlert.bpsViolationAlerts = valid;
  return valid;
}

export function dismissViolationAlert(alertId?: string, namaPeserta?: string) {
  const list = globalForAlert.bpsViolationAlerts || [];
  if (alertId === 'ALL') {
    globalForAlert.bpsViolationAlerts = [];
    return;
  }
  globalForAlert.bpsViolationAlerts = list.filter((a) => {
    if (alertId && a.id === alertId) return false;
    if (namaPeserta && a.namaPeserta.toLowerCase() === namaPeserta.toLowerCase()) return false;
    return true;
  });
}

