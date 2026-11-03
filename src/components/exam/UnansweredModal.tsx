'use client';

interface UnansweredModalProps {
  message: string;
  onClose: () => void;
}

export default function UnansweredModal({ message, onClose }: UnansweredModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] border-4 border-slate-950 max-w-md w-full shadow-[12px_12px_0px_0px_#F7941D] overflow-hidden">
        <div className="bg-[#F7941D] border-b-4 border-slate-950 px-6 py-3 flex items-center justify-between">
          <span className="font-black text-slate-950 uppercase tracking-wider text-sm">
            ⚠️ Belum Dapat Mengumpulkan
          </span>
          <span className="bg-slate-950 text-white text-xs font-black px-2 py-0.5">
            SOAL KOSONG
          </span>
        </div>
        <div className="p-6 text-center">
          <div className="inline-block bg-[#00AEEF] border-3 border-slate-950 px-4 py-2 font-black text-xl text-slate-950 shadow-[4px_4px_0px_0px_#0f172a] mb-4">
            📝 LENGKAPI JAWABAN ANDA
          </div>
          <p className="text-slate-950 font-black text-sm md:text-base mb-6 leading-relaxed">
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#8CC63F] hover:bg-[#9bd64d] text-slate-950 font-black uppercase tracking-wider py-3 px-6 border-3 border-slate-950 shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#0f172a] transition-all cursor-pointer"
          >
            Kerjakan Soal Sekarang →
          </button>
        </div>
      </div>
    </div>
  );
}

