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

  // Tentukan warna aksen berdasarkan tipe soal
  const topBarColor =
    activeSoal.tipe === 'PG'
      ? 'bg-[#00AEEF]'
      : activeSoal.tipe === 'DESKRIPSI'
        ? 'bg-[#8CC63F]'
        : 'bg-[#F7941D]';

  const badgeTextClass =
    activeSoal.tipe === 'PG' ? 'text-white' : 'text-slate-950';

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-lg overflow-hidden">
      {/* Garis Aksen Atas Sesuai Tipe Soal */}
      <div className={`h-2 w-full ${topBarColor}`} />

      {/* Bar Header Soal */}
      <div className="bg-slate-900 text-white px-5 md:px-7 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs ${badge.bg} ${badgeTextClass}`}
          >
            {badge.label}
          </span>
          <span className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-white bg-white/10 px-3 py-1 rounded-full">
            Soal No. {currentIndex + 1}{' '}
            <span className="text-slate-400 font-semibold">/ {totalSoal}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleNavMap}
            className="bg-[#00AEEF] hover:bg-[#0299D4] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>{showNavMap ? 'Tutup Peta Soal' : 'Buka Peta Soal'}</span>
          </button>
        </div>
      </div>

      {/* Isi Pertanyaan */}
      <div className="p-5 md:p-8 bg-slate-50/60">
        {/* Kotak Pertanyaan Utama (Menonjol & Terpisah Tegas dari Pilihan Jawaban) */}
        <div className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm overflow-hidden flex mb-7">
          <div className={`w-2 shrink-0 ${topBarColor}`} />
          <div className="p-5 md:p-6 flex-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                <svg
                  className="w-3.5 h-3.5 text-[#00AEEF] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
                <span>Pertanyaan Soal No. {currentIndex + 1}</span>
              </span>
              {Boolean(jawabanValue && jawabanValue.trim() !== '') ? (
                <span className="inline-flex items-center gap-1 bg-[#8CC63F]/20 text-[#3F6212] border border-[#8CC63F]/40 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Sudah Dijawab
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Belum Dijawab
                </span>
              )}
            </div>

            <p className="text-slate-900 font-bold text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {activeSoal.pertanyaan}
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* JENIS 1: PILIHAN GANDA (A, B, C, D, E) */}
        {/* ============================================================ */}
        {activeSoal.tipe === 'PG' && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pilih Salah Satu Jawaban (A – E)
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-3">
              {activeSoal.opsi.map((teksOpsi, optIdx) => {
                if (!teksOpsi) return null;
                const huruf = PILIHAN_OPSI_HURUF[optIdx];
                const isSelected = jawabanValue === huruf;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => onSelectAnswer(activeSoal.id, huruf)}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm md:text-base flex items-center gap-3.5 transition-all cursor-pointer overflow-hidden ${isSelected
                      ? 'bg-[#00AEEF] border-[#00AEEF] text-white font-bold shadow-md'
                      : 'bg-white hover:bg-[#F0F9FF] border-slate-200/90 hover:border-[#00AEEF]/50 text-slate-800 font-semibold shadow-2xs'
                      }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 transition-all ${isSelected
                        ? 'bg-[#F7941D] text-slate-950 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                    >
                      {huruf}
                    </span>
                    <span className="flex-1 min-w-0 leading-snug break-words [overflow-wrap:anywhere]">
                      {teksOpsi}
                    </span>
                    {isSelected && (
                      <span className="bg-white text-[#0284C7] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 shadow-2xs">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
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
          <div className="mb-8 bg-white rounded-2xl border-2 border-[#8CC63F]/45 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <span className="w-7 h-7 rounded-lg bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <span>Jawaban Deskripsi / Uraian Anda</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {(jawabanValue || '').trim().length} karakter
              </span>
            </div>
            <textarea
              rows={7}
              value={jawabanValue || ''}
              onChange={(e) => onSelectAnswer(activeSoal.id, e.target.value)}
              placeholder="Ketik jawaban uraian atau penjelasan lengkap Anda di sini..."
              className="w-full p-4 bg-slate-50 focus:bg-white rounded-xl border-2 border-slate-200 focus:border-[#8CC63F] focus:ring-3 focus:ring-[#8CC63F]/15 font-medium text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all leading-relaxed"
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* JENIS 3: SOAL PRAKTIK (MENERIMA LINK DESAIN ATAU SPREADSHEET) */}
        {/* ============================================================ */}
        {activeSoal.tipe === 'PRAKTIK' && (
          <div className="mb-8">
            <div
              className={`bg-white rounded-2xl border-2 ${isPraktikDesain ? 'border-[#F7941D]/55' : 'border-[#00AEEF]/55'
                } p-5 md:p-6 shadow-xs space-y-3.5`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${isPraktikDesain
                    ? 'bg-[#F7941D] text-slate-950'
                    : 'bg-[#00AEEF] text-white'
                    }`}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <div>
                  <label className="block text-xs md:text-sm font-bold uppercase tracking-wider text-slate-900">
                    {isPraktikDesain
                      ? 'Tautan / Link Hasil Desain'
                      : isPraktikSpreadsheet
                        ? 'Tautan / Link Hasil Kerja (Spreadsheet)'
                        : 'Tautan / Link Hasil Praktik Kompetensi'}
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Tempelkan URL hasil pengerjaan praktik Anda pada kolom di bawah
                  </p>
                </div>
              </div>

              <input
                type="url"
                value={activePraktikData.linkUrl || jawabanValue || ''}
                onChange={(e) =>
                  onUpdatePraktik(activeSoal.id, { linkUrl: e.target.value })
                }
                placeholder="Tempelkan tautan / link hasil pekerjaan Anda di sini (https://...)"
                className="w-full px-4 py-3.5 bg-slate-50 focus:bg-white rounded-xl border-2 border-slate-200 focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15 font-medium text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
              />

              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                <svg
                  className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Pastikan akses tautan / link Anda sudah diatur ke{' '}
                  <strong className="font-bold">
                    &quot;Anyone with the link&quot; (Siapa saja yang memiliki link dapat melihat)
                  </strong>{' '}
                  agar dapat diperiksa oleh panitia.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigasi Bawah Soal (Sebelumnya & Selanjutnya) */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-5 py-3 bg-white hover:bg-slate-100 border-2 border-slate-200 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Sebelumnya</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex === totalSoal - 1}
            className="px-6 py-3 bg-[#00AEEF] hover:bg-[#0299D4] rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Selanjutnya</span>
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
