export interface ActiveViolationAlert {
  id: string;
  namaPeserta: string;
  emailPeserta?: string;
  posisiDilamar: string;
  jenisPelanggaran: string;
  waktu: string;
  timestampMs: number;
}

const ALERT_TTL_MS = 10 * 60 * 1000; // Simpan riwayat alert aktif selama 10 menit di memori

const globalForAlert = globalThis as unknown as {
  bpsViolationAlerts?: ActiveViolationAlert[];
};

if (!globalForAlert.bpsViolationAlerts) {
  globalForAlert.bpsViolationAlerts = [];
}

export function addViolationAlert(alert: Omit<ActiveViolationAlert, 'id' | 'timestampMs'>) {
  const now = Date.now();
  const list = globalForAlert.bpsViolationAlerts || [];

  // Bersihkan yang sudah kedaluwarsa (> 10 menit)
  const filtered = list.filter((a) => now - a.timestampMs < ALERT_TTL_MS);

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

