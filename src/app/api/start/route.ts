import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';
import { getCachedMonitoringRows, invalidateMonitoringCache } from '@/lib/sheetsCache';
import {
  checkAccountResetStatus,
  clearAccountResetResolution,
  clearParticipantServerState,
  getServerParticipantSession,
  hasParticipantExamMemory,
  isKompetensiApproved,
  recordParticipantAttendance,
  registerServerParticipantSession,
  requestAccountReset,
  sanitizeSheetRow,
  verifyAdminPin,
} from '@/lib/security';

// Flag di memori server agar pengecekan eksistensi tab Monitoring_Peserta tidak dipanggil berulang-ulang
let isMonitoringSheetVerified = false;

async function createMonitoringSheetIfMissing(sheets: any, spreadsheetId: string) {
  if (isMonitoringSheetVerified) return;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const found = existingSheets.some(
    (s: any) => s.properties?.title === SHEET_NAMES.MONITORING
  );

  if (!found) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SHEET_NAMES.MONITORING,
              },
            },
          },
        ],
      },
    });
  }

  // Pastikan header kolom A1:L1 mencakup No. Telepon di Kolom C, Status Wawancara di Kolom K, dan Status Kelulusan di Kolom L
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.MONITORING}!A1:L1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [
          'Nama Peserta',
          'Email',
          'No. Telepon',
          'Posisi Dilamar',
          'Alamat Domisili',
          'Waktu Mulai',
          'Batas Selesai',
          'Sisa Waktu',
          'Progress Jawaban',
          'Status Ujian',
          'Status Wawancara',
          'Status Kelulusan',
        ],
      ],
    },
  });

  isMonitoringSheetVerified = true;
}

/**
 * Helper: Mengekstrak Status Kelulusan secara dinamis dari Kolom K / L / M / dst
 * (Mendukung penempatan kolom dinamis di mana pun Admin menuliskan Lulus / Tidak Lulus / Lolos / Diterima / Gagal)
 */
function extractStatusKelulusan(row: any[]): string {
  // 1. Cek Kolom L (index 11) dan Kolom M (index 12) terlebih dahulu (kolom khusus Status Kelulusan)
  const colL = (row?.[11] || '').toString().trim();
  if (colL) return colL;

  const colM = (row?.[12] || '').toString().trim();
  if (colM) return colM;

  // 2. Cek Kolom K (index 10):
  //    Jika Kolom K berisi nilai SELAIN status wawancara ("SUDAH WAWANCARA..."),
  //    berarti Admin menuliskan status kelulusan di Kolom K!
  const colK = (row?.[10] || '').toString().trim();
  if (colK) {
    const upperK = colK.toUpperCase();
    const isWawancaraText = upperK.includes('WAWANCARA');
    if (!isWawancaraText) {
      return colK;
    }
  }

  // 3. Fallback: Cek mulai dari Kolom J (index 9) sampai ujung kanan baris jika ada kata kunci kelulusan eksplisit
  if (Array.isArray(row)) {
    for (let c = 9; c < row.length; c++) {
      const cellVal = (row[c] || '').toString().trim();
      if (!cellVal) continue;
      const upper = cellVal.toUpperCase();
      if (upper.includes('WAWANCARA') || upper.includes('MENGERJAKAN') || upper.includes('SELESAI (')) {
        continue;
      }
      if (
        upper.includes('LULUS') ||
        upper.includes('LOLOS') ||
        upper.includes('DITERIMA') ||
        upper.includes('GAGAL') ||
        upper.includes('DITOLAK')
      ) {
        return cellVal;
      }
    }
  }

  return '';
}

/**
 * Helper: Mengekstrak Status Ujian & Status Wawancara yang kompatibel dengan baris lama (10 kolom) maupun baris baru (11+ kolom)
 */
function extractStatusUjianDanWawancara(row: any[]): {
  statusUjian: string;
  statusWawancara: string;
} {
  const colI = (row?.[8] || '').toString().trim();
  const colJ = (row?.[9] || '').toString().trim();
  const colK = (row?.[10] || '').toString().trim();

  // Deteksi apakah baris ini menggunakan format lama (Status Ujian di Kolom I / index 8, Status Wawancara di Kolom J / index 9)
  const upperI = colI.toUpperCase();
  const upperJ = colJ.toUpperCase();
  const isOldRowFormat =
    (upperI.includes('SELESAI') || upperI.includes('SEDANG')) &&
    (upperJ.includes('WAWANCARA') || !colK || !colK.toUpperCase().includes('WAWANCARA'));

  if (isOldRowFormat) {
    return {
      statusUjian: colI,
      statusWawancara: colJ,
    };
  }

  return {
    statusUjian: colJ,
    statusWawancara: colK,
  };
}

/**
 * GET /api/start?rowNumber=X&email=...&nama=...
 * Digunakan oleh peserta di halaman Lobby untuk mengecek apakah Admin sudah meng-approve
 * akses Tes Kompetensi atau meng-approve Tes Wawancara.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rowParam = searchParams.get('rowNumber');
    const emailParam = (searchParams.get('email') || '').trim().toLowerCase();
    const namaParam = (searchParams.get('nama') || '').trim().toLowerCase();
    const modeParam = (searchParams.get('mode') || '').trim().toLowerCase();

    // Mengambil data Monitoring dari In-Memory Server Cache (maksimal 1x hit Google Sheets per 5 detik)
    const rows = await getCachedMonitoringRows();

    let targetRow: any[] | null = null;
    let foundRowNumber: number | null = null;

    if (rowParam) {
      const idx = parseInt(rowParam, 10) - 2;
      if (idx >= 0 && idx < rows.length) {
        targetRow = rows[idx];
        foundRowNumber = idx + 2;
      }
    }

    if (!targetRow && (emailParam || namaParam)) {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rNama = (r?.[0] || '').toString().trim().toLowerCase();
        const rEmail = (r?.[1] || '').toString().trim().toLowerCase();
        if ((emailParam && rEmail === emailParam) || (namaParam && rNama === namaParam)) {
          targetRow = r;
          foundRowNumber = i + 2;
          break;
        }
      }
    }

    if (!targetRow || !foundRowNumber) {
      return NextResponse.json(
        { success: false, error: 'Data kehadiran peserta tidak ditemukan.' },
        { status: 404 }
      );
    }

    const rNama = (targetRow[0] || '').toString().trim();
    const rEmail = (targetRow[1] || '').toString().trim();
    const rTelepon = (targetRow[2] || '').toString().trim();
    const rPosisi = (targetRow[3] || '').toString().trim();
    const rAlamat = (targetRow[4] || '').toString().trim();
    const rWaktuMulai = (targetRow[5] || '').toString().trim();
    const { statusUjian, statusWawancara } = extractStatusUjianDanWawancara(targetRow);
    const statusKelulusan = extractStatusKelulusan(targetRow);

    // Karena Email (Kolom B) & Posisi (Kolom D) terisi dari awal, apabila Nama (Kolom A) kosong,
    // berarti data peserta telah dihapus/di-reset oleh Admin di Google Sheets.
    if (!rNama) {
      clearParticipantServerState(foundRowNumber, rEmail || emailParam, namaParam);
      return NextResponse.json(
        {
          success: false,
          error: 'Data kehadiran peserta telah dihapus atau di-reset dari database.',
        },
        { status: 404 }
      );
    }

    // Jika Kolom Waktu Mulai (F) & Status Ujian (J) di Sheet kosong, namun di RAM server masih ada riwayat sesi ujian,
    // berarti Admin baru saja menghapus kolom ujian peserta tersebut di Google Sheets.
    if (!rWaktuMulai && !statusUjian) {
      if (hasParticipantExamMemory(foundRowNumber, rEmail, rNama)) {
        clearParticipantServerState(foundRowNumber, rEmail, rNama);
      }
      if (modeParam === 'ujian') {
        clearParticipantServerState(foundRowNumber, rEmail, rNama);
        return NextResponse.json(
          {
            success: false,
            error: 'Sesi ujian peserta telah di-reset oleh Admin dari database.',
          },
          { status: 404 }
        );
      }
    }

    const upperUjian = statusUjian.toUpperCase();
    const upperWawancara = statusWawancara.toUpperCase();

    const kompetensiSelesai = upperUjian.includes('SELESAI');
    const sedangUjian = upperUjian.includes('SEDANG');
    const wawancaraApproved =
      upperWawancara.includes('SUDAH') || upperWawancara.includes('SELESAI') || upperWawancara.includes('APPROVED');
    const kompetensiApproved = isKompetensiApproved(
      foundRowNumber,
      rEmail,
      rNama,
      statusUjian
    );

    const resetRequestStatus = checkAccountResetStatus(rEmail, rNama);

    return NextResponse.json({
      success: true,
      rowNumber: foundRowNumber,
      namaPeserta: rNama,
      emailPeserta: rEmail,
      teleponPeserta: rTelepon,
      posisiDilamar: rPosisi,
      alamatPeserta: rAlamat,
      statusUjian,
      statusWawancara,
      statusKelulusan,
      kompetensiApproved,
      kompetensiSelesai,
      sedangUjian,
      wawancaraApproved,
      resetRequestStatus,
    });
  } catch (error: any) {
    console.error('[GET /api/start Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat status seleksi peserta.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/start
 * Mendukung 2 mode (`action`):
 * 1. `action: 'REGISTER'` -> Saat peserta baru datang dan mengisi Daftar Hadir.
 *    Kolom E s/d J (Waktu Mulai, Batas Selesai, Sisa Waktu, Progress, Status Ujian, Status Wawancara) DIKOSONGKAN terlebih dahulu.
 *    Jika peserta sudah pernah mengisi daftar hadir sebelumnya, kembalikan status terbarunya dari Monitoring_Peserta.
 * 2. `action: 'START_EXAM'` -> Saat peserta menekan tombol "Mulai Ujian Sekarang" (setelah di-approve Admin).
 *    Barulah Kolom E s/d I diisi (`Waktu Mulai`, `Batas Selesai`, `60:00`, `0 / Y Soal`, `SEDANG MENGERJAKAN`) dan timer 60 menit berjalan.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action = 'REGISTER',
      rowNumber: inputRowNumber,
      namaPeserta,
      emailPeserta,
      teleponPeserta,
      posisiDilamar,
      alamatPeserta,
      totalSoal,
      durasiDetik = 7200,
    } = body;

    const cleanEmail = (emailPeserta || '').toString().trim().toLowerCase();
    const cleanNama = (namaPeserta || '').toString().trim().toLowerCase();

    // Mode QUICK_LOGIN: Digunakan saat peserta pindah dari HP ke Laptop Ruang Ujian (Hanya butuh Email)
    if (action === 'QUICK_LOGIN') {
      if (!cleanEmail) {
        return NextResponse.json(
          {
            success: false,
            error: 'Silakan masukkan email yang Anda gunakan saat mengisi daftar hadir di HP.',
          },
          { status: 400 }
        );
      }
    } else {
      if (!cleanEmail || !cleanNama) {
        return NextResponse.json(
          {
            success: false,
            error: 'Nama dan Email wajib diisi.',
          },
          { status: 400 }
        );
      }
    }

    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

    // Ambil data terbaru dari Monitoring_Peserta (forceFresh = true saat login/register/mulai ujian
    // agar perubahan atau penghapusan baris di Google Sheets langsung terbaca seketika)
    let existingRows: any[] = [];
    try {
      if (!isMonitoringSheetVerified) {
        await createMonitoringSheetIfMissing(sheets, spreadsheetId);
      }
      existingRows = await getCachedMonitoringRows(true);
    } catch {
      await createMonitoringSheetIfMissing(sheets, spreadsheetId);
      existingRows = [];
    }

    // Cari apakah peserta sudah pernah terdaftar di Monitoring_Peserta
    let foundIndex = -1;
    for (let i = 0; i < existingRows.length; i++) {
      const row = existingRows[i];
      const rowNama = (row?.[0] || '').toString().trim().toLowerCase();
      const rowEmail = (row?.[1] || '').toString().trim().toLowerCase();

      if (rowEmail === cleanEmail || (cleanNama && rowNama === cleanNama)) {
        foundIndex = i;
        break;
      }
    }

    // =========================================================================
    // MODE 0: QUICK_LOGIN / CEK SATU PINTU EMAIL
    // =========================================================================
    if (action === 'QUICK_LOGIN') {
      if (foundIndex === -1) {
        return NextResponse.json(
          {
            success: false,
            error: `Email "${emailPeserta}" tidak terdaftar dalam daftar panggilan peserta seleksi Maganghub Batch III Angkata 2 BPS Kab. Soppeng. Pastikan Anda memasukkan email yang terdaftar di MagangHub.`,
          },
          { status: 404 }
        );
      }

      const existingRow = existingRows[foundIndex];
      const existingRowNumber = foundIndex + 2;
      const rNama = (existingRow[0] || '').toString().trim();
      const rEmail = (existingRow[1] || emailPeserta).toString().trim();
      const rTelepon = (existingRow[2] || '').toString().trim();
      const rPosisi = (existingRow[3] || '').toString().trim();
      const rAlamat = (existingRow[4] || '').toString().trim();
      const rWaktuMulai = (existingRow[5] || '').toString().trim();
      const { statusUjian, statusWawancara } = extractStatusUjianDanWawancara(existingRow);
      const statusKelulusan = extractStatusKelulusan(existingRow);

      // Cek apakah peserta sudah melengkapi seluruh biodata wajib (Nama, No. Telepon, Posisi, Alamat)
      const isProfileComplete = Boolean(rNama && rTelepon && rPosisi && rAlamat);

      // Jika biodata di Sheet kosong/belum lengkap (mis. baru dihapus Admin) ATAU kolom ujian (F & J) kosong
      // sementara di RAM server masih ada riwayat sesi ujian lama, bersihkan seluruh state RAM peserta ini!
      if (
        !isProfileComplete ||
        (!rWaktuMulai && !statusUjian && hasParticipantExamMemory(existingRowNumber, rEmail, rNama))
      ) {
        clearParticipantServerState(existingRowNumber, rEmail, rNama);
      }

      const upperUjian = statusUjian.toUpperCase();
      const upperWawancara = statusWawancara.toUpperCase();

      const kompetensiSelesai = upperUjian.includes('SELESAI');
      const sedangUjian = upperUjian.includes('SEDANG');
      const wawancaraApproved =
        upperWawancara.includes('SUDAH') ||
        upperWawancara.includes('SELESAI') ||
        upperWawancara.includes('APPROVED');
      const kompetensiApproved = isProfileComplete
        ? isKompetensiApproved(existingRowNumber, rEmail, rNama, statusUjian)
        : false;

      return NextResponse.json({
        success: true,
        isExisting: true,
        isProfileComplete,
        rowNumber: existingRowNumber,
        namaPeserta: rNama,
        emailPeserta: rEmail,
        teleponPeserta: rTelepon,
        posisiDilamar: rPosisi,
        alamatPeserta: rAlamat,
        statusUjian,
        statusWawancara,
        statusKelulusan,
        kompetensiApproved,
        kompetensiSelesai,
        sedangUjian,
        wawancaraApproved,
      });
    }

    // =========================================================================
    // MODE 1: REGISTER (MELENGKAPI BIODATA DAFTAR HADIR BAGI EMAIL TERDAFTAR)
    // =========================================================================
    if (action === 'REGISTER') {
      // Hanya email yang sudah ada di database (Kolom B Monitoring_Peserta) yang boleh melengkapi daftar hadir
      if (foundIndex === -1) {
        return NextResponse.json(
          {
            success: false,
            error: `Email "${emailPeserta}" tidak terdaftar dalam database peserta seleksi BPS Kab. Soppeng.`,
          },
          { status: 403 }
        );
      }

      const existingRow = existingRows[foundIndex];
      const existingRowNumber = foundIndex + 2;

      const prevNama = (existingRow[0] || '').toString().trim();
      const prevTelepon = (existingRow[2] || '').toString().trim();
      const prevAlamat = (existingRow[4] || '').toString().trim();
      const prevWaktuMulai = (existingRow[5] || '').toString().trim();
      const wasProfileIncomplete = !(prevNama && prevTelepon && prevAlamat);

      const dbPosisi = (existingRow[3] || '').toString().trim();
      const finalPosisi = dbPosisi || (posisiDilamar || '').toString().trim();

      if (!finalPosisi) {
        return NextResponse.json(
          { success: false, error: 'Posisi yang dilamar belum ditetapkan pada database.' },
          { status: 400 }
        );
      }

      const finalNama = namaPeserta.trim();
      const finalEmail = (existingRow[1] || emailPeserta).toString().trim();
      const finalTelepon = (teleponPeserta || '').toString().trim();
      const finalAlamat = alamatPeserta.trim();

      // Update Kolom A s/d E pada baris email peserta yang sudah ada di Monitoring_Peserta
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A${existingRowNumber}:E${existingRowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            sanitizeSheetRow([
              finalNama,
              finalEmail,
              finalTelepon,
              finalPosisi,
              finalAlamat,
            ]),
          ],
        },
      });

      const { statusUjian, statusWawancara } = extractStatusUjianDanWawancara(existingRow);
      const statusKelulusan = extractStatusKelulusan(existingRow);

      // Apabila peserta baru mengisi biodata (karena sebelumnya kosong / baru dihapus Admin)
      // atau kolom ujian di Sheet kosong padahal di RAM masih ada memori ujian lama,
      // pastikan state Approve & Sesi lama di RAM server di-reset agar mulai dari status "Menunggu Approve Admin".
      if (
        wasProfileIncomplete ||
        (!prevWaktuMulai &&
          !statusUjian &&
          hasParticipantExamMemory(existingRowNumber, finalEmail, finalNama))
      ) {
        clearParticipantServerState(existingRowNumber, finalEmail, finalNama);
        if (prevNama && prevNama !== finalNama) {
          clearParticipantServerState(existingRowNumber, finalEmail, prevNama);
        }
      }

      // Catat urutan waktu kedatangan peserta di memori server untuk antrean di halaman /monitoring
      recordParticipantAttendance(existingRowNumber, finalEmail);

      const upperUjian = statusUjian.toUpperCase();
      const upperWawancara = statusWawancara.toUpperCase();

      const kompetensiSelesai = upperUjian.includes('SELESAI');
      const sedangUjian = upperUjian.includes('SEDANG');
      const wawancaraApproved =
        upperWawancara.includes('SUDAH') ||
        upperWawancara.includes('SELESAI') ||
        upperWawancara.includes('APPROVED');
      const kompetensiApproved = isKompetensiApproved(
        existingRowNumber,
        finalEmail,
        finalNama,
        statusUjian
      );

      // Bersihkan cache agar data peserta yang sudah lengkap langsung muncul di Monitoring Admin
      invalidateMonitoringCache();

      return NextResponse.json({
        success: true,
        isExisting: true,
        isProfileComplete: true,
        rowNumber: existingRowNumber,
        namaPeserta: finalNama,
        emailPeserta: finalEmail,
        teleponPeserta: finalTelepon,
        posisiDilamar: finalPosisi,
        alamatPeserta: finalAlamat,
        statusUjian,
        statusWawancara,
        statusKelulusan,
        kompetensiApproved,
        kompetensiSelesai,
        sedangUjian,
        wawancaraApproved,
      });
    }

    // =========================================================================
    // MODE 2: START_EXAM (SAAT PESERTA MENEKAN TOMBOL "MULAI UJIAN SEKARANG")
    // =========================================================================
    const targetRowNumber = inputRowNumber || (foundIndex !== -1 ? foundIndex + 2 : null);
    const existingRow = foundIndex !== -1 ? existingRows[foundIndex] : null;
    const { statusUjian: currentStatusUjian } = extractStatusUjianDanWawancara(existingRow || []);
    const upperUjian = currentStatusUjian.toUpperCase();

    if (upperUjian.includes('SELESAI')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Anda tercatat SUDAH MENYELESAIKAN Tes Seleksi Kompetensi dan tidak dapat mengikuti ujian kompetensi kembali.',
        },
        { status: 403 }
      );
    }

    if (upperUjian.includes('SEDANG')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Anda sudah memulai sesi Tes Seleksi Kompetensi sebelumnya dan tidak dapat memulai ulang waktu dari awal.',
        },
        { status: 403 }
      );
    }

    // Pastikan Admin sudah memberikan Approve Akses Kompetensi
    const allowedToStart = isKompetensiApproved(
      targetRowNumber,
      cleanEmail,
      cleanNama,
      currentStatusUjian
    );

    if (!allowedToStart) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Akses Tes Seleksi Kompetensi Anda belum di-approve oleh Admin ruangan. Mohon tunggu persetujuan Admin.',
        },
        { status: 403 }
      );
    }

    // Sekarang waktu ujian 60 menit resmi dimulai!
    const now = new Date();
    const end = new Date(now.getTime() + durasiDetik * 1000);

    const waktuMulaiStr = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });
    const batasSelesaiStr = end.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });

    const menitAwal = Math.floor(durasiDetik / 60);
    const detikAwal = durasiDetik % 60;
    const sisaWaktuStr = `${menitAwal
      .toString()
      .padStart(2, '0')}:${detikAwal.toString().padStart(2, '0')}`;

    let finalRowNumber = targetRowNumber;

    if (finalRowNumber) {
      // Update Kolom F s/d J pada baris kehadiran peserta tersebut
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!F${finalRowNumber}:J${finalRowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            sanitizeSheetRow([
              waktuMulaiStr,
              batasSelesaiStr,
              sisaWaktuStr,
              `0 / ${totalSoal || 0} Soal`,
              'SEDANG MENGERJAKAN',
            ]),
          ],
        },
      });
    } else {
      // Fallback jika baris belum ada
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A:K`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [
            sanitizeSheetRow([
              namaPeserta.trim(),
              emailPeserta.trim(),
              (teleponPeserta || '').toString().trim(),
              posisiDilamar,
              alamatPeserta.trim(),
              waktuMulaiStr,
              batasSelesaiStr,
              sisaWaktuStr,
              `0 / ${totalSoal || 0} Soal`,
              'SEDANG MENGERJAKAN',
              '',
            ]),
          ],
        },
      });
      const updatedRange = appendRes.data.updates?.updatedRange || '';
      const matchRow = updatedRange.match(/![A-Z]+(\d+)/);
      finalRowNumber = matchRow ? parseInt(matchRow[1], 10) : null;
    }

    // Bersihkan cache agar status ujian peserta langsung terupdate di dashboard monitoring
    invalidateMonitoringCache();

    const serverSession = registerServerParticipantSession({
      namaPeserta: namaPeserta.trim(),
      emailPeserta: emailPeserta.trim(),
      posisiDilamar,
      endTimeMs: end.getTime(),
      monitoringRowNumber: finalRowNumber,
    });

    return NextResponse.json({
      success: true,
      rowNumber: finalRowNumber,
      endTimeMs: end.getTime(),
      sessionToken: serverSession.sessionToken,
      waktuMulai: waktuMulaiStr,
      batasSelesai: batasSelesaiStr,
    });
  } catch (error: any) {
    console.error('[POST /api/start Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          'Terjadi gangguan pada layanan server. Silakan coba beberapa saat lagi.',
      },
      { status: 500 }
    );
  }
}

// PUT /api/start -> Dipanggil berkala untuk update Sisa Waktu & Progress Peserta di Monitoring_Peserta,
// atau verifikasi PIN Admin / Pengajuan Reset Akun Peserta
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      adminPin,
      rowNumber,
      emailPeserta,
      namaPeserta,
      posisiDilamar,
      alasan,
      sisaWaktuStr,
      terjawabCount,
      totalSoal,
      statusUjian,
    } = body;

    // Aksi 1: Pengajuan Ganti Akun oleh Peserta (Dikirim ke antrean Admin)
    if (action === 'REQUEST_RESET_ACCOUNT') {
      if (!emailPeserta && !namaPeserta) {
        return NextResponse.json(
          { success: false, error: 'Identitas peserta tidak valid.' },
          { status: 400 }
        );
      }
      const reqData = requestAccountReset({
        rowNumber: Number(rowNumber) || 0,
        namaPeserta: String(namaPeserta),
        emailPeserta: String(emailPeserta),
        posisiDilamar: String(posisiDilamar || '-'),
        alasan: alasan ? String(alasan) : undefined,
      });
      return NextResponse.json({
        success: true,
        message: 'Permohonan ganti akun telah terkirim ke Admin.',
        request: reqData,
      });
    }

    // Aksi 2: Pembersihan Status Approval Reset Akun (setelah peserta berhasil logout)
    if (action === 'CLEAR_RESET_STATUS') {
      clearAccountResetResolution(emailPeserta, namaPeserta);
      return NextResponse.json({ success: true });
    }

    // Aksi 3: Verifikasi PIN Admin langsung (cadangan)
    if (action === 'VERIFY_ADMIN_PIN') {
      const isValid = verifyAdminPin(adminPin);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'PIN Admin salah atau tidak valid.' },
          { status: 401 }
        );
      }
      return NextResponse.json({ success: true, message: 'PIN Admin valid.' });
    }

    if (!rowNumber) {
      return NextResponse.json({ success: false, error: 'No rowNumber' });
    }

    let verifiedSisaWaktu = sisaWaktuStr;
    const serverSession = getServerParticipantSession(emailPeserta, namaPeserta);
    if (serverSession && serverSession.endTimeMs) {
      const serverRemSec = Math.max(
        0,
        Math.floor((serverSession.endTimeMs - Date.now()) / 1000)
      );
      const m = Math.floor(serverRemSec / 60);
      const s = serverRemSec % 60;
      verifiedSisaWaktu = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
    }

    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

    // Cek keberadaan baris peserta via Cache RAM (tanpa menambah beban read request ke Google Sheets API)
    const cachedRows = await getCachedMonitoringRows();
    const rowIndex = Number(rowNumber) - 2;
    if (cachedRows.length > 0 && (rowIndex < 0 || rowIndex >= cachedRows.length)) {
      clearParticipantServerState(Number(rowNumber), emailPeserta, namaPeserta);
      return NextResponse.json(
        {
          success: false,
          error: 'Data peserta telah dihapus dari database Monitoring_Peserta.',
        },
        { status: 404 }
      );
    }

    if (rowIndex >= 0 && rowIndex < cachedRows.length) {
      const checkRow = cachedRows[rowIndex] || [];
      const existingNama = (checkRow[0] || '').toString().trim();
      const existingEmail = (checkRow[1] || '').toString().trim();
      const existingWaktuMulai = (checkRow[5] || '').toString().trim();
      const { statusUjian: existingStatusUjian } = extractStatusUjianDanWawancara(checkRow);

      // Karena Email (Kolom B) & Posisi (Kolom D) sudah terisi dari awal,
      // peserta yang sedang di /ujian dianggap telah dihapus/di-reset datanya apabila:
      // 1. Kolom A (Nama Peserta) kosong, ATAU
      // 2. Kolom F (Waktu Mulai) DAN Kolom J (Status Ujian) dikosongkan oleh Admin
      if (!existingNama || (!existingWaktuMulai && !existingStatusUjian)) {
        clearParticipantServerState(
          Number(rowNumber),
          existingEmail || emailPeserta,
          existingNama || namaPeserta
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Data peserta telah dihapus atau di-reset dari database Monitoring_Peserta.',
          },
          { status: 404 }
        );
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.MONITORING}!H${rowNumber}:J${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          sanitizeSheetRow([
            verifiedSisaWaktu,
            `${Number(terjawabCount) || 0} / ${Number(totalSoal) || 0} Soal`,
            statusUjian || 'SEDANG MENGERJAKAN',
          ]),
        ],
      },
    });

    return NextResponse.json({
      success: true,
      serverEndTimeMs: serverSession?.endTimeMs || null,
    });
  } catch (error: any) {
    console.error('[PUT /api/start Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui progres monitoring.' },
      { status: 500 }
    );
  }
}
