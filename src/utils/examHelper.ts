import { Soal, SubPraktik, TipeSoal } from '@/types/exam';

export interface ParsedSoalRow extends Soal {
  kunci: string;
}

/**
 * Mengurai satu baris dari Sheet `Soal` menjadi objek soal terstruktur.
 * Digunakan bersama oleh `/api/soal` dan `/api/submit` agar logika deteksi 100% konsisten.
 */
export function parseSoalRow(row: any[], index: number): ParsedSoalRow | null {
  const rawKategori = (row?.[0] || 'UMUM').toString().trim();
  const pertanyaan = (row?.[1] || '').toString().trim();
  const opsi = [
    (row?.[2] || '').toString().trim(),
    (row?.[3] || '').toString().trim(),
    (row?.[4] || '').toString().trim(),
    (row?.[5] || '').toString().trim(),
    (row?.[6] || '').toString().trim(),
  ];
  const colH = (row?.[7] || '').toString().trim();
  const colI = (row?.[8] || '').toString().trim();

  if (!pertanyaan) return null;

  const hasOpsi = opsi.some((o) => o !== '');
  const upperMeta = `${rawKategori} ${colH} ${colI}`.toUpperCase();

  let tipe: TipeSoal = 'PG';
  if (
    upperMeta.includes('DESKRIPSI') ||
    upperMeta.includes('ESAI') ||
    upperMeta.includes('ESSAY') ||
    upperMeta.includes('URAIAN')
  ) {
    tipe = 'DESKRIPSI';
  } else if (
    upperMeta.includes('PRAKTIK') ||
    upperMeta.includes('SPREADSHEET') ||
    upperMeta.includes('DESAIN')
  ) {
    tipe = 'PRAKTIK';
  } else if (!hasOpsi) {
    const upperQ = pertanyaan.toUpperCase();
    if (
      upperQ.includes('LINK') ||
      upperQ.includes('TAUTAN') ||
      upperQ.includes('SPREADSHEET') ||
      upperQ.includes('GOOGLE SHEET') ||
      upperQ.includes('CANVA') ||
      upperQ.includes('POSTER') ||
      upperQ.includes('INFOGRAFIS')
    ) {
      tipe = 'PRAKTIK';
    } else {
      tipe = 'DESKRIPSI';
    }
  }

  let subPraktik: SubPraktik = 'UMUM';
  if (tipe === 'PRAKTIK') {
    const combined = `${upperMeta} ${pertanyaan.toUpperCase()}`;
    const isDesain =
      combined.includes('DESAIN') ||
      combined.includes('CANVA') ||
      combined.includes('POSTER') ||
      combined.includes('INFOGRAFIS') ||
      combined.includes('FLYER') ||
      combined.includes('GAMBAR') ||
      combined.includes('PUBLISITAS') ||
      combined.includes('HUMAS') ||
      combined.includes('KEHUMASAN') ||
      combined.includes('INSTAGRAM') ||
      combined.includes('MEDIA SOSIAL') ||
      combined.includes('MEDSOS');
    const isSheet =
      combined.includes('SPREADSHEET') ||
      combined.includes('GOOGLE SHEET') ||
      combined.includes('EXCEL') ||
      combined.includes('KEUANGAN') ||
      combined.includes('ADMINISTRASI') ||
      combined.includes('TABEL');

    if (isDesain && !isSheet) subPraktik = 'DESAIN';
    else if (isSheet && !isDesain) subPraktik = 'SPREADSHEET';
    else if (upperMeta.includes('DESAIN')) subPraktik = 'DESAIN';
    else if (upperMeta.includes('SPREADSHEET')) subPraktik = 'SPREADSHEET';
    else subPraktik = 'UMUM';
  }

  return {
    id: index + 1,
    kategori: rawKategori,
    pertanyaan,
    opsi,
    tipe,
    subPraktik,
    kunci: colH.toUpperCase(),
  };
}

/**
 * Mengecek apakah kategori soal sesuai dengan posisi yang dilamar peserta atau termasuk soal UMUM.
 */
export function isSoalMatchPosisi(kategoriSoal: string, posisiDilamar: string): boolean {
  const kat = kategoriSoal.toUpperCase().trim();
  const pos = posisiDilamar.toUpperCase().trim();

  if (
    kat === 'UMUM' ||
    kat === 'SEMUA' ||
    kat === 'ALL' ||
    kat === 'TWK' ||
    kat === 'TIU' ||
    kat === 'TKP' ||
    kat.startsWith('UMUM')
  ) {
    return true;
  }

  if (kat.includes(pos) || pos.includes(kat)) {
    return true;
  }

  if (pos.includes('ADMINISTRASI') && (kat.includes('ADMIN') || kat.includes('STAFF'))) {
    return true;
  }
  if (
    pos.includes('PUBLISITAS') &&
    (kat.includes('PUBLISITAS') ||
      kat.includes('HUMAS') ||
      kat.includes('KEHUMASAN') ||
      kat.includes('DESAIN') ||
      kat.includes('MEDIA SOSIAL') ||
      kat.includes('MEDSOS') ||
      kat.includes('INSTAGRAM'))
  ) {
    return true;
  }
  if (
    pos.includes('KEUANGAN') &&
    (kat.includes('KEUANGAN') || kat.includes('FINANCE') || kat.includes('AKUNTANSI'))
  ) {
    return true;
  }

  return false;
}

/**
 * Algoritma pengacakan Fisher-Yates.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Mengubah detik ke format waktu MM:SS.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Label dan warna latar badge berdasarkan tipe soal.
 */
export function getTipeBadge(tipe: TipeSoal): { label: string; bg: string } {
  if (tipe === 'PG') return { label: 'Pilihan Ganda', bg: 'bg-[#00AEEF]' };
  if (tipe === 'DESKRIPSI') return { label: 'Soal Deskripsi', bg: 'bg-[#8CC63F]' };
  return { label: 'Soal Praktik', bg: 'bg-[#F7941D]' };
}

