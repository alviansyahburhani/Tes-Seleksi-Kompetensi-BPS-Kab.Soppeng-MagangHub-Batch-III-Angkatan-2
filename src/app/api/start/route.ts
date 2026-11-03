import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';
import { getCachedMonitoringRows, invalidateMonitoringCache } from '@/lib/sheetsCache';
import {
  checkAccountResetStatus,
  clearAccountResetResolution,
  getServerParticipantSession,
  isKompetensiApproved,
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

  // Pastikan header kolom A1:J1 mencakup Status Wawancara di Kolom J
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.MONITORING}!A1:J1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [
          'Nama Peserta',
          'Email',
          'Posisi Dilamar',
          'Alamat Domisili',
          'Waktu Mulai',
          'Batas Selesai',
          'Sisa Waktu',
          'Progress Jawaban',
          'Status Ujian',
          'Status Wawancara',
        ],
      ],
    },
  });

  isMonitoringSheetVerified = true;
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
    const rPosisi = (targetRow[2] || '').toString().trim();
    const rAlamat = (targetRow[3] || '').toString().trim();
    const statusUjian = (targetRow[8] || '').toString().trim();
    const statusWawancara = (targetRow[9] || '').toString().trim();

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
      posisiDilamar: rPosisi,
      alamatPeserta: rAlamat,
      statusUjian,
      statusWawancara,
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
      posisiDilamar,
      alamatPeserta,
      totalSoal,
      durasiDetik = 3600,
    } = body;

    const cleanEmail = (emailPeserta || '').toString().trim().toLowerCase();
    const cleanNama = (namaPeserta || '').toString().trim().toLowerCase();

    if (!cleanEmail || !cleanNama) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nama dan Email wajib diisi.',
        },
        { status: 400 }
      );
    }

    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

    // Baca Monitoring_Peserta!A2:J500
    let existingRows: any[] = [];
    try {
      const existingRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A2:J500`,
      });
      existingRows = existingRes.data.values || [];
      isMonitoringSheetVerified = true;
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

      if (rowEmail === cleanEmail || rowNama === cleanNama) {
        foundIndex = i;
        break;
      }
    }

    // =========================================================================
    // MODE 1: REGISTER (DAFTAR HADIR PESERTA)
    // =========================================================================
    if (action === 'REGISTER') {
      // Jika sudah pernah mengisi daftar hadir sebelumnya, pulihkan statusnya dari Monitoring_Peserta
      if (foundIndex !== -1) {
        const existingRow = existingRows[foundIndex];
        const existingRowNumber = foundIndex + 2;
        const rNama = (existingRow[0] || namaPeserta).toString().trim();
        const rEmail = (existingRow[1] || emailPeserta).toString().trim();
        const rPosisi = (existingRow[2] || posisiDilamar).toString().trim();
        const rAlamat = (existingRow[3] || alamatPeserta).toString().trim();
        const statusUjian = (existingRow[8] || '').toString().trim();
        const statusWawancara = (existingRow[9] || '').toString().trim();

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
          rEmail,
          rNama,
          statusUjian
        );

        return NextResponse.json({
          success: true,
          isExisting: true,
          rowNumber: existingRowNumber,
          namaPeserta: rNama,
          emailPeserta: rEmail,
          posisiDilamar: rPosisi,
          alamatPeserta: rAlamat,
          statusUjian,
          statusWawancara,
          kompetensiApproved,
          kompetensiSelesai,
          sedangUjian,
          wawancaraApproved,
        });
      }

      // Jika belum pernah daftar hadir:
      // Simpan Nama, Email, Posisi, Alamat di Kolom A-D, dan KOSONGKAN Kolom E-J terlebih dahulu!
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A:J`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [
            sanitizeSheetRow([
              namaPeserta.trim(),
              emailPeserta.trim(),
              posisiDilamar,
              alamatPeserta.trim(),
              '', // Kolom E: Waktu Mulai (Kosong sampai klik Mulai Ujian)
              '', // Kolom F: Batas Selesai (Kosong sampai klik Mulai Ujian)
              '', // Kolom G: Sisa Waktu (Kosong sampai klik Mulai Ujian)
              '', // Kolom H: Progress Jawaban (Kosong sampai klik Mulai Ujian)
              '', // Kolom I: Status Ujian (Kosong sampai klik Mulai Ujian)
              '', // Kolom J: Status Wawancara (Kosong sampai di-approve Admin)
            ]),
          ],
        },
      });

      const updatedRange = appendRes.data.updates?.updatedRange || '';
      const matchRow = updatedRange.match(/![A-Z]+(\d+)/);
      const rowNumber = matchRow ? parseInt(matchRow[1], 10) : existingRows.length + 2;

      // Bersihkan cache agar pendaftaran langsung terbaca di Monitoring Admin
      invalidateMonitoringCache();

      return NextResponse.json({
        success: true,
        isExisting: false,
        rowNumber,
        namaPeserta: namaPeserta.trim(),
        emailPeserta: emailPeserta.trim(),
        posisiDilamar,
        alamatPeserta: alamatPeserta.trim(),
        statusUjian: '',
        statusWawancara: '',
        kompetensiApproved: false,
        kompetensiSelesai: false,
        sedangUjian: false,
        wawancaraApproved: false,
      });
    }

    // =========================================================================
    // MODE 2: START_EXAM (SAAT PESERTA MENEKAN TOMBOL "MULAI UJIAN SEKARANG")
    // =========================================================================
    const targetRowNumber = inputRowNumber || (foundIndex !== -1 ? foundIndex + 2 : null);
    const existingRow = foundIndex !== -1 ? existingRows[foundIndex] : null;
    const currentStatusUjian = (existingRow?.[8] || '').toString().trim();
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
      // Update Kolom E s/d I pada baris kehadiran peserta tersebut
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!E${finalRowNumber}:I${finalRowNumber}`,
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
        range: `${SHEET_NAMES.MONITORING}!A:J`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [
            sanitizeSheetRow([
              namaPeserta.trim(),
              emailPeserta.trim(),
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
    if (rowIndex >= 0 && rowIndex < cachedRows.length) {
      const checkRow = cachedRows[rowIndex] || [];
      const existingNama = (checkRow[0] || '').toString().trim();
      const existingEmail = (checkRow[1] || '').toString().trim();

      if (!existingNama && !existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: 'Data peserta telah dihapus dari database Monitoring_Peserta.',
          },
          { status: 404 }
        );
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.MONITORING}!G${rowNumber}:I${rowNumber}`,
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
