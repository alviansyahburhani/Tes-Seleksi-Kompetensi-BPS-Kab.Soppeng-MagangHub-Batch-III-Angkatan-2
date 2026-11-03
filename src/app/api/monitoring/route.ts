import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { SHEET_NAMES } from '@/constants/exam';
import { getActiveViolationAlerts } from '@/lib/violationAlertStore';
import { verifyAdminPin } from '@/lib/security';

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

    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

    // Ambil data dari sheet Monitoring_Peserta (1x Read Request saja per refresh)
    let monitoringRows: any[] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.MONITORING}!A2:I500`,
      });
      monitoringRows = res.data.values || [];
    } catch {
      // Jika sheet Monitoring_Peserta belum ada, kembalikan array kosong
      monitoringRows = [];
    }

    const pesertaList = monitoringRows
      .map((row: any, idx: number) => {
        const namaPeserta = (row?.[0] || '').toString().trim();
        const emailPeserta = (row?.[1] || '').toString().trim();
        const posisiDilamar = (row?.[2] || '').toString().trim();
        const alamatPeserta = (row?.[3] || '').toString().trim();
        const waktuMulai = (row?.[4] || '').toString().trim();
        const batasSelesai = (row?.[5] || '').toString().trim();
        const sisaWaktu = (row?.[6] || '00:00').toString().trim();
        const progressStr = (row?.[7] || '0 / 0 Soal').toString().trim();
        const statusUjian = (row?.[8] || 'SEDANG MENGERJAKAN').toString().trim();

        if (!namaPeserta && !emailPeserta) return null;

        // Parse "5 / 20 Soal" menjadi angka terjawab & totalSoal
        const matchProgress = progressStr.match(/(\d+)\s*\/\s*(\d+)/);
        const terjawab = matchProgress ? parseInt(matchProgress[1], 10) : 0;
        const totalSoal = matchProgress ? parseInt(matchProgress[2], 10) : 0;

        // Parse "MM:SS" menjadi total detik
        const matchTime = sisaWaktu.match(/(\d+):(\d+)/);
        const sisaDetik = matchTime
          ? parseInt(matchTime[1], 10) * 60 + parseInt(matchTime[2], 10)
          : 0;

        return {
          id: idx + 1,
          namaPeserta,
          posisiDilamar,
          waktuMulai,
          batasSelesai,
          sisaWaktu,
          sisaDetik,
          progressStr,
          terjawab,
          totalSoal,
          statusUjian,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: pesertaList,
      activeAlerts: getActiveViolationAlerts(),
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

