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
  return (
    <>
      {/* TOP COLOR BAR BPS */}
      <div className="grid grid-cols-3 h-2.5 border-b-2 border-slate-950">
        <div className="bg-[#00AEEF]" />
        <div className="bg-[#8CC63F]" />
        <div className="bg-[#F7941D]" />
      </div>

      {/* HEADER UJIAN & TIMER */}
      <header className="bg-white border-b-4 border-slate-950 sticky top-0 z-30 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Identitas Kiri */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[#FFFDF7] border-2 border-slate-950 p-1.5 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
              <img
                src="/BPSIndonesia.svg"
                alt="Logo BPS"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-black text-slate-950 text-lg md:text-xl uppercase tracking-tight leading-none">
                BPS Kab. Soppeng • MagangHub BATCH III
              </h1>
              <p className="text-xs font-bold text-slate-700 mt-1 flex flex-wrap items-center gap-1.5">
                <span className="bg-slate-950 text-white px-2 py-0.5 font-black">{namaPeserta}</span>
                <span className="bg-[#00AEEF] text-slate-950 border border-slate-950 px-2 py-0.5 font-black">
                  {posisiDilamar}
                </span>
              </p>
            </div>
          </div>

          {/* Kanan: Timer & Tombol Submit */}
          <div className="flex items-center gap-3 md:gap-4 ml-auto">
            {/* Kotak Timer */}
            <div
              className={`px-3.5 py-1.5 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] flex items-center gap-2 ${timeLeft < 300
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-[#F7941D] text-slate-950'
                }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider block">
                Sisa Waktu
              </span>
              <span className="font-mono text-lg md:text-xl font-black tracking-tight">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Tombol Selesai */}
            <button
              onClick={onSubmit}
              disabled={loading}
              className="bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 text-xs md:text-sm font-black uppercase tracking-wider px-4 py-2.5 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
            >
              {loading ? 'Mengirim...' : 'Selesai & Kumpul'}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

