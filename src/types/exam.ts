export type TipeSoal = 'PG' | 'DESKRIPSI' | 'PRAKTIK';

export type SubPraktik = 'SPREADSHEET' | 'DESAIN' | 'UMUM';

export interface Soal {
  id: number;
  kategori: string;
  pertanyaan: string;
  opsi: string[];
  tipe: TipeSoal;
  subPraktik?: SubPraktik;
}

export interface DataPraktik {
  linkUrl?: string;
  catatan?: string;
}

export interface IdentitasPeserta {
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  alamatPeserta: string;
}

export interface SavedExamSession extends IdentitasPeserta {
  isLoggedIn: boolean;
  isFinished: boolean;
  soalList: Soal[];
  jawaban: Record<number, string>;
  jawabanPraktik: Record<number, DataPraktik>;
  violations: number;
  currentIndex: number;
  monitoringRowNumber: number | null;
  endTimeMs: number;
}


