import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';
import { addViolationAlert, dismissViolationAlert } from '@/lib/violationAlertStore';
import {
  incrementServerViolation,
  sanitizeSheetRow,
  verifyAdminPin,
} from '@/lib/security';

export async function POST(request: Request) {
  try {
    const {
      namaPeserta,
      murniNama,
      emailPeserta,
      posisiDilamar,
      jenisPelanggaran,
      tahap,
    } = await request.json();

    const waktu = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });

    // Tahap 'detail' = log diperkaya (durasi keluar, nomor soal, aktivitas Paste) yang dikirim saat peserta kembali.
    // Hanya dicatat ke sheet, karena hitungan & alarm sudah diproses pada tahap 'mulai'.
    const isDetail = tahap === 'detail';
    // Tanpa 'tahap' (klien lama) -> perilaku lama: hitung, alarm, dan catat ke sheet sekaligus
    const isMulai = tahap === 'mulai';

    if (!isDetail) {
    // 1. Tambah hitungan pelanggaran di memori server (Anti-Tampering agar peserta tidak bisa reset ke 0 via Inspect Element)
    incrementServerViolation(emailPeserta, murniNama || namaPeserta);

    // 2. Simpan ke antrean alarm real-time di memori server agar halaman /monitoring langsung tahu siapa yang berbunyi (0 kuota API!)
    addViolationAlert({
      namaPeserta: (murniNama || namaPeserta || '').toString().trim(),
      emailPeserta: (emailPeserta || '').toString().trim(),
      posisiDilamar: (posisiDilamar || '').toString().trim(),
      jenisPelanggaran: (jenisPelanggaran || 'Pindah Tab').toString().trim(),
      waktu,
    });
    }

    if (isMulai) {
      return NextResponse.json({ success: true });
    }

    // 3. Catat ke sheet Log_Pelanggaran di Google Spreadsheet dengan mode RAW + Sanitizer (Anti-Formula Injection)
    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAMES.LOG_PELANGGARAN}!A:C`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [sanitizeSheetRow([waktu, namaPeserta, jenisPelanggaran])],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/log Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mencatat log pelanggaran.' },
      { status: 500 }
    );
  }
}

// DELETE /api/log -> Dipanggil saat Admin mematikan alarm di halaman /monitoring (Wajib PIN Admin)
export async function DELETE(request: Request) {
  try {
    const adminPin = request.headers.get('x-admin-pin');
    if (!verifyAdminPin(adminPin)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: PIN Admin tidak valid.' },
        { status: 401 }
      );
    }

    const { alertId, namaPeserta } = await request.json();
    dismissViolationAlert(alertId, namaPeserta);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/log Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mematikan alarm.' },
      { status: 500 }
    );
  }
}

