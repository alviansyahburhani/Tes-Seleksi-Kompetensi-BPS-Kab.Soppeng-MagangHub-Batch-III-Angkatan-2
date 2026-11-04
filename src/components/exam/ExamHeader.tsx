'use client';

import { formatTime } from '@/utils/examHelper';

interface ExamHeaderProps {
  namaPeserta: string;
  posisiDilamar: string;
  timeLeft: number;
  loading: boolean;
  onSubmit: () => void;
}

export default function ExamHeader({
  namaPeserta,
  posisiDilamar,
  timeLeft,
  loading,
  onSubmit,
}: ExamHeaderProps) {
  const isCriticalTime = timeLeft < 300;

  return (
    <>
      {/* TOP COLOR BAR BPS */}
      <div className="grid grid-cols-3 h-1.5 w-full sticky top-0 z-40">
        <div className="bg-[#00AEEF]" />
        <div className="bg-[#8CC63F]" />
        <div className="bg-[#F7941D]" />
      </div>

      {/* HEADER UJIAN & TIMER */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs sticky top-1.5 z-30 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Identitas Kiri */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/BPSIndonesia.svg"
                alt="Logo BPS"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm md:text-base tracking-tight leading-snug truncate">
                BPS Kab. Soppeng <span className="text-slate-400 font-normal">•</span>{' '}
                <span className="text-[#0284C7]">Seleksi MagangHub Batch III</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-2.5 py-0.5 rounded-lg truncate max-w-[200px] sm:max-w-xs">
                  <svg
                    className="w-3 h-3 text-[#00AEEF] shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="truncate">{namaPeserta}</span>
                </span>
                <span className="inline-block bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/30 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                  {posisiDilamar}
                </span>
              </div>
            </div>
          </div>

          {/* Kanan: Timer & Tombol Submit */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Kotak Timer */}
            <div
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-xs transition-all ${
                isCriticalTime
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-[#F7941D] text-slate-950'
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div className="leading-none">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider block ${
                    isCriticalTime ? 'text-red-100' : 'text-slate-900/80'
                  }`}
                >
                  Sisa Waktu
                </span>
                <span className="font-mono text-base md:text-lg font-extrabold tracking-tight">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Tombol Selesai Solid */}
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-50 text-slate-950 text-xs md:text-sm font-bold uppercase tracking-wider px-4 md:px-5 py-2.5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{loading ? 'Mengirim...' : 'Selesai & Kumpul'}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
