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
      <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
        <div className="bg-[#00AEEF] border-b-4 border-slate-950 px-4 py-2.5 flex items-center justify-between gap-2">
          <h2 className="font-black text-slate-950 text-xs md:text-sm uppercase tracking-wider">
            Peta Navigasi Soal
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-white border-2 border-slate-950 px-2 py-0.5 text-xs font-black text-slate-950">
              {totalTerjawab}/{soalList.length} Terisi
            </span>
            <button
              type="button"
              onClick={onHideMap}
              title="Sembunyikan Peta Navigasi"
              className="bg-white hover:bg-red-100 border-2 border-slate-950 px-2 py-0.5 text-xs font-black text-slate-950 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1">
            {soalList.map((s, idx) => {
              const isAnswered = Boolean(jawaban[s.id] && jawaban[s.id].trim() !== '');
              const isCurrent = currentIndex === idx;

              let btnColor = 'bg-[#FFFDF7] text-slate-950 hover:bg-slate-200';
              if (isAnswered) {
                btnColor = 'bg-[#8CC63F] text-slate-950';
              }

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  className={`h-10 border-2 border-slate-950 text-xs font-black flex items-center justify-center transition cursor-pointer ${btnColor} ${
                    isCurrent
                      ? 'ring-3 ring-[#00AEEF] ring-offset-1 -translate-y-0.5 shadow-[3px_3px_0px_0px_#0f172a]'
                      : 'shadow-[2px_2px_0px_0px_#0f172a]'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legenda Warna BPS (Hanya Terjawab & Kosong) */}
          <div className="mt-4 pt-3 border-t-2 border-slate-950 flex justify-around text-[11px] font-black text-slate-950">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-[#8CC63F] border-2 border-slate-950 inline-block shrink-0" />
              Terjawab
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-[#FFFDF7] border-2 border-slate-950 inline-block shrink-0" />
              Kosong
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

