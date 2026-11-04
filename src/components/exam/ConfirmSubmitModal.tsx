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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden">
        {/* Garis Aksen Atas BPS */}
        <div className="grid grid-cols-3 h-1.5 w-full">
          <div className="bg-[#00AEEF]" />
          <div className="bg-[#8CC63F]" />
          <div className="bg-[#F7941D]" />
        </div>

        {/* Bar Atas Modal */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider text-xs md:text-sm">
            Konfirmasi Pengumpulan
          </span>
          <span className="bg-[#8CC63F] text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Final Submit
          </span>
        </div>

        {/* Isi Modal */}
        <div className="p-6 md:p-7 text-center">
          <div className="w-14 h-14 mx-auto mb-3.5 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shadow-xs flex items-center justify-center">
            <img
              src="/BPSIndonesia.svg"
              alt="Logo BPS Indonesia"
              className="w-full h-full object-contain"
            />
          </div>

          <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight mb-2">
            Kirim &amp; Simpan Jawaban?
          </h3>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            Pastikan seluruh jawaban Pilihan Ganda, Deskripsi, maupun Link Praktik Anda sudah benar. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban lagi.
          </p>

          {/* Ringkasan Status Sebelum Kirim */}
          <div className="bg-slate-50 rounded-2xl border-2 border-slate-200/90 p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 uppercase tracking-wider">Soal Terjawab</span>
              <span className="bg-[#8CC63F] text-slate-950 font-extrabold px-3 py-1 rounded-full">
                {terjawabCount} / {totalSoal} Soal
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold border-t border-slate-200 pt-2.5">
              <span className="text-slate-600 uppercase tracking-wider">Sisa Waktu Anda</span>
              <span className="bg-[#F7941D] text-slate-950 font-mono font-extrabold px-3 py-1 rounded-full">
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
              className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl border-2 border-slate-200 transition-all cursor-pointer"
            >
              Cek Kembali
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="w-full bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Ya, Kumpulkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
