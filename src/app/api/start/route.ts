import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';
import {
  getServerParticipantSession,
  registerServerParticipantSession,
  sanitizeSheetRow,
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

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.MONITORING}!A1:I1`,
      valueInputOption: 'USER_ENTERED',
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
          ],
        ],
      },
    });
  }

  isMonitoringSheetVerified = true;
}

// POST /api/start -> Dipanggil saat peserta menekan "Mulai Ujian Sekarang"
export async function POST(request: Request) {
  try {
    const {
      namaPeserta,
      emailPeserta,
      posisiDilamar,
      alamatPeserta,
      totalSoal,
      durasiDetik = 3600,
    } = await request.json();

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

    // 1. Langsung baca Monitoring_Peserta!A2:I500 (tanpa panggil spreadsheets.get metadata terlebih dahulu).
    // Jika gagal karena tab Monitoring_Peserta belum ada, baru buat tab-nya di blok catch.
    let existingRows: any[] = [];
    try {
      const existingRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A2:I500`,
      });
      existingRows = existingRes.data.values || [];
      isMonitoringSheetVerified = true;
    } catch {
      await createMonitoringSheetIfMissing(sheets, spreadsheetId);
      existingRows = [];
    }
    for (let i = 0; i < existingRows.length; i++) {
      const row = existingRows[i];
      const rowNama = (row[0] || '').toString().trim().toLowerCase();
      const rowEmail = (row[1] || '').toString().trim().toLowerCase();
      const rowStatus = (row[8] || '').toString().trim().toUpperCase();

      if (rowEmail === cleanEmail || rowNama === cleanNama) {
        if (rowStatus.includes('SELESAI')) {
          return NextResponse.json(
            {
              success: false,
              error: `Email (${emailPeserta}) atau Nama (${namaPeserta}) tercatat SUDAH MENYELESAIKAN ujian. Setiap peserta hanya diizinkan mengikuti ujian 1 kali.`,
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: `Email (${emailPeserta}) atau Nama (${namaPeserta}) sudah memulai sesi ujian sebelumnya dan tidak dapat memulai ulang dari awal.`,
          },
          { status: 403 }
        );
      }
    }

    // 2. Cek juga di Monitoring_Peserta saja sudah mencakup semua posisi; selesai.

    // 3. Jika belum pernah ujian, catat baris baru ke Monitoring_Peserta
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

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAMES.MONITORING}!A:I`,
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
          ]),
        ],
      },
    });

    const updatedRange = appendRes.data.updates?.updatedRange || '';
    const matchRow = updatedRange.match(/![A-Z]+(\d+)/);
    const rowNumber = matchRow ? parseInt(matchRow[1], 10) : null;

    // Simpan sesi resmi peserta di memori server (Anti-Tampering Waktu & Pelanggaran)
    const serverSession = registerServerParticipantSession({
      namaPeserta: namaPeserta.trim(),
      emailPeserta: emailPeserta.trim(),
      posisiDilamar,
      endTimeMs: end.getTime(),
      monitoringRowNumber: rowNumber,
    });

    return NextResponse.json({
      success: true,
      rowNumber,
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
        error: 'Terjadi gangguan pada layanan server saat memulai ujian. Silakan coba beberapa saat lagi.',
      },
      { status: 500 }
    );
  }
}

// PUT /api/start -> Dipanggil berkala untuk update Sisa Waktu & Progress Peserta di Monitoring_Peserta
export async function PUT(request: Request) {
  try {
    const {
      rowNumber,
      emailPeserta,
      namaPeserta,
      sisaWaktuStr,
      terjawabCount,
      totalSoal,
      statusUjian,
    } = await request.json();

    if (!rowNumber) {
      return NextResponse.json({ success: false, error: 'No rowNumber' });
    }

    // Gunakan sisa waktu yang dihitung dari server (jika sesi terdaftar di memori server) agar tahan manipulasi DevTools
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
