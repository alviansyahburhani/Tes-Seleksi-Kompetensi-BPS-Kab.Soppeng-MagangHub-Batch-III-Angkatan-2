'use client';

interface FinishedViewProps {
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  terjawabCount: number;
  totalSoal: number;
}

export default function FinishedView({
  namaPeserta,
  emailPeserta,
  posisiDilamar,
  terjawabCount,
  totalSoal,
}: FinishedViewProps) {
  return (
    <main className="min-h-screen bg-[#FFFDF7] flex items-center justify-center p-4">
      <div className="bg-white border-4 border-slate-950 shadow-[10px_10px_0px_0px_#0f172a] max-w-lg w-full overflow-hidden">
        {/* Header Strip BPS */}
        <div className="grid grid-cols-3 h-4 border-b-4 border-slate-950">
          <div className="bg-[#00AEEF] border-r-4 border-slate-950" />
          <div className="bg-[#8CC63F] border-r-4 border-slate-950" />
          <div className="bg-[#F7941D]" />
        </div>

        <div className="p-6 md:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-[#FFFDF7] border-3 border-slate-950 p-2 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center">
            <img
              src="/BPSIndonesia.svg"
              alt="Logo BPS Indonesia"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-block bg-[#8CC63F] border-3 border-slate-950 px-4 py-1 font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_#0f172a] mb-4">
            ✓ Jawaban Berhasil Disimpan
          </div>
          <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight mb-2">
            Ujian Selesai!
          </h2>
          <p className="text-sm font-bold text-slate-700 mb-6">
            Terima Kasih, telah hadir pada seleksi kompetensi Maganghub BPS Soppeng Batch III, Tetap Semangat dan Sukses Selalu!!!
          </p>

          <div className="text-left space-y-4 mb-6">
            <div className="bg-[#FFFDF7] border-3 border-slate-950 p-4 shadow-[4px_4px_0px_0px_#0f172a] space-y-2">
              <p className="text-xs font-black uppercase text-slate-500">
                Bukti Pengumpulan Peserta
              </p>
              <p className="text-lg font-black text-slate-950">{namaPeserta}</p>
              <p className="text-xs font-bold text-slate-700">{emailPeserta}</p>
              <div className="pt-2 border-t-2 border-slate-950 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-slate-700">Formasi:</span>
                <span className="bg-[#00AEEF] px-2.5 py-0.5 border-2 border-slate-950 text-xs font-black text-slate-950">
                  {posisiDilamar}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-slate-700">Status Jawaban:</span>
                <span className="bg-[#8CC63F] px-2.5 py-0.5 border-2 border-slate-950 text-xs font-black text-slate-950">
                  {terjawabCount} dari {totalSoal} Soal Terisi
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#F7941D] hover:bg-[#ff9f2e] text-slate-950 font-black uppercase tracking-wider py-3.5 px-6 border-4 border-slate-950 shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#0f172a] transition-all cursor-pointer"
          >
            Keluar / Kembali ke Beranda
          </button>
        </div>
      </div>
    </main>
  );
}

