'use client';

import { Soal } from '@/types/exam';

interface QuestionNavigationMapProps {
  soalList: Soal[];
  jawaban: Record<number, string>;
  currentIndex: number;
  totalTerjawab: number;
  onSelectQuestion: (idx: number) => void;
  onHideMap: () => void;
}

export default function QuestionNavigationMap({
  soalList,
  jawaban,
  currentIndex,
  totalTerjawab,
  onSelectQuestion,
  onHideMap,
}: QuestionNavigationMapProps) {
  return (
    <div className="lg:col-span-4 space-y-6">
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-lg overflow-hidden sticky top-24">
        {/* Garis Aksen Atas */}
        <div className="h-2 w-full bg-[#00AEEF]" />

        {/* Header Peta Navigasi */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#00AEEF] text-white flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4"
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
            </span>
            <h2 className="font-bold text-white text-xs md:text-sm uppercase tracking-wider">
              Peta Navigasi Soal
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-200">
              <strong className="text-[#8CC63F]">{totalTerjawab}</strong>/{soalList.length} Terisi
            </span>
            <button
              type="button"
              onClick={onHideMap}
              title="Sembunyikan Peta Navigasi"
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Grid Nomor Soal */}
        <div className="p-5 bg-slate-50/70">
          <div className="grid grid-cols-5 sm:grid-cols-5 gap-2.5 max-h-80 overflow-y-auto p-2">
            {soalList.map((s, idx) => {
              const isAnswered = Boolean(jawaban[s.id] && jawaban[s.id].trim() !== '');
              const isCurrent = currentIndex === idx;

              let btnStyle =
                'bg-white text-slate-700 border-2 border-slate-200/90 hover:border-[#00AEEF]/60 hover:bg-[#F0F9FF]';
              if (isAnswered) {
                btnStyle =
                  'bg-[#8CC63F] text-slate-950 border-2 border-[#8CC63F] hover:bg-[#7BB335]';
              }

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  className={`h-10 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer shadow-2xs ${btnStyle} ${
                    isCurrent
                      ? 'ring-2 ring-[#00AEEF] ring-offset-2 border-[#00AEEF] text-[#0284C7] shadow-sm'
                      : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legenda Warna BPS */}
          <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-wrap justify-around gap-2 text-xs font-bold text-slate-600">
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
      </div>
    </div>
  );
}
