'use client';

interface UnansweredModalProps {
  message: string;
  onClose: () => void;
}

export default function UnansweredModal({ message, onClose }: UnansweredModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden">
        {/* Garis Aksen Atas */}
        <div className="h-2 w-full bg-[#F7941D]" />

        {/* Header Modal */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider text-xs md:text-sm">
            Belum Dapat Mengumpulkan
          </span>
          <span className="bg-[#F7941D] text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Soal Kosong
          </span>
        </div>

        {/* Isi Modal */}
        <div className="p-6 md:p-7 text-center">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-[#F7941D]/15 text-[#D97706] border border-[#F7941D]/30 flex items-center justify-center">
            <svg
              className="w-7 h-7"
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
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mb-2">
            Lengkapi Jawaban Anda
          </h3>

          <div className="bg-amber-50 border-2 border-[#F7941D]/45 rounded-2xl p-4 mb-6">
            <p className="text-slate-800 font-semibold text-xs md:text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#00AEEF] hover:bg-[#0299D4] text-white font-bold uppercase tracking-wider text-xs md:text-sm py-3.5 px-6 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Kerjakan Soal Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
