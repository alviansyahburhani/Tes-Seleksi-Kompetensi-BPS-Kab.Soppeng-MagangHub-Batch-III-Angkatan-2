import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { parseSoalRow } from '@/utils/examHelper';
import { SHEET_NAMES } from '@/constants/exam';
import { Soal } from '@/types/exam';

// Cache Bank Soal di memori server (TTL 60 detik) untuk mencegah lonjakan kuota Read API
// ketika puluhan peserta membuka halaman web di waktu yang bersamaan.
let cachedClientSoalList: Soal[] | null = null;
let cachedTimestamp = 0;
const SOAL_CACHE_TTL_MS = 60 * 1000; // 60 detik

export async function GET() {
  try {
    const now = Date.now();
    if (cachedClientSoalList && now - cachedTimestamp < SOAL_CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cachedClientSoalList,
        cached: true,
      });
    }

    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.SOAL}!A2:I200`,
    });

    const rows = response.data.values || [];
    const soalList = rows
      .map((row: any, index: number) => {
        const parsed = parseSoalRow(row, index);
        if (!parsed) return null;

        // Jangan kirim kunci jawaban ke sisi klien
        const { kunci: _kunci, ...clientSoal } = parsed;
        return clientSoal;
      })
      .filter((s: Soal | null): s is Soal => s !== null);

    cachedClientSoalList = soalList;
    cachedTimestamp = now;

    return NextResponse.json({
      success: true,
      data: soalList,
      cached: false,
    });
  } catch (error: any) {
    console.error('[GET /api/soal Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memuat bank soal ujian dari server. Silakan muat ulang halaman.',
      },
      { status: 500 }
    );
  }
}
