'use client';

interface ConfirmSubmitModalProps {
  terjawabCount: number;
  totalSoal: number;
  sisaWaktuStr: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmSubmitModal({
  terjawabCount,
  totalSoal,
  sisaWaktuStr,
  loading,
  onCancel,
  onConfirm,
}: ConfirmSubmitModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] border-4 border-slate-950 max-w-md w-full shadow-[12px_12px_0px_0px_#8CC63F] overflow-hidden">
        {/* Bar Atas Modal */}
        <div className="bg-[#8CC63F] border-b-4 border-slate-950 px-6 py-3 flex items-center justify-between">
          <span className="font-black text-slate-950 uppercase tracking-wider text-sm">
            Konfirmasi Pengumpulan
          </span>
          <span className="bg-slate-950 text-white text-xs font-black px-2 py-0.5">
            FINAL SUBMIT
          </span>
        </div>

        {/* Isi Modal */}
        <div className="p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-white border-3 border-slate-950 p-2 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center">
            <img
              src="/BPSIndonesia.svg"
              alt="Logo BPS Indonesia"
              className="w-full h-full object-contain"
            />
          </div>

          <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">
            Kirim &amp; Simpan Jawaban?
          </h3>
          <p className="text-xs font-bold text-slate-700 mb-5 leading-relaxed">
            Pastikan seluruh jawaban Pilihan Ganda, Deskripsi, maupun Link Praktik Anda sudah benar. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban lagi.
          </p>

          {/* Ringkasan Status Sebelum Kirim */}
          <div className="bg-white border-3 border-slate-950 p-3.5 mb-6 text-left space-y-2 shadow-[4px_4px_0px_0px_#0f172a]">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-slate-600 uppercase">Soal Terjawab:</span>
              <span className="bg-[#8CC63F] text-slate-950 px-2 py-0.5 border border-slate-950">
                {terjawabCount} / {totalSoal} Soal
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-black border-t-2 border-slate-950 pt-2">
              <span className="text-slate-600 uppercase">Sisa Waktu Anda:</span>
              <span className="bg-[#F7941D] text-slate-950 font-mono px-2 py-0.5 border border-slate-950">
                {sisaWaktuStr}
              </span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider py-3 px-4 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
            >
              ← Cek Kembali
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="w-full bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider py-3 px-4 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Ya, Kumpulkan ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

