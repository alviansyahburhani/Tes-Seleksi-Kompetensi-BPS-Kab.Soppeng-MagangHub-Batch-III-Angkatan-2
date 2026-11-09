'use client';

import { useState, useEffect } from 'react';
import { PILIHAN_OPSI_HURUF } from '@/constants/exam';
import { DataPraktik, Soal } from '@/types/exam';
import { getTipeBadge } from '@/utils/examHelper';
import MathText from '@/components/exam/MathText';

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

  // State untuk modal zoom gambar soal (lightbox)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // State popup notifikasi larangan paste di deskripsi
  const [showPasteWarning, setShowPasteWarning] = useState(false);

  const handlePreventPaste = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    setShowPasteWarning(true);
  };

  useEffect(() => {
    if (!showPasteWarning) return;
    const timer = setTimeout(() => {
      setShowPasteWarning(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [showPasteWarning]);

  // Reset state gambar & modal zoom setiap kali nomor/ID soal berganti
  useEffect(() => {
    setBrokenImages({});
    setZoomedImage(null);
    setShowPasteWarning(false);
  }, [activeSoal.id]);

  // Tipe blok konten soal (teks atau gambar)
  type QuestionBlock =
    | { type: 'text'; content: string }
    | { type: 'image'; url: string };

  // Helper untuk memecah teks pertanyaan & gambar menjadi blok-blok berurutan
  // Gambar akan tampil presisi tepat di posisi/bagian di mana gambar tersebut ditulis di teks soal
  const parseQuestionBlocks = (rawText: string): QuestionBlock[] => {
    let cleanText = (rawText || '').trim();

    // Bersihkan tag text<br>, <br>, <p> yang tidak sengaja terbawa saat copy-paste dari markdown/AI
    cleanText = cleanText.replace(/^text\b\s*(?:<br\s*\/?>)?/gi, '');
    cleanText = cleanText.replace(/\btext<br\s*\/?>/gi, '');
    cleanText = cleanText.replace(/<br\s*\/?>/gi, '\n');
    cleanText = cleanText.replace(/<\/?p>/gi, '\n');
    cleanText = cleanText.replace(/&nbsp;/gi, ' ');

    // Regex mencakup:
    // 1. Markdown: ![alt](url)
    // 2. Tag: [GAMBAR: url] atau [IMG: url]
    // 3. Path langsung berekstensi gambar: /tabel-nota-a.png, https://.../foto.jpg
    const imageTokenRegex = /!\[.*?\]\((https?:\/\/[^\s<>]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<>]*)?|\/[a-zA-Z0-9_\-\.\/]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<>]*)?)\)|\[(?:GAMBAR|IMG|IMAGE):\s*(https?:\/\/[^\s<>]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<>]*)?|\/[a-zA-Z0-9_\-\.\/]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<>]*)?)\s*\]|(https?:\/\/[^\s<>]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<>]*)?|\/[a-zA-Z0-9_\-\.\/]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s<>]*)?)/gi;

    const blocks: QuestionBlock[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imageTokenRegex.exec(cleanText)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Ambil potongan teks sebelum gambar jika ada
      if (matchStart > lastIndex) {
        const textChunk = cleanText.slice(lastIndex, matchStart).trim();
        if (textChunk) {
          blocks.push({ type: 'text', content: textChunk });
        }
      }

      // Ambil URL gambar dari token yang cocok
      const url = (match[1] || match[2] || match[3] || match[0]).trim();
      if (url) {
        blocks.push({ type: 'image', url });
      }

      lastIndex = matchEnd;
    }

    // Ambil sisa teks setelah gambar terakhir jika ada
    if (lastIndex < cleanText.length) {
      const remainingText = cleanText.slice(lastIndex).trim();
      if (remainingText) {
        blocks.push({ type: 'text', content: remainingText });
      }
    }

    // Fallback jika tidak ada gambar sama sekali
    if (blocks.length === 0 && cleanText) {
      blocks.push({ type: 'text', content: cleanText });
    }

    return blocks;
  };

  // Helper untuk merender teks pertanyaan dengan link umum yang dapat diklik
  const renderFormattedText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const parts = text.split(urlRegex);
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      if (part.match(/^https?:\/\//i)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00AEEF] underline hover:text-[#0299D4] break-all inline-flex items-center gap-1 font-semibold"
          >
            <span>{part}</span>
            <svg
              className="w-3.5 h-3.5 inline shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        );
      }
      return part;
    });
  };

  const questionBlocks = parseQuestionBlocks(activeSoal.pertanyaan);

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

      {/* Isi Pertanyaan (Animasi Slide & Fade setiap berganti nomor soal) */}
      <div key={activeSoal.id} className="p-5 md:p-8 bg-slate-50/60 animate-question-enter">
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
                <span className="inline-flex items-center gap-1 bg-[#8CC63F]/20 text-[#3F6212] border border-[#8CC63F]/40 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full animate-pop-in">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
                  </svg>
                  Sudah Dijawab
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Belum Dijawab
                </span>
              )}
            </div>

            {/* Isi Teks & Gambar Soal (Mengalir presisi sesuai letak susunan yang ditulis di sel soal) */}
            <div className="space-y-4">
              {questionBlocks.map((block, idx) => {
                if (block.type === 'text') {
                  if (activeSoal.tipe === 'DESKRIPSI') {
                    return (
                      <MathText
                        key={idx}
                        text={block.content}
                        className="text-slate-900 font-bold text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                      />
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="text-slate-900 font-bold text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                    >
                      {renderFormattedText(block.content)}
                    </div>
                  );
                }

                if (block.type === 'image') {
                  if (brokenImages[block.url]) return null;
                  return (
                    <div key={idx} className="my-2 flex justify-start">
                      <img
                        src={block.url}
                        alt=""
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [block.url]: true }))
                        }
                        onClick={() => setZoomedImage(block.url)}
                        className="max-w-full h-auto max-h-[520px] object-contain rounded-xl cursor-zoom-in transition-transform duration-150 hover:opacity-95"
                      />
                    </div>
                  );
                }

                return null;
              })}
            </div>
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
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm md:text-base flex items-center gap-3.5 transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.985] ${isSelected
                      ? 'bg-[#00AEEF] border-[#00AEEF] text-white font-bold shadow-md scale-[1.008]'
                      : 'bg-white hover:bg-[#F0F9FF] hover:translate-x-1 border-slate-200/90 hover:border-[#00AEEF]/50 text-slate-800 font-semibold shadow-2xs'
                      }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 transition-all duration-200 ${isSelected
                        ? 'bg-[#F7941D] text-slate-950 shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                    >
                      {huruf}
                    </span>
                    <span className="flex-1 min-w-0 leading-snug break-words [overflow-wrap:anywhere]">
                      {teksOpsi}
                    </span>
                    {isSelected && (
                      <span className="bg-white text-[#0284C7] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 shadow-2xs animate-pop-in">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
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
              onPaste={handlePreventPaste}
              onDrop={handlePreventPaste}
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

      {/* Popup kecil di kanan bawah saat mencoba paste di soal deskripsi */}
      {showPasteWarning && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md animate-fade-in transition-all">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="pr-1">
            <p className="text-xs font-bold text-slate-100 leading-tight">
              Aksi Paste Dinonaktifkan
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Jawaban deskripsi wajib diketik secara langsung.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasteWarning(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Lightbox Modal Zoom Gambar Soal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 cursor-zoom-out animate-modal-pop"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex justify-between items-center text-white mb-2 px-1">
              <span className="text-xs font-semibold text-slate-300">
                Klik di mana saja atau tombol X untuk menutup
              </span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition-all cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <img
              src={zoomedImage}
              alt="Preview Zoom Lampiran Soal"
              className="max-w-full max-h-[82vh] object-contain rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
