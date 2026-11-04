'use client';

import { useEffect, useState } from 'react';

interface FinishedViewProps {
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  terjawabCount: number;
  totalSoal: number;
  wawancaraApproved?: boolean;
  statusKelulusan?: string;
  onBackToLobby?: () => void;
}

export default function FinishedView({
  namaPeserta,
  emailPeserta,
  posisiDilamar,
  terjawabCount,
  totalSoal,
  wawancaraApproved = false,
  statusKelulusan = '',
  onBackToLobby,
}: FinishedViewProps) {
  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [notifFeedback, setNotifFeedback] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  const handleRequestNotif = async () => {
    setNotifFeedback('');
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      setNotifFeedback('Browser perangkat Anda tidak mendukung notifikasi sistem.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        setNotifFeedback('Notifikasi aktif! Anda akan diberitahu saat pengumuman kelulusan keluar.');
        try {
          new Notification('Notifikasi Pengumuman BPS Soppeng Aktif', {
            body: `Halo ${namaPeserta}, izin notifikasi pengumuman kelulusan Anda telah diaktifkan.`,
            icon: '/BPSIndonesia.svg',
          });
        } catch {}
      } else if (perm === 'denied') {
        setNotifFeedback('Izin notifikasi ditolak pada pengaturan browser Anda.');
      }
    } catch {
      setNotifFeedback('Gagal mengaktifkan izin notifikasi.');
    }
  };

  const rawKelulusan = (statusKelulusan || '').trim();
  const upperKelulusan = rawKelulusan.toUpperCase();
  const hasKelulusanValue = rawKelulusan.length > 0;
  const isTidakLulus =
    hasKelulusanValue &&
    (upperKelulusan.includes('TIDAK') ||
      upperKelulusan.includes('BELUM') ||
      upperKelulusan.includes('GAGAL') ||
      upperKelulusan.includes('DITOLAK'));
  const isLulus =
    hasKelulusanValue &&
    !isTidakLulus &&
    (upperKelulusan.includes('LULUS') ||
      upperKelulusan.includes('LOLOS') ||
      upperKelulusan.includes('DITERIMA') ||
      upperKelulusan.includes('PASS'));

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header Strip BPS */}
        <div className="grid grid-cols-3 h-2 w-full">
          <div className="bg-[#00AEEF]" />
          <div className="bg-[#8CC63F]" />
          <div className="bg-[#F7941D]" />
        </div>

        <div className="p-6 md:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-3.5 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shadow-xs flex items-center justify-center">
            <img
              src="/BPSIndonesia.svg"
              alt="Logo BPS Indonesia"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-[#8CC63F] text-slate-950 px-3.5 py-1 rounded-full font-extrabold text-[11px] uppercase tracking-wider shadow-2xs mb-3">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Jawaban Berhasil Disimpan</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">
            Tes Kompetensi Selesai!
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-600 mb-6">
            Terima kasih telah menyelesaikan Tes Seleksi Kompetensi MagangHub BPS Soppeng Batch III.
          </p>

          {/* Pemberitahuan Status Wawancara Berikutnya */}
          {!wawancaraApproved ? (
            <div className="bg-white border-2 border-[#F7941D]/50 rounded-2xl shadow-xs overflow-hidden flex text-left mb-6">
              <div className="w-2 bg-[#F7941D] shrink-0" />
              <div className="p-4 bg-amber-50/60 flex items-start gap-3 flex-1">
                <span className="w-9 h-9 rounded-xl bg-[#F7941D] text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                    Arahan Tahap Selanjutnya: Tes Wawancara
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Karena Anda <strong className="font-bold text-slate-900">belum mengikuti Tes Wawancara</strong>, silakan menuju ke meja/ruangan <strong className="font-bold text-slate-900">Tes Wawancara</strong> agar kehadiran wawancara Anda dapat di-approve oleh Admin.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-[#8CC63F]/55 rounded-2xl shadow-xs overflow-hidden flex text-left mb-6">
              <div className="w-2 bg-[#8CC63F] shrink-0" />
              <div className="p-4 bg-[#F4FCEB]/70 flex items-start gap-3 flex-1">
                <span className="w-9 h-9 rounded-xl bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                    Seluruh Tahapan Seleksi Selesai
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Anda tercatat sudah menyelesaikan <strong className="font-bold text-slate-900">Tes Wawancara</strong> dan <strong className="font-bold text-slate-900">Tes Seleksi Kompetensi</strong>. Tetap semangat dan sukses selalu!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Kartu Bukti Pengumpulan Peserta */}
          <div className="bg-slate-50 rounded-2xl border-2 border-slate-200/90 p-5 text-left space-y-3 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Bukti Pengumpulan Peserta
              </p>
              <p className="text-base md:text-lg font-extrabold text-slate-900 leading-snug">
                {namaPeserta}
              </p>
              <p className="text-xs font-medium text-slate-500">{emailPeserta}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-500">Formasi:</span>
                <span className="bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/30 px-3 py-1 rounded-full font-bold">
                  {posisiDilamar}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-500">
                  Status Jawaban:
                </span>
                <span className="bg-[#8CC63F] text-slate-950 px-3 py-1 rounded-full font-extrabold">
                  {terjawabCount} dari {totalSoal} Soal Terisi
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-500">
                  Status Wawancara:
                </span>
                <span
                  className={`px-3 py-1 rounded-full font-extrabold text-slate-950 ${
                    wawancaraApproved ? 'bg-[#8CC63F]' : 'bg-[#F7941D]'
                  }`}
                >
                  {wawancaraApproved ? 'Sudah Wawancara' : 'Arahkan ke Wawancara'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onBackToLobby) {
                onBackToLobby();
              } else {
                window.location.reload();
              }
            }}
            className="w-full bg-[#00AEEF] hover:bg-[#0299D4] text-white font-bold uppercase tracking-wider text-xs md:text-sm py-3.5 px-6 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Lihat Portal Status Seleksi &amp; Wawancara
          </button>
        </div>
      </div>
    </main>
  );
}
