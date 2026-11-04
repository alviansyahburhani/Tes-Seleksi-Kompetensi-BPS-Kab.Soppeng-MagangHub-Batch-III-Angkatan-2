import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';

interface MonitoringCacheStore {
  rows: any[][];
  lastFetchedAt: number;
  inFlightPromise: Promise<any[][]> | null;
}

const globalForMonitoring = globalThis as unknown as {
  bpsMonitoringCache?: MonitoringCacheStore;
};

if (!globalForMonitoring.bpsMonitoringCache) {
  globalForMonitoring.bpsMonitoringCache = {
    rows: [],
    lastFetchedAt: 0,
    inFlightPromise: null,
  };
}

const CACHE_TTL_MS = 5000; // 5 Detik TTL untuk mereduksi 90% panggilan ke Google Sheets API

/**
 * Mengambil data baris sheet Monitoring_Peserta!A2:J500 dengan RAM Cache 5 Detik.
 * Jika ada 50 request masuk dalam rentang 5 detik, Google Sheets API HANYA dipanggil 1 kali.
 */
export async function getCachedMonitoringRows(forceFresh = false): Promise<any[][]> {
  const cache = globalForMonitoring.bpsMonitoringCache!;
  const now = Date.now();

  // Jika cache masih segar (< 5 detik) dan ada isinya, langsung kembalikan dari RAM
  if (!forceFresh && cache.rows.length > 0 && now - cache.lastFetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }

  // Jika sedang ada proses fetch yang berjalan, ikut menunggu promise yang sama (Request Coalescing)
  if (cache.inFlightPromise) {
    return cache.inFlightPromise;
  }

  cache.inFlightPromise = (async () => {
    try {
      const { sheets, spreadsheetId } = await getGoogleSheetsInstance();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A2:Z500`,
      });
      const rows = res.data.values || [];
      cache.rows = rows;
      cache.lastFetchedAt = Date.now();
      return rows;
    } catch (err) {
      // Jika Google Sheets error / rate limit, fallback kembalikan data cache terakhir
      if (cache.rows.length > 0) {
        return cache.rows;
      }
      throw err;
    } finally {
      cache.inFlightPromise = null;
    }
  })();

  return cache.inFlightPromise;
}

/**
 * Hapus cache seketika agar request berikutnya langsung mengambil data paling mutakhir dari Google Sheets.
 * Dipanggil saat:
 * 1. Admin melakukan Approve Kompetensi / Wawancara / Reset Akun
 * 2. Peserta baru mendaftarkan diri di Form Kehadiran
 */
export function invalidateMonitoringCache(): void {
  const cache = globalForMonitoring.bpsMonitoringCache!;
  cache.lastFetchedAt = 0;
}

