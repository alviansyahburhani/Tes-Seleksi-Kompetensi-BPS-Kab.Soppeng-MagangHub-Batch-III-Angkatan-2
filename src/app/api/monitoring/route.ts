import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';
import { getActiveViolationAlerts } from '@/lib/violationAlertStore';
import { getCachedMonitoringRows, invalidateMonitoringCache } from '@/lib/sheetsCache';
import {
  clearParticipantServerState,
  getPendingAccountResetRequests,
  getServerParticipantSession,
  hasParticipantExamMemory,
  isKompetensiApproved,
  resolveAccountResetRequest,
  sanitizeSheetRow,
  setKompetensiApproved,
  verifyAdminPin,
} from '@/lib/security';

function parseNomorAntrean(rawVal: unknown): number | null {
  const str = (rawVal ?? '').toString().trim();
  if (!str) return null;
  const match = str.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export async function GET(request: Request) {
  try {
    // Proteksi Endpoint Monitoring: Hanya Admin dengan PIN yang valid yang boleh melihat data peserta
    const adminPin = request.headers.get('x-admin-pin');
    if (!verifyAdminPin(adminPin)) {
      return NextResponse.json(
        {
          success: false,
          unauthorized: true,
          error: 'PIN Admin tidak valid atau belum dimasukkan.',
        },
        { status: 401 }
      );
    }

    // Ambil data dari sheet Monitoring_Peserta via RAM Cache (maksimal 1x read per 5 detik, anti-rate limit)
    let monitoringRows: any[] = [];
    try {
      monitoringRows = await getCachedMonitoringRows();
    } catch {
      monitoringRows = [];
    }

    // Hitung angka antrean tertinggi yang sudah tercatat di Kolom M (index 12) pada peserta aktif
    let maxExistingQueue = 0;
    for (const row of monitoringRows) {
      const rNama = (row?.[0] || '').toString().trim();
      const rEmail = (row?.[1] || '').toString().trim();
      const rTelp = (row?.[2] || '').toString().trim();
      const rPos = (row?.[3] || '').toString().trim();
      if (!rNama || !rEmail || !rTelp || !rPos) continue;
      const qNum = parseNomorAntrean(row?.[12]);
      if (qNum && qNum > maxExistingQueue) {
        maxExistingQueue = qNum;
      }
    }

    const pendingColMUpdates: { range: string; values: string[][] }[] = [];

    const pesertaList = monitoringRows
      .map((row: any, idx: number) => {
        const rowNumber = idx + 2;
        const namaPeserta = (row?.[0] || '').toString().trim();
        const emailPeserta = (row?.[1] || '').toString().trim();
        const teleponPeserta = (row?.[2] || '').toString().trim();
        const posisiDilamar = (row?.[3] || '').toString().trim();
        const waktuMulai = (row?.[5] || '').toString().trim();
        const batasSelesai = (row?.[6] || '').toString().trim();
        const sisaWaktu = (row?.[7] || '').toString().trim();
        const progressStr = (row?.[8] || '').toString().trim();
        const statusUjian = (row?.[9] || '').toString().trim();
        const statusWawancara = (row?.[10] || '').toString().trim();
        const statusKelulusan = (row?.[11] || '').toString().trim();
        const rawAntreanColM = (row?.[12] || '').toString().trim();

        if (!namaPeserta || !emailPeserta || !teleponPeserta || !posisiDilamar) {
          if (!namaPeserta && emailPeserta) {
            clearParticipantServerState(rowNumber, emailPeserta, '');
            // Jika baris peserta dihapus Admin tetapi Kolom M masih menyisakan angka antrean lama, bersihkan Kolom M
            if (rawAntreanColM) {
              row[12] = '';
              pendingColMUpdates.push({
                range: `${SHEET_NAMES.MONITORING}!M${rowNumber}`,
                values: [['']],
              });
            }
          }
          return null;
        }

        if (!waktuMulai && !statusUjian && hasParticipantExamMemory(rowNumber, emailPeserta, namaPeserta)) {
          clearParticipantServerState(rowNumber, emailPeserta, namaPeserta);
        }

        // Tarik Nomor Antrean dari Kolom M (index 12).
        // Jika peserta sudah mengisi daftar hadir tetapi Kolom M masih kosong, isi otomatis dimulai dari 1
        let nomorAntrean = parseNomorAntrean(rawAntreanColM);
        if (!nomorAntrean) {
          maxExistingQueue += 1;
          nomorAntrean = maxExistingQueue;
          row[12] = String(nomorAntrean);
          pendingColMUpdates.push({
            range: `${SHEET_NAMES.MONITORING}!M${rowNumber}`,
            values: [[String(nomorAntrean)]],
          });
        }

        // Parse "5 / 20 Soal" menjadi angka terjawab & totalSoal
        const matchProgress = progressStr.match(/(\d+)\s*\/\s*(\d+)/);
        const terjawab = matchProgress ? parseInt(matchProgress[1], 10) : 0;
        const totalSoal = matchProgress ? parseInt(matchProgress[2], 10) : 0;

        // Parse "MM:SS" menjadi total detik, atau gunakan sisa detik real-time dari sesi server
        // agar countdown di /monitoring tidak loncat mundur saat sinkronisasi 10 detik
        const matchTime = sisaWaktu.match(/(\d+):(\d+)/);
        let sisaDetik = matchTime
          ? parseInt(matchTime[1], 10) * 60 + parseInt(matchTime[2], 10)
          : 0;

        const isFinished = statusUjian.toUpperCase().includes('SELESAI');
        if (!isFinished) {
          const activeSession = getServerParticipantSession(emailPeserta, namaPeserta);
          if (activeSession && activeSession.endTimeMs) {
            sisaDetik = Math.max(0, Math.floor((activeSession.endTimeMs - Date.now()) / 1000));
          }
        }

        const kompetensiApproved = isKompetensiApproved(
          rowNumber,
          emailPeserta,
          namaPeserta,
          statusUjian
        );

        const upperWawancara = statusWawancara.toUpperCase();
        const wawancaraApproved =
          upperWawancara.includes('SUDAH') ||
          upperWawancara.includes('SELESAI') ||
          upperWawancara.includes('APPROVED');

        return {
          id: idx + 1,
          rowNumber,
          nomorAntrean,
          namaPeserta,
          emailPeserta,
          teleponPeserta,
          posisiDilamar,
          waktuMulai: waktuMulai || '-',
          batasSelesai: batasSelesai || '-',
          sisaWaktu: sisaWaktu || '00:00',
          sisaDetik,
          progressStr: progressStr || '0 / 0 Soal',
          terjawab,
          totalSoal,
          statusUjian,
          statusWawancara,
          statusKelulusan,
          kompetensiApproved,
          wawancaraApproved,
        };
      })
      .filter(Boolean);

    // Jika ada Kolom M yang perlu disinkronkan ke Google Sheets (misal pengisian awal / pembersihan baris yang di-reset),
    // jalankan di background tanpa menghambat response monitoring
    if (pendingColMUpdates.length > 0) {
      getGoogleSheetsInstance()
        .then(({ sheets, spreadsheetId }) =>
          sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
              valueInputOption: 'RAW',
              data: pendingColMUpdates,
            },
          })
        )
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: pesertaList,
      activeAlerts: getActiveViolationAlerts(),
      resetRequests: getPendingAccountResetRequests(),
      updatedAt: new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
      }),
    });
  } catch (error: any) {
    console.error('[GET /api/monitoring Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memuat data monitoring dari server.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/monitoring
 * Digunakan oleh Admin pada Sidebar Approve di /monitoring:
 * - `type: 'APPROVE_KOMPETENSI'` -> Mengizinkan peserta memulai Tes Seleksi Kompetensi
 *   (Tanpa mengisi kolom Status Ujian di Spreadsheet; kolom E-I tetap kosong sampai peserta klik "Mulai Ujian").
 * - `type: 'APPROVE_WAWANCARA'` -> Mengisi kolom J (`Status Wawancara`) di Spreadsheet menjadi `SUDAH WAWANCARA (...)`.
 * - `type: 'REVOKE_WAWANCARA'` -> Mengosongkan kembali kolom J jika Admin salah klik.
 */
export async function PATCH(request: Request) {
  try {
    const adminPin = request.headers.get('x-admin-pin');
    if (!verifyAdminPin(adminPin)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: PIN Admin tidak valid.' },
        { status: 401 }
      );
    }

    const { type, rowNumber, emailPeserta, namaPeserta, rows, requestId, action } = await request.json();

    // Approve / Reject Permohonan Ganti Akun Peserta
    if (type === 'RESOLVE_RESET_ACCOUNT') {
      const ok = resolveAccountResetRequest(requestId, action === 'APPROVE' ? 'APPROVE' : 'REJECT');
      return NextResponse.json({ success: ok });
    }

    // Approve Kompetensi (Single atau Batch Semua Peserta)
    // Tidak menulis ke sel E-I agar kolom ujian tetap kosong sampai peserta klik "Mulai Ujian"!
    if (type === 'APPROVE_KOMPETENSI') {
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach((item: { rowNumber: number; emailPeserta?: string; namaPeserta?: string }) => {
          setKompetensiApproved(item.rowNumber, item.emailPeserta, item.namaPeserta, true);
        });
      } else if (rowNumber) {
        setKompetensiApproved(rowNumber, emailPeserta, namaPeserta, true);
      }
      return NextResponse.json({ success: true });
    }

    if (type === 'REVOKE_KOMPETENSI' && rowNumber) {
      setKompetensiApproved(rowNumber, emailPeserta, namaPeserta, false);
      return NextResponse.json({ success: true });
    }

    // Approve / Batalkan Wawancara -> Menulis ke Kolom J (Status Wawancara) di Monitoring_Peserta
    if ((type === 'APPROVE_WAWANCARA' || type === 'REVOKE_WAWANCARA') && rowNumber) {
      const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

      // Pastikan header J1 sudah berjudul "Status Wawancara"
      const waktuApprove = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
      });
      const nilaiWawancara =
        type === 'APPROVE_WAWANCARA' ? `SUDAH WAWANCARA (${waktuApprove})` : '';

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!K${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [sanitizeSheetRow([nilaiWawancara])],
        },
      });

      // Segera bersihkan cache agar refresh data langsung menampilkan status wawancara terbaru
      invalidateMonitoringCache();

      return NextResponse.json({
        success: true,
        statusWawancara: nilaiWawancara,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Parameter aksi tidak valid.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[PATCH /api/monitoring Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui status approve peserta.' },
      { status: 500 }
    );
  }
}
