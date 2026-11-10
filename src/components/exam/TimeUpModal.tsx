'use client';

interface TimeUpModalProps {
  namaPeserta: string;
  posisiDilamar: string;
  terjawabCount: number;
  totalSoal: number;
  loading: boolean;
  submitError?: string;
  onAcknowledge: () => void;
}

export default function TimeUpModal({
  namaPeserta,
  posisiDilamar,
  terjawabCount,
  totalSoal,
  loading,
  submitError,
  onAcknowledge,
}: TimeUpModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-2 border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-modal-pop">
        {/* Garis Aksen Atas BPS */}
        <div className="grid grid-cols-3 h-2 w-full">
          <div className="bg-[#00AEEF]" />
          <div className="bg-[#8CC63F]" />
          <div className="bg-[#F7941D]" />
        </div>

        {/* Bar Header Modal */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D] animate-ping" />
            <span className="font-extrabold text-white uppercase tracking-wider text-xs md:text-sm">
              Batas Waktu Ujian Berakhir
            </span>
          </div>
          <span className="bg-[#F7941D] text-slate-950 text-xs font-mono font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
            00:00:00
          </span>
        </div>

        {/* Isi Utama Pop-up */}
        <div className="p-6 md:p-8 text-center">
          {/* Ikon Jam / Auto-Submit Besar */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-5">
            <span className="absolute inset-0 rounded-full bg-[#F7941D]/35 animate-ripple-ring" />
            <div className="relative w-20 h-20 bg-[#FEF3C7] border-2 border-[#F7941D] text-[#B45309] rounded-full shadow-lg flex items-center justify-center">
              <svg
                className="w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          {/* Status Penyimpanan Otomatis */}
          <div className="mb-3">
            {loading ? (
              <span className="inline-flex items-center gap-2 bg-[#F0F9FF] text-[#0284C7] border border-[#00AEEF]/40 px-4 py-1.5 rounded-full font-extrabold text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#00AEEF] animate-ping" />
                Sedang Menyimpan Jawaban Otomatis...
              </span>
            ) : submitError ? (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-4 py-1.5 rounded-full font-extrabold text-xs uppercase tracking-wider">
                Gagal Menyimpan Otomatis — Klik OKE untuk Coba Lagi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-[#8CC63F]/20 text-[#3F6212] border border-[#8CC63F]/45 px-4 py-1.5 rounded-full font-extrabold text-xs uppercase tracking-wider">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Jawaban Berhasil Disimpan Otomatis
              </span>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug mb-2.5">
            Waktu Ujian Telah Habis,
            <br />
            Jawaban Anda Otomatis Dikumpulkan
          </h2>

          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-6">
            Durasi pengerjaan <strong className="font-bold text-slate-900">120 menit</strong> telah
            berakhir. Seluruh jawaban Pilihan Ganda, Deskripsi, dan Link Praktik yang telah Anda isi
            otomatis dikunci dan dikirim ke sistem penilaian.
          </p>

          {/* Ringkasan Jawaban yang Terkumpul */}
          <div className="bg-slate-50 rounded-2xl border-2 border-slate-200/90 p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 uppercase tracking-wider">Nama Peserta</span>
              <span className="text-slate-900 font-extrabold truncate max-w-[60%] text-right">
                {namaPeserta}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold border-t border-slate-200 pt-2.5">
              <span className="text-slate-500 uppercase tracking-wider">Formasi Posisi</span>
              <span className="bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/30 px-2.5 py-0.5 rounded-full font-bold">
                {posisiDilamar}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold border-t border-slate-200 pt-2.5">
              <span className="text-slate-500 uppercase tracking-wider">Total Soal Terjawab</span>
              <span className="bg-[#8CC63F] text-slate-950 font-extrabold px-3 py-1 rounded-full">
                {terjawabCount} / {totalSoal} Soal
              </span>
            </div>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* Tombol OKE untuk kembali ke Lobby */}
          <button
            type="button"
            onClick={onAcknowledge}
            disabled={loading}
            className="w-full bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-60 text-slate-950 font-extrabold uppercase tracking-wider text-sm py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {loading
              ? 'Menyimpan Jawaban Anda...'
              : submitError
                ? 'OKE (Kirim Ulang & Kembali ke Lobby)'
                : 'OKE'}
          </button>
        </div>
      </div>
    </div>
  );
}

