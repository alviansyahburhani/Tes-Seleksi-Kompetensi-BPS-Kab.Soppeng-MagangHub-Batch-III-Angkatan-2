'use client';

import { Soal } from '@/types/exam';

interface QuestionNavigationMapProps {
  soalList: Soal[];
  jawaban: Record<number, string>;
  currentIndex: number;
  totalTerjawab: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectQuestion: (idx: number) => void;
}

export default function QuestionNavigationMap({
  soalList,
  jawaban,
  currentIndex,
  totalTerjawab,
  isCollapsed,
  onToggleCollapse,
  onSelectQuestion,
}: QuestionNavigationMapProps) {
  return (
    <aside
      className={`w-full ${
        isCollapsed
          ? 'lg:w-16 bg-[#00AEEF] text-white shadow-xl'
          : 'lg:w-80 bg-white text-slate-800 border-y-2 border-l-2 border-slate-200/90 shadow-lg'
      } lg:my-8 rounded-2xl lg:rounded-r-none lg:rounded-l-[36px] shrink-0 lg:sticky lg:top-24 transition-all duration-300 ease-in-out relative z-20`}
    >
      {/* Ornamen Lengkungan Halus Atas & Bawah di Sisi Kanan (Menyesuaikan Warna Terbuka Putih / Tertutup Biru) */}
      <div
        aria-hidden="true"
        className={`hidden lg:block absolute -top-7 right-0 w-7 h-7 bg-transparent rounded-br-3xl pointer-events-none transition-all duration-300 ${
          isCollapsed
            ? 'shadow-[10px_10px_0_0_#00AEEF]'
            : 'shadow-[10px_10px_0_0_#ffffff] border-r-2 border-b-2 border-slate-200/90'
        }`}
      />
      <div
        aria-hidden="true"
        className={`hidden lg:block absolute -bottom-7 right-0 w-7 h-7 bg-transparent rounded-tr-3xl pointer-events-none transition-all duration-300 ${
          isCollapsed
            ? 'shadow-[10px_-10px_0_0_#00AEEF]'
            : 'shadow-[10px_-10px_0_0_#ffffff] border-r-2 border-t-2 border-slate-200/90'
        }`}
      />

      {/* Header Sidebar + Tombol Hide / Expand */}
      <div
        className={`flex items-center ${
          isCollapsed
            ? 'py-3.5 px-3 lg:pt-5 lg:pb-2 lg:px-2 justify-between lg:justify-center'
            : 'pt-5 pb-3.5 px-4 justify-between border-b border-slate-200/80'
        }`}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#00AEEF]/12 text-[#0284C7] flex items-center justify-center shrink-0">
              <svg
                className="w-4.5 h-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 truncate">
                Peta Navigasi Soal
              </h2>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                <strong className="text-[#3F6212]">{totalTerjawab}</strong> dari {soalList.length}{' '}
                Soal Terisi
              </p>
            </div>
          </div>
        ) : (
          <div className="flex lg:hidden items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-white">
              Peta Soal ({totalTerjawab}/{soalList.length} Terisi)
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Buka Peta Navigasi Soal' : 'Kecilkan ke Samping Kanan'}
          className={`flex items-center justify-center cursor-pointer transition-all shrink-0 ${
            isCollapsed
              ? 'w-11 h-11 rounded-2xl bg-white text-[#00AEEF] shadow-md hover:scale-105'
              : 'w-9 h-9 rounded-xl bg-slate-100 hover:bg-[#00AEEF] text-slate-600 hover:text-white shadow-2xs'
          }`}
        >
          {isCollapsed ? (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Konten Saat Sidebar Tertutup (Mode Dock Ringkas seperti Monitoring) */}
      {isCollapsed ? (
        <div className="hidden lg:flex flex-col items-center justify-center py-4 px-2 gap-3.5">
          {/* Indikator Nomor Soal Aktif */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={`Soal Aktif: No. ${currentIndex + 1} (Klik untuk membuka daftar soal)`}
            className="w-11 h-11 rounded-2xl bg-white text-[#0284C7] shadow-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all relative"
          >
            <span className="text-[8px] font-extrabold uppercase tracking-tighter text-slate-400 leading-none">
              NO
            </span>
            <span className="text-sm font-extrabold leading-tight">{currentIndex + 1}</span>
          </button>

          {/* Indikator Progress Terjawab */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={`Terjawab: ${totalTerjawab} dari ${soalList.length} Soal`}
            className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex flex-col items-center justify-center cursor-pointer transition-all relative"
          >
            <span className="text-xs font-extrabold leading-none">{totalTerjawab}</span>
            <span className="w-5 h-px bg-white/40 my-0.5" />
            <span className="text-[9px] font-bold text-white/85 leading-none">
              {soalList.length}
            </span>
            {totalTerjawab === soalList.length && soalList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8CC63F] text-slate-950 rounded-full flex items-center justify-center text-[9px] font-extrabold border border-white">
                ✓
              </span>
            )}
          </button>

          {/* Daftar Cepat Nomor Soal Vertikal (Scrollable) */}
          <div className="w-full pt-2 border-t border-white/20 flex flex-col items-center gap-2 max-h-64 overflow-y-auto no-scrollbar py-1">
            {soalList.map((s, idx) => {
              const isAnswered = Boolean(jawaban[s.id] && jawaban[s.id].trim() !== '');
              const isCurrent = currentIndex === idx;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  title={`Ke Soal No. ${idx + 1} (${isAnswered ? 'Sudah Dijawab' : 'Belum Dijawab'})`}
                  className={`w-9 h-9 rounded-xl text-xs font-extrabold flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white text-[#0284C7] ring-2 ring-[#F7941D] shadow-md scale-105'
                      : isAnswered
                        ? 'bg-[#8CC63F] text-slate-950 hover:bg-[#7BB335] shadow-2xs'
                        : 'bg-white/15 text-white hover:bg-white/30'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Konten Saat Sidebar Terbuka Penuh */
        <div className="p-4 space-y-4">
          {/* Progress Bar Soal Terjawab (Animasi Memanjang Mulus) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500 uppercase tracking-wider">Progres Pengerjaan</span>
              <span className="text-slate-900 font-extrabold">
                {soalList.length > 0 ? Math.round((totalTerjawab / soalList.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8CC63F] rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${
                    soalList.length > 0
                      ? Math.min(100, Math.round((totalTerjawab / soalList.length) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Grid Nomor Soal */}
          <div className="grid grid-cols-5 gap-2.5 max-h-80 overflow-y-auto p-1.5">
            {soalList.map((s, idx) => {
              const isAnswered = Boolean(jawaban[s.id] && jawaban[s.id].trim() !== '');
              const isCurrent = currentIndex === idx;

              let btnStyle =
                'bg-slate-50/90 text-slate-700 border-2 border-slate-200/90 hover:border-[#00AEEF]/60 hover:bg-[#F0F9FF] hover:scale-105 active:scale-95';
              if (isAnswered) {
                btnStyle =
                  'bg-[#8CC63F] text-slate-950 border-2 border-[#8CC63F] hover:bg-[#7BB335] hover:scale-105 active:scale-95';
              }

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  className={`h-10 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs ${btnStyle} ${
                    isCurrent
                      ? 'ring-2 ring-[#00AEEF] ring-offset-2 border-[#00AEEF] text-[#0284C7] shadow-sm scale-105'
                      : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legenda Warna BPS */}
          <div className="pt-3.5 border-t border-slate-200/80 flex flex-wrap justify-around gap-2 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#8CC63F] inline-block shrink-0 shadow-2xs" />
              <span>Terjawab</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-white border-2 border-slate-300 inline-block shrink-0" />
              <span>Kosong</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-white border-2 border-[#00AEEF] ring-2 ring-[#00AEEF]/30 inline-block shrink-0" />
              <span>Aktif</span>
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

