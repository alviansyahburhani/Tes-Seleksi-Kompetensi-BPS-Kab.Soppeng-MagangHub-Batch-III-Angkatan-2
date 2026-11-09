'use client';

interface ViolationModalProps {
  violations: number;
  onClose: () => void;
}

export default function ViolationModal({ violations, onClose }: ViolationModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden">
        {/* Garis Aksen Atas Merah */}
        <div className="h-2 w-full bg-red-600" />

        {/* Header Modal */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider text-xs md:text-sm">
            Pelanggaran Terdeteksi
          </span>
          <span className="bg-white text-red-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Log #{violations}
          </span>
        </div>

        {/* Isi Modal */}
        <div className="p-6 md:p-7 text-center">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <span className="inline-block bg-[#F7941D] text-slate-950 font-extrabold text-xs uppercase tracking-wider px-3.5 py-1 rounded-full mb-2.5">
            Dilarang Pindah Tab!
          </span>

          <h3 className="text-lg font-extrabold text-slate-900 mb-2">
            Anda Terdeteksi Meninggalkan Layar Ujian
          </h3>

          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 text-xs text-slate-700 leading-relaxed">
            Sistem telah membunyikan alarm dan mencatat aktivitas Anda.
            . Total pelanggaran Anda:{' '}
            <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold ml-1">
              {violations} Kali
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#8CC63F] hover:bg-[#7BB335] text-slate-950 font-bold uppercase tracking-wider text-xs md:text-sm py-3.5 px-6 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Saya Mengerti &amp; Lanjutkan Ujian
          </button>
        </div>
      </div>
    </div>
  );
}
