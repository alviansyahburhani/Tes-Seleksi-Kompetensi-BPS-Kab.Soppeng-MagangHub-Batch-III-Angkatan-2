import { NextResponse } from 'next/server';
import { getGoogleSheetsInstance } from '@/lib/googleSheets';
import { isSoalMatchPosisi, parseSoalRow, ParsedSoalRow } from '@/utils/examHelper';
import { getTargetResultSheetName, SHEET_NAMES } from '@/constants/exam';
import {
  getServerParticipantSession,
  hasParticipantAlreadySubmitted,
  markParticipantSubmitted,
  sanitizeSheetRow,
} from '@/lib/security';
import { dismissViolationAlert } from '@/lib/violationAlertStore';

// Cache di memori server untuk mencegah pemanggilan API berulang kali saat banyak peserta submit bersamaan
const initializedResultSheets = new Map<string, number>(); // key: targetSheetName, value: jumlah kolom soal
let cachedParsedSoal: ParsedSoalRow[] | null = null;
let cachedSoalTimestamp = 0;
const SOAL_CACHE_TTL_MS = 60 * 1000; // Cache bank soal selama 60 detik

async function getCachedBankSoal(
  sheets: any,
  spreadsheetId: string
): Promise<ParsedSoalRow[]> {
  const now = Date.now();
  if (cachedParsedSoal && now - cachedSoalTimestamp < SOAL_CACHE_TTL_MS) {
    return cachedParsedSoal;
  }

  const soalResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.SOAL}!A2:I200`,
  });

  const rows = soalResponse.data.values || [];
  const parsed = rows
    .map((row: any, index: number) => parseSoalRow(row, index))
    .filter((s: ParsedSoalRow | null): s is ParsedSoalRow => s !== null);

  cachedParsedSoal = parsed;
  cachedSoalTimestamp = now;
  return parsed;
}

async function ensureResultSheetAndHeader(
  sheets: any,
  spreadsheetId: string,
  targetSheetName: string,
  posisiSoalList: ParsedSoalRow[]
) {
  // Jika tab hasil posisi ini sudah pernah dicek & diinisialisasi dengan jumlah soal yang sama, skip panggilan API!
  if (initializedResultSheets.get(targetSheetName) === posisiSoalList.length) {
    return;
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const found = existingSheets.some(
    (s: any) => s.properties?.title === targetSheetName
  );

  if (!found) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: targetSheetName,
              },
            },
          },
        ],
      },
    });
  }

  // Judul kolom per soal khusus untuk posisi ini (Soal UMUM + Soal Posisi terkait)
  const soalHeaders = posisiSoalList.map(
    (s, idx) => `Soal ${idx + 1} (${s.kategori})`
  );

  const headerRow = [
    'Waktu Selesai',
    'Nama Peserta',
    'Email',
    'Posisi Dilamar',
    'Alamat Domisili',
    'Total Pelanggaran',
    'Sisa Waktu',
    ...soalHeaders,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${targetSheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headerRow],
    },
  });

  initializedResultSheets.set(targetSheetName, posisiSoalList.length);
}

export async function POST(request: Request) {
  try {
    const {
      namaPeserta,
      emailPeserta,
      posisiDilamar,
      alamatPeserta,
      jawabanPeserta,
      jawabanPraktik,
      soalDikerjakanIds,
      totalPelanggaran,
      monitoringRowNumber,
      sisaWaktuStr,
    } = await request.json();

    // 1. CEK IDEMPOTENCY (ANTI-DOUBLE SUBMIT):
    // Jika peserta dengan email/nama ini sudah pernah mengumpulkan jawaban, tolak penulisan ganda
    if (hasParticipantAlreadySubmitted(emailPeserta, namaPeserta)) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        targetSheet: getTargetResultSheetName(posisiDilamar),
      });
    }

    // Tandai segera bahwa peserta sedang/sudah submit agar klik ganda simultan tertahan
    markParticipantSubmitted(emailPeserta, namaPeserta);

    // Matikan juga alarm aktif untuk peserta ini jika masih berbunyi di /monitoring
    if (namaPeserta) {
      dismissViolationAlert(undefined, namaPeserta);
    }

    // 2. ANTI-TAMPERING VALIDATION (WAKTU & PELANGGARAN DARI SERVER):
    // Ambil jumlah pelanggaran dan sisa waktu dari catatan server jika tersedia,
    // sehingga peserta tidak bisa mereset angka pelanggaran ke 0 lewat Inspect Element.
    const serverSession = getServerParticipantSession(emailPeserta, namaPeserta);
    const clientViolations = Number(totalPelanggaran) || 0;
    const verifiedViolations = serverSession
      ? Math.max(clientViolations, serverSession.violationsCount)
      : clientViolations;

    let verifiedSisaWaktuStr = sisaWaktuStr || '00:00';
    if (serverSession && serverSession.endTimeMs) {
      const serverRemSec = Math.max(
        0,
        Math.floor((serverSession.endTimeMs - Date.now()) / 1000)
      );
      const m = Math.floor(serverRemSec / 60);
      const s = serverRemSec % 60;
      verifiedSisaWaktuStr = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
    }

    const { sheets, spreadsheetId } = await getGoogleSheetsInstance();

    // Tentukan tab tujuan berdasarkan posisi saat login:
    // Jawaban_Administrasi | Jawaban_Kehumasan | Jawaban_Keuangan
    const targetSheetName = getTargetResultSheetName(posisiDilamar);

    // Ambil seluruh soal dari Sheet Soal (menggunakan cache 60 detik agar hemat kuota Read saat submit massal)
    const allParsedSoal = await getCachedBankSoal(sheets, spreadsheetId);

    const matchedPosisiSoal = allParsedSoal.filter((s) =>
      isSoalMatchPosisi(s.kategori, posisiDilamar)
    );
    const posisiSoalList =
      matchedPosisiSoal.length > 0 ? matchedPosisiSoal : allParsedSoal;

    // Pastikan tab posisi tersebut ada dan baris ke-1 berisi header kolom soal (hanya dieksekusi 1x per posisi)
    await ensureResultSheetAndHeader(
      sheets,
      spreadsheetId,
      targetSheetName,
      posisiSoalList
    );

    // Susun jawaban murni peserta untuk setiap kolom soal di tab posisi ini
    const jawabanPerKolomSoal: string[] = posisiSoalList.map((soal) => {
      const idSoal = soal.id;

      if (soal.tipe === 'PG' || soal.tipe === 'DESKRIPSI') {
        return (jawabanPeserta?.[idSoal] || '').toString().trim();
      }

      if (soal.tipe === 'PRAKTIK') {
        const dataPraktik = jawabanPraktik?.[idSoal];
        const linkVal = (
          dataPraktik?.linkUrl ||
          jawabanPeserta?.[idSoal] ||
          ''
        )
          .toString()
          .trim();
        return linkVal;
      }

      return '';
    });

    const waktuSelesai = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });

    // Simpan ke tab sesuai posisi login peserta menggunakan mode RAW + Sanitizer (Anti-Formula Injection)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${targetSheetName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          sanitizeSheetRow([
            waktuSelesai,
            namaPeserta,
            emailPeserta || '-',
            posisiDilamar || '-',
            alamatPeserta || '-',
            verifiedViolations,
            verifiedSisaWaktuStr,
            ...jawabanPerKolomSoal,
          ]),
        ],
      },
    });

    // Update status peserta di sheet Monitoring_Peserta menjadi SELESAI
    const targetRow = monitoringRowNumber || serverSession?.monitoringRowNumber;
    if (targetRow) {
      const terjawabTotal = Object.values(jawabanPeserta || {}).filter(
        (v: any) => v && String(v).trim() !== ''
      ).length;
      const totalDikerjakan = Array.isArray(soalDikerjakanIds)
        ? soalDikerjakanIds.length
        : posisiSoalList.length;

      await sheets.spreadsheets.values
        .update({
          spreadsheetId,
          range: `${SHEET_NAMES.MONITORING}!G${targetRow}:I${targetRow}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [
              sanitizeSheetRow([
                verifiedSisaWaktuStr,
                `${terjawabTotal} / ${totalDikerjakan} Soal`,
                `SELESAI (${waktuSelesai})`,
              ]),
            ],
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      targetSheet: targetSheetName,
    });
  } catch (error: any) {
    console.error('[POST /api/submit Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi gangguan saat menyimpan jawaban ke server. Mohon coba klik Kumpulkan sekali lagi.',
      },
      { status: 500 }
    );
  }
}
