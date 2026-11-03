'use client';

interface ViolationModalProps {
  violations: number;
  onClose: () => void;
}

export default function ViolationModal({ violations, onClose }: ViolationModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] border-4 border-slate-950 max-w-md w-full shadow-[12px_12px_0px_0px_#ef4444] overflow-hidden">
        <div className="bg-red-500 border-b-4 border-slate-950 px-6 py-3 flex items-center justify-between">
          <span className="font-black text-white uppercase tracking-wider text-sm">
            🚨 Pelanggaran Terdeteksi
          </span>
          <span className="bg-slate-950 text-white text-xs font-black px-2 py-0.5">
            LOG #{violations}
          </span>
        </div>
        <div className="p-6 text-center">
          <div className="inline-block bg-[#F7941D] border-3 border-slate-950 px-4 py-2 font-black text-2xl text-slate-950 shadow-[4px_4px_0px_0px_#0f172a] mb-4">
            ⚠️ DILARANG PINDAH TAB!
          </div>
          <p className="text-slate-950 font-black text-base mb-2">
            Anda terdeteksi meninggalkan layar ujian!
          </p>
          <p className="text-xs font-bold text-slate-700 mb-6 leading-relaxed">
            Sistem telah membunyikan alarm dan mencatat aktivitas Anda ke{' '}
            <code className="bg-red-100 border border-slate-950 px-1 font-black">
              Log_Pelanggaran
            </code>
            . Total pelanggaran Anda:{' '}
            <span className="bg-red-500 text-white px-1.5 py-0.5 border border-slate-950 font-black">
              {violations} KALI
            </span>
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#8CC63F] hover:bg-[#9bd64d] text-slate-950 font-black uppercase tracking-wider py-3 px-6 border-3 border-slate-950 shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#0f172a] transition-all cursor-pointer"
          >
            Saya Mengerti &amp; Lanjutkan Ujian
          </button>
        </div>
      </div>
    </div>
  );
}

