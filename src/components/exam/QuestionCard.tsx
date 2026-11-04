'use client';

import { PILIHAN_OPSI_HURUF } from '@/constants/exam';
import { DataPraktik, Soal } from '@/types/exam';
import { getTipeBadge } from '@/utils/examHelper';

interface QuestionCardProps {
  activeSoal: Soal;
  currentIndex: number;
  totalSoal: number;
  totalTerjawab: number;
  showNavMap: boolean;
  onToggleNavMap: () => void;
  jawabanValue: string;
  activePraktikData: DataPraktik;
  onSelectAnswer: (idSoal: number, nilai: string) => void;
  onUpdatePraktik: (idSoal: number, patch: Partial<DataPraktik>) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuestionCard({
  activeSoal,
  currentIndex,
  totalSoal,
  totalTerjawab,
  showNavMap,
  onToggleNavMap,
  jawabanValue,
  activePraktikData,
  onSelectAnswer,
  onUpdatePraktik,
  onPrev,
  onNext,
}: QuestionCardProps) {
  const badge = getTipeBadge(activeSoal.tipe);
  const isPraktikDesain = activeSoal.subPraktik === 'DESAIN';
  const isPraktikSpreadsheet = activeSoal.subPraktik === 'SPREADSHEET';

  return (
    <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
      {/* Bar Header Soal */}
      <div className="bg-slate-950 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b-4 border-slate-950">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase px-2.5 py-1 border-2 border-white bg-slate-800 text-white">
            {activeSoal.kategori}
          </span>
          <span
            className={`text-xs font-black uppercase px-2.5 py-1 border-2 border-slate-950 text-slate-950 ${badge.bg}`}
          >
            {badge.label}
          </span>
          <span className="text-sm font-black uppercase tracking-wider">
            NO. {currentIndex + 1} / {totalSoal}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">
            Terjawab: {totalTerjawab}/{totalSoal}
          </span>
          <button
            type="button"
            onClick={onToggleNavMap}
            className="bg-[#00AEEF] hover:bg-[#24beff] text-slate-950 text-xs font-black uppercase px-3 py-1 border-2 border-white cursor-pointer transition"
          >
            {showNavMap ? '✕ Tutup Peta Soal' : '☰ Buka Peta Soal'}
          </button>
        </div>
      </div>

      {/* Isi Pertanyaan */}
      <div className="p-5 md:p-7">
        {/* Kotak Pertanyaan Utama (Dibuat lebih menonjol & terpisah tegas dari Pilihan Jawaban) */}
        <div className="relative bg-[#FFFDF7] border-4 border-slate-950 border-l-[10px] border-l-[#00AEEF] p-5 md:p-6 mb-7 shadow-[6px_6px_0px_0px_#0f172a]">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5">
              📌 Pertanyaan Soal No. {currentIndex + 1}
            </span>
          </div>
          <p className="text-slate-950 font-extrabold text-lg md:text-xl leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {activeSoal.pertanyaan}
          </p>
        </div>

        {/* ============================================================ */}
        {/* JENIS 1: PILIHAN GANDA (A, B, C, D, E) */}
        {/* ============================================================ */}
        {activeSoal.tipe === 'PG' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Pilih Salah Satu Jawaban (A – E):
              </span>
              <div className="flex-1 h-0.5 bg-slate-300" />
            </div>

            <div className="space-y-3 pl-0 md:pl-2">
              {activeSoal.opsi.map((teksOpsi, optIdx) => {
                if (!teksOpsi) return null;
                const huruf = PILIHAN_OPSI_HURUF[optIdx];
                const isSelected = jawabanValue === huruf;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => onSelectAnswer(activeSoal.id, huruf)}
                    className={`w-full text-left px-3.5 py-3 border-3 border-slate-950 text-sm md:text-base flex items-center gap-3.5 transition-all cursor-pointer overflow-hidden ${isSelected
                      ? 'bg-[#00AEEF] text-slate-950 font-black translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white hover:bg-[#E6F7FF] text-slate-900 font-bold shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#0f172a]'
                      }`}
                  >
                    <span
                      className={`w-8 h-8 flex items-center justify-center text-sm font-black border-2 border-slate-950 shrink-0 ${isSelected
                        ? 'bg-[#F7941D] text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]'
                        : 'bg-[#FFFDF7] text-slate-950'
                        }`}
                    >
                      {huruf}
                    </span>
                    <span className="flex-1 min-w-0 leading-snug break-words [overflow-wrap:anywhere]">
                      {teksOpsi}
                    </span>
                    {isSelected && (
                      <span className="bg-slate-950 text-white text-[10px] font-black uppercase px-2 py-0.5 shrink-0">
                        Dipilih
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* JENIS 2: SOAL DESKRIPSI / URAIAN */}
        {/* ============================================================ */}
        {activeSoal.tipe === 'DESKRIPSI' && (
          <div className="mb-8 space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-950">
              Jawaban Deskripsi / Uraian Anda:
            </label>
            <textarea
              rows={7}
              value={jawabanValue || ''}
              onChange={(e) => onSelectAnswer(activeSoal.id, e.target.value)}
              placeholder="Ketik jawaban uraian atau penjelasan lengkap Anda di sini..."
              className="w-full p-4 bg-[#FFFDF7] border-3 border-slate-950 font-bold text-sm md:text-base text-slate-950 placeholder:text-slate-400 focus:outline-none focus:bg-[#F2FAE9] shadow-[5px_5px_0px_0px_#0f172a]"
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* JENIS 3: SOAL PRAKTIK (MENERIMA LINK DESAIN ATAU SPREADSHEET) */}
        {/* ============================================================ */}
        {activeSoal.tipe === 'PRAKTIK' && (
          <div className="mb-8 space-y-5">
            <div
              className={`${isPraktikDesain ? 'bg-[#FFF5E6]' : 'bg-[#E6F7FF]'
                } border-3 border-slate-950 p-4 md:p-5 shadow-[4px_4px_0px_0px_#0f172a] space-y-2.5`}
            >
              <label className="block text-xs md:text-sm font-black uppercase tracking-wider text-slate-950">
                {isPraktikDesain
                  ? '🎨 Tautan / Link Hasil Desain:'
                  : isPraktikSpreadsheet
                    ? '📊 Tautan / Link Hasil Kerja (Spreadsheet):'
                    : '🔗 Tautan / Link Hasil Praktik Kompetensi:'}
              </label>
              <input
                type="url"
                value={activePraktikData.linkUrl || jawabanValue || ''}
                onChange={(e) =>
                  onUpdatePraktik(activeSoal.id, { linkUrl: e.target.value })
                }
                placeholder="Tempelkan tautan / link hasil pekerjaan Anda di sini (https://...)"
                className="w-full px-3.5 py-3 bg-white border-3 border-slate-950 font-bold text-sm md:text-base text-slate-950 placeholder:text-slate-400 focus:outline-none shadow-[3px_3px_0px_0px_#0f172a]"
              />
              <p className="text-[11px] font-bold text-slate-700">
                Pastikan akses tautan / link Anda sudah diatur ke{' '}
                <strong>&quot;Anyone with the link&quot; (Siapa saja yang memiliki link dapat melihat)</strong>{' '}
                agar dapat diperiksa oleh panitia.
              </p>
            </div>
          </div>
        )}

        {/* Navigasi Bawah Soal (Sebelumnya & Selanjutnya) */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t-3 border-slate-950">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 border-3 border-slate-950 text-xs md:text-sm font-black uppercase text-slate-950 shadow-[4px_4px_0px_0px_#0f172a] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            ← Sebelumnya
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex === totalSoal - 1}
            className="px-5 py-2.5 bg-[#00AEEF] hover:bg-[#24beff] border-3 border-slate-950 text-xs md:text-sm font-black uppercase text-slate-950 shadow-[4px_4px_0px_0px_#0f172a] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}

