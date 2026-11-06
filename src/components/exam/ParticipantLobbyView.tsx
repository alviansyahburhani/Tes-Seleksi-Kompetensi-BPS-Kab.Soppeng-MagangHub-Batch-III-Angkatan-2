'use client';

import React, { useEffect, useState } from 'react';
import { ParticipantLobbyStatus } from '@/types/exam';

interface ParticipantLobbyViewProps {
  lobbyStatus: ParticipantLobbyStatus;
  startingExam: boolean;
  refreshingStatus: boolean;
  errorMessage: string;
  hasAcceptedTerms: boolean;
  onAcceptTerms: () => void;
  onRefreshStatus: () => void;
  onStartCompetencyExam: () => void;
  onLogoutIdentity: () => void;
}

export default function ParticipantLobbyView({
  lobbyStatus,
  startingExam,
  refreshingStatus,
  errorMessage,
  hasAcceptedTerms,
  onAcceptTerms,
  onRefreshStatus,
  onStartCompetencyExam,
  onLogoutIdentity,
}: ParticipantLobbyViewProps) {
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('');
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);

  // State untuk membuka kembali pop-up Alur & Ketentuan (mode baca saja, setelah peserta menyetujui)
  const [showTermsViewer, setShowTermsViewer] = useState(false);

  // State Cooldown tombol manual Cek Status Terbaru (10 detik)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // State Izin Notifikasi Pengumuman Kelulusan Browser
  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [isNotifSubscribed, setIsNotifSubscribed] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<string>('');
  const [hasNotifiedResult, setHasNotifiedResult] = useState(false);

  // Cek dukungan & status izin Notification API saat komponen dimuat
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    setNotifPermission(Notification.permission);
    try {
      const subKey = `bps_notif_sub_${(lobbyStatus.emailPeserta || '').trim().toLowerCase()}`;
      if (Notification.permission === 'granted' && localStorage.getItem(subKey) === 'true') {
        setIsNotifSubscribed(true);
      }
    } catch {}
  }, [lobbyStatus.emailPeserta]);

  // Fungsi meminta izin notifikasi browser kepada peserta
  const handleRequestNotificationPermission = async () => {
    setNotifFeedback('');
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      setNotifFeedback('Browser perangkat Anda tidak mendukung fitur notifikasi sistem.');
      return;
    }

    try {
      const perm =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        setIsNotifSubscribed(true);
        try {
          const subKey = `bps_notif_sub_${(lobbyStatus.emailPeserta || '').trim().toLowerCase()}`;
          localStorage.setItem(subKey, 'true');
        } catch {}
        setNotifFeedback(
          'Notifikasi pengumuman berhasil diaktifkan! Anda akan menerima pemberitahuan saat hasil seleksi keluar.'
        );
        try {
          new Notification('Notifikasi Seleksi BPS Kab. Soppeng Aktif', {
            body: `Halo ${lobbyStatus.namaPeserta}, notifikasi pengumuman kelulusan Anda telah aktif.`,
            icon: '/BPSIndonesia.svg',
          });
        } catch {
          // Abaikan jika gagal memunculkan test notification pada mobile browser tertentu
        }
      } else if (perm === 'denied') {
        setNotifFeedback(
          'Izin notifikasi ditolak di pengaturan browser. Silakan izinkan notifikasi pada ikon gembok di address bar browser Anda.'
        );
      }
    } catch {
      setNotifFeedback('Gagal meminta izin notifikasi pada browser ini.');
    }
  };

  // Timer Cooldown 10 detik setelah menekan tombol Cek Status Terbaru
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const cdTimer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(cdTimer);
  }, [cooldownSeconds]);

  // Handler klik manual Cek Status Terbaru (diberi jeda / cooldown 10 detik)
  const handleManualRefresh = () => {
    if (cooldownSeconds > 0 || refreshingStatus) return;
    onRefreshStatus();
    setCooldownSeconds(10);
    setLastCheckedTime(
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  };

  // Catat waktu pemeriksaan awal saat halaman Lobby dimuat (tanpa auto-polling agar server & kuota Google Sheets hemat)
  useEffect(() => {
    setLastCheckedTime(
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }, []);

  const {
    namaPeserta,
    emailPeserta,
    posisiDilamar,
    alamatPeserta,
    kompetensiApproved,
    kompetensiSelesai,
    wawancaraApproved,
    statusUjian,
    statusWawancara,
    statusKelulusan,
  } = lobbyStatus;

  const bothCompleted = kompetensiSelesai && wawancaraApproved;

  // Evaluasi status kelulusan dari Kolom Kelulusan di Monitoring_Peserta
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

  // Kirim notifikasi browser otomatis begitu status kelulusan terisi & izin notifikasi granted
  // (Tanpa membocorkan status Lulus/Tidak Lulus di dalam teks notifikasi agar peserta login terlebih dahulu untuk melihat hasilnya)
  useEffect(() => {
    if (!hasKelulusanValue || hasNotifiedResult) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = 'Pengumuman Hasil Seleksi BPS Kab. Soppeng';
        const body = `Halo ${namaPeserta}, pengumuman hasil akhir Seleksi MagangHub BPS Kab. Soppeng telah tersedia. Silakan masuk/login pada website menggunakan email Anda untuk melihat hasil kelulusan.`;
        new Notification(title, {
          body,
          icon: '/BPSIndonesia.svg',
        });
        setHasNotifiedResult(true);
      } catch {
      }
    }
  }, [hasKelulusanValue, hasNotifiedResult, namaPeserta]);

  return (
    <main className="min-h-screen bg-slate-100/80 flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Ambient Background Glow Halus */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 bg-[#00AEEF]/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-80 h-80 bg-[#F7941D]/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 left-1/3 w-96 h-96 bg-[#8CC63F]/10 rounded-full blur-3xl" />

      {/* ===================================================================== */}
      {/* POP-UP MANDATORY: ALUR & KETENTUAN UJIAN (MUNCUL JIKA BELUM CENTANG/SETUJU) */}
      {/* ===================================================================== */}
      {(!hasAcceptedTerms || showTermsViewer) && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Top Strip 3 Warna BPS */}
            <div className="grid grid-cols-3 h-1.5 w-full shrink-0 overflow-hidden">
              <div className="bg-[#00AEEF]" />
              <div className="bg-[#8CC63F]" />
              <div className="bg-[#F7941D]" />
            </div>

            {/* Header Modal */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Alur &amp; Ketentuan Seleksi
              </h3>
              <span className="bg-[#F7941D]/15 text-[#B45309] border border-[#F7941D]/30 rounded-full text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5">
                {hasAcceptedTerms ? 'Sudah Disetujui' : 'Wajib Disetujui'}
              </span>
            </div>

            {/* Area Isi Pop-up yang Dapat Di-scroll */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Banner Pemberitahuan Data Berhasil Disimpan */}
              <div className="bg-[#F4FCEB] border border-[#D9F99D] rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  Data kehadiran atas nama <strong className="font-semibold text-slate-900">{namaPeserta}</strong> telah tersimpan di sistem <strong className="font-semibold text-slate-900">Monitoring Peserta</strong>.
                </p>
              </div>

              {/* Identitas BPS */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl p-2 shadow-2xs flex items-center justify-center shrink-0">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base leading-snug">
                    Seleksi MagangHub BPS Kab. Soppeng
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Harap baca alur dan ketentuan pelaksanaan seleksi berikut.
                  </p>
                </div>
              </div>

              {/* Daftar Alur & Ketentuan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs px-4 py-2.5 border-b border-slate-200/80 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F7941D] shrink-0" />
                  <p className="text-xs font-semibold text-slate-800">
                    Alur dan Ketentuan Pelaksanaan Seleksi
                  </p>
                </div>
                <ol className="px-4 py-3 text-xs md:text-sm text-slate-700 list-decimal list-inside space-y-2.5 leading-relaxed">
                  <li>
                    <strong className="font-semibold text-slate-900">Tahapan Seleksi:</strong> Proses seleksi ini terdiri dari 2 (dua) tahapan utama, yaitu <strong className="font-semibold text-slate-900">Tes Seleksi Kompetensi</strong> dan <strong className="font-semibold text-slate-900">Tes Wawancara</strong>.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Kewajiban Peserta:</strong> Seluruh peserta wajib mengikuti kedua tahapan tes tersebut secara lengkap tanpa terkecuali.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Mekanisme Perpindahan Tahap:</strong> Peserta yang telah menyelesaikan Tes Wawancara dan mendapatkan persetujuan (<em>approval</em>) dari pewawancara akan diarahkan untuk mengikuti Tes Seleksi Kompetensi. Sebaliknya, peserta yang telah menyelesaikan Tes Seleksi Kompetensi terlebih dahulu akan diarahkan menuju ruang Tes Wawancara.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Koordinasi Pelaksanaan:</strong> Seluruh alur pelaksanaan dan perpindahan ruangan akan dipandu langsung oleh Panitia Pelaksana.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Tanggung Jawab Peserta:</strong> Peserta wajib memperhatikan jadwal dan arahan dengan saksama. Tahapan tes yang terlewat akibat kelalaian peserta sepenuhnya berada di luar tanggung jawab Panitia Pelaksana.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Akses Ujian:</strong> Untuk memulai Tes Seleksi Kompetensi, peserta wajib menunggu persetujuan akses (<em>approval</em>) terlebih dahulu dari Admin Ruangan.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Durasi Pengerjaan:</strong> Waktu pengerjaan Tes Seleksi Kompetensi adalah <strong className="font-semibold text-slate-900">60 menit</strong> dan akan dihitung mundur secara otomatis sesaat setelah peserta menekan tombol <strong className="font-semibold text-slate-900">&quot;Mulai Ujian Sekarang&quot;</strong>.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Pengumpulan Tugas Praktik:</strong> Hasil pengerjaan soal Praktik Kompetensi wajib dikumpulkan dalam bentuk tautan (<em>link</em>) dengan pengaturan akses publik (<strong className="font-semibold text-slate-900">&quot;Anyone with the link&quot;</strong> atau <strong className="font-semibold text-slate-900">&quot;Siapa saja yang memiliki link dapat melihat&quot;</strong>).
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Integritas dan Kesempatan Tes:</strong> Peserta dilarang keras melakukan kecurangan dalam bentuk apa pun selama proses seleksi berlangsung. Setiap tahapan seleksi (baik Tes Kompetensi maupun Wawancara) hanya dapat diikuti sebanyak <strong className="font-semibold text-slate-900">1 (satu) kali</strong>.
                  </li>
                </ol>
              </div>

              {/* Mode baca saja (sudah menyetujui): hanya tombol Tutup. Mode wajib: checkbox + tombol Setuju */}
              {hasAcceptedTerms ? (
                <button
                  type="button"
                  onClick={() => setShowTermsViewer(false)}
                  className="w-full bg-[#00AEEF] hover:bg-[#0299D4] text-white font-bold uppercase tracking-wider text-xs py-3.5 px-6 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  Tutup
                </button>
              ) : (
              <>
              {/* Checkbox Persetujuan */}
              <label className="flex items-start gap-3 p-3.5 bg-slate-50/70 hover:bg-sky-50/60 border border-slate-200 rounded-xl cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={isCheckboxChecked}
                  onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#00AEEF] rounded cursor-pointer shrink-0"
                />
                <span className="text-xs font-medium text-slate-800 leading-relaxed">
                  Saya telah membaca, memahami, dan menyetujui seluruh alur tahapan serta tata tertib Seleksi MagangHub BPS Kab. Soppeng Batch III Angkatan 2 Tahun 2026.
                </span>
              </label>

              {/* Tombol Setuju */}
              <button
                type="button"
                disabled={!isCheckboxChecked}
                onClick={onAcceptTerms}
                className="w-full bg-[#8CC63F] hover:bg-[#7BB335] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-slate-950 font-bold uppercase tracking-wider text-xs py-3.5 px-6 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
              >
                {isCheckboxChecked
                  ? 'Setuju & Lanjutkan ke Status Seleksi'
                  : 'Centang Persetujuan Terlebih Dahulu'}
              </button>
              </>
              )}
            </div>
          </div>
        </div>
      )}

      <div />

      {/* ===================================================================== */}
      {/* KARTU UTAMA PORTAL STATUS TAHAPAN SELEKSI PESERTA                     */}
      {/* ===================================================================== */}
      <div className="max-w-4xl w-full mx-auto my-auto z-10 py-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-900/8 overflow-hidden">
          {/* Top Strip 3 Warna BPS */}
          <div className="grid grid-cols-3 h-1.5 w-full overflow-hidden">
            <div className="bg-[#00AEEF]" />
            <div className="bg-[#8CC63F]" />
            <div className="bg-[#F7941D]" />
          </div>

          {/* ================================================================= */}
          {/* HERO HEADER & BANNER IDENTITAS PESERTA                            */}
          {/* ================================================================= */}
          <div className="bg-[#00AEEF] text-white p-6 md:p-8 relative overflow-hidden">
            {/* Dekorasi Lingkaran Halus Serupa LoginView */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-white/10" />

            {/* Baris Atas: Badges & Tombol Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-[#8CC63F] text-slate-950 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
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
                  <span>Daftar Hadir Tersimpan</span>
                </span>
                <span className="bg-white/20 text-white font-semibold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full">
                  Portal Status Seleksi
                </span>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshingStatus || cooldownSeconds > 0}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 disabled:bg-white/60 disabled:text-slate-600 disabled:cursor-not-allowed text-[#0284C7] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <svg
                  className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                <span>
                  {refreshingStatus
                    ? 'Memperbarui...'
                    : cooldownSeconds > 0
                      ? `Tunggu (${cooldownSeconds}s)`
                      : 'Cek Status Terbaru'}
                </span>
              </button>
            </div>

            {/* Baris Judul & Logo BPS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl p-2.5 shadow-md flex items-center justify-center shrink-0">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                    Status Tahapan Seleksi Peserta
                  </h1>
                  <p className="text-xs md:text-sm text-white/90 font-medium mt-0.5">
                    Badan Pusat Statistik Kabupaten Soppeng • MagangHub Batch III
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTermsViewer(true)}
                    className="mt-2.5 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Lihat Alur &amp; Ketentuan</span>
                  </button>
                </div>
              </div>

              {lastCheckedTime && (
                <div className="inline-flex items-center gap-1.5 bg-slate-950/15 text-white/95 text-[11px] font-medium px-3 py-1.5 rounded-xl self-start md:self-auto">
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Dicek: {lastCheckedTime}</span>
                </div>
              )}
            </div>

            {/* Kartu Identitas Peserta Terdaftar di Dalam Hero */}
            <div className="mt-6 bg-white text-slate-900 rounded-2xl p-4 md:p-5 shadow-md relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Peserta Terdaftar Hadir
                  </span>
                  <p className="text-lg font-bold text-slate-900 leading-tight truncate">
                    {namaPeserta}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium mt-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-[#00AEEF] shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span>{emailPeserta}</span>
                    </span>

                    {lobbyStatus.teleponPeserta && (
                      <span className="inline-flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5 text-[#8CC63F] shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>{lobbyStatus.teleponPeserta}</span>
                      </span>
                    )}

                    {alamatPeserta && (
                      <span className="inline-flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5 text-[#F7941D] shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{alamatPeserta}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Formasi Dilamar
                  </span>
                  <span className="inline-block bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/25 font-bold text-xs px-3.5 py-1.5 rounded-xl">
                    {posisiDilamar}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* AREA ISI: BANNER ARAHAN & 2 KARTU TAHAPAN SELEKSI                 */}
          {/* ================================================================= */}
          <div className="bg-slate-100/90 border-t border-slate-200 p-6 md:p-8 space-y-6">
            {errorMessage && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                    Pemberitahuan
                  </p>
                  <p className="text-xs font-medium leading-relaxed mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* BANNER PEMBERITAHUAN ARAHAN OTOMATIS SESUAI KONDISI PESERTA */}
            {!bothCompleted && wawancaraApproved && !kompetensiSelesai && (
              <div className="bg-white border-2 border-[#00AEEF]/45 rounded-2xl shadow-sm overflow-hidden flex">
                <div className="w-2 bg-[#00AEEF] shrink-0" />
                <div className="p-5 flex items-start gap-4 flex-1 bg-[#F0F9FF]/60">
                  <span className="w-10 h-10 rounded-xl bg-[#00AEEF] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 16 16 12 12 8" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </span>
                  <div>
                    <span className="inline-block bg-[#00AEEF] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5">
                      Arahan Tahap Berikutnya
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-slate-900 mb-1">
                      Anda Telah Menyelesaikan Wawancara — Silakan Ikuti Tes Seleksi Kompetensi
                    </h3>
                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                      Status <strong className="font-semibold text-slate-900">Tes Wawancara</strong> Anda telah di-approve oleh Admin dan tidak dapat diikuti kembali. Sekarang Anda diarahkan untuk mengikuti <strong className="font-semibold text-slate-900">Tes Seleksi Kompetensi</strong> pada kartu di bawah ini.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!bothCompleted && kompetensiSelesai && !wawancaraApproved && (
              <div className="bg-white border-2 border-[#F7941D]/50 rounded-2xl shadow-sm overflow-hidden flex">
                <div className="w-2 bg-[#F7941D] shrink-0" />
                <div className="p-5 flex items-start gap-4 flex-1 bg-amber-50/70">
                  <span className="w-10 h-10 rounded-xl bg-[#F7941D] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </span>
                  <div>
                    <span className="inline-block bg-[#F7941D] text-slate-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5">
                      Arahan Tahap Berikutnya
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-slate-900 mb-1">
                      Anda Telah Menyelesaikan Tes Kompetensi — Silakan Mengikuti Tes Wawancara
                    </h3>
                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                      Jawaban <strong className="font-semibold text-slate-900">Tes Seleksi Kompetensi</strong> Anda telah tersimpan dan tidak dapat diakses ulang. Silakan menuju ke meja/ruangan <strong className="font-semibold text-slate-900">Tes Wawancara</strong> dan konfirmasikan kehadiran Anda kepada Admin/Pewawancara untuk di-approve.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!bothCompleted && !kompetensiSelesai && !wawancaraApproved && (
              <div className="bg-white border-2 border-[#F7941D]/45 rounded-2xl shadow-sm overflow-hidden flex">
                <div className="w-2 bg-[#F7941D] shrink-0" />
                <div className="p-4 md:p-5 flex items-start gap-3.5 flex-1 bg-amber-50/50">
                  <span className="w-9 h-9 rounded-xl bg-[#F7941D] text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-900 mb-1">
                      Informasi Rangkaian Seleksi (2 Tahap)
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Anda telah terdaftar hadir. Silakan ikuti arahan panitia di ruangan: jika Anda berada di sesi <strong className="font-semibold text-slate-900">Wawancara</strong> terlebih dahulu, Admin akan melakukan approve setelah wawancara selesai; jika Anda berada di ruangan <strong className="font-semibold text-slate-900">Tes Seleksi Kompetensi</strong>, tunggu Admin melakukan <strong className="font-semibold text-slate-900">Approve Akses Kompetensi</strong> agar tombol <em>Mulai Ujian</em> aktif.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* DUA KARTU TAHAPAN: TES SELEKSI KOMPETENSI & TES WAWANCARA       */}
            {/* =============================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* KARTU 1: TES SELEKSI KOMPETENSI */}
              <div
                className={`rounded-2xl border-2 overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-md relative ${
                  kompetensiSelesai
                    ? 'bg-white border-[#8CC63F]/60'
                    : kompetensiApproved
                      ? 'bg-white border-[#00AEEF]/65 shadow-lg shadow-[#00AEEF]/10'
                      : 'bg-white border-slate-300'
                }`}
              >
                {/* Efek Shimmer Halus Saat Akses Disetujui Admin */}
                {kompetensiApproved && !kompetensiSelesai && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl z-0">
                    <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#00AEEF]/8 to-transparent animate-shimmer-sweep" />
                  </div>
                )}

                <div className="relative z-10">
                  {/* Garis Aksen Atas Kartu 1 */}
                  <div
                    className={`h-2 w-full ${
                      kompetensiSelesai
                        ? 'bg-[#8CC63F]'
                        : 'bg-[#00AEEF]'
                    }`}
                  />

                  {/* Baris Header Kartu 1 */}
                  <div
                    className={`flex items-center justify-between gap-2 px-6 py-3.5 border-b ${
                      kompetensiSelesai
                        ? 'bg-[#F4FCEB] border-[#D9F99D]'
                        : kompetensiApproved
                          ? 'bg-[#F0F9FF] border-[#BAE6FD]'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          kompetensiSelesai ? 'bg-[#8CC63F]' : 'bg-[#00AEEF]'
                        }`}
                      />
                      Tahap 1 • Kompetensi
                    </span>
                    {kompetensiSelesai ? (
                      <span className="bg-[#8CC63F] text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs">
                        Sudah Selesai
                      </span>
                    ) : kompetensiApproved ? (
                      <span className="inline-flex items-center gap-1.5 bg-[#00AEEF] text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs animate-pop-in">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                        Akses Disetujui Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-[#F7941D] text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-50" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
                        </span>
                        Menunggu Approve
                      </span>
                    )}
                  </div>

                  {/* Isi Kartu 1 */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <span className="w-12 h-12 rounded-2xl bg-[#00AEEF] text-white flex items-center justify-center shadow-sm shrink-0">
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8" />
                          <path d="M12 17v4" />
                        </svg>
                      </span>
                      <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                          Tes Seleksi Kompetensi
                        </h2>
                        <p className="text-xs font-semibold text-[#0284C7] mt-0.5">
                          Durasi Pengerjaan 60 Menit
                        </p>
                      </div>
                    </div>

                    {kompetensiSelesai ? (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Anda telah menyelesaikan dan mengirimkan jawaban Tes Seleksi Kompetensi (<strong className="font-semibold text-slate-800">{statusUjian || 'SELESAI'}</strong>). Anda tidak dapat mengikuti ujian kompetensi kembali.
                      </p>
                    ) : kompetensiApproved ? (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Admin telah menyetujui akses ujian Anda! Waktu <strong className="font-semibold text-slate-900">60 Menit</strong> baru akan dihitung saat Anda menekan tombol <strong className="font-semibold text-slate-900">&quot;Mulai Ujian Sekarang&quot;</strong> di bawah ini.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Akses soal kompetensi menunggu <strong className="font-semibold text-slate-800">Approve</strong> dari Admin pengawas ruangan. Tekan tombol <em>Cek Status Terbaru</em> di atas jika Admin sudah memberikan persetujuan.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Aksi Kartu 1 */}
                <div className="px-6 pb-6 pt-2 relative z-10">
                  {kompetensiSelesai ? (
                    <div className="w-full bg-[#8CC63F] text-slate-950 font-bold uppercase tracking-wider text-xs text-center py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs">
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
                      <span>Tes Kompetensi Telah Selesai</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!kompetensiApproved || startingExam}
                      onClick={onStartCompetencyExam}
                      className={`w-full font-bold uppercase tracking-wider text-xs py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        kompetensiApproved
                          ? 'bg-[#8CC63F] hover:bg-[#7BB335] hover:scale-[1.01] active:scale-[0.99] text-slate-950 shadow-sm cursor-pointer animate-pulse-glow'
                          : 'bg-slate-200/80 text-slate-600 border border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {!kompetensiApproved && !startingExam && (
                        <svg
                          className="w-4 h-4 text-slate-500 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                      <span>
                        {startingExam
                          ? 'Menyiapkan Soal & Timer 60 Menit...'
                          : kompetensiApproved
                            ? 'Mulai Ujian Sekarang (60 Menit)'
                            : 'Menunggu Approve Admin Ruangan...'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* KARTU 2: TES WAWANCARA */}
              <div
                className={`rounded-2xl border-2 overflow-hidden flex flex-col justify-between transition-all shadow-md ${
                  wawancaraApproved
                    ? 'bg-white border-[#8CC63F]/60'
                    : 'bg-white border-slate-300'
                }`}
              >
                <div>
                  {/* Garis Aksen Atas Kartu 2 */}
                  <div
                    className={`h-2 w-full ${
                      wawancaraApproved ? 'bg-[#8CC63F]' : 'bg-[#F7941D]'
                    }`}
                  />

                  {/* Baris Header Kartu 2 */}
                  <div
                    className={`flex items-center justify-between gap-2 px-6 py-3.5 border-b ${
                      wawancaraApproved
                        ? 'bg-[#F4FCEB] border-[#D9F99D]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          wawancaraApproved ? 'bg-[#8CC63F]' : 'bg-[#F7941D]'
                        }`}
                      />
                      Tahap 2 • Wawancara
                    </span>
                    {wawancaraApproved ? (
                      <span className="bg-[#8CC63F] text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs animate-pop-in">
                        Sudah Di-Approve
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-[#F7941D] text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-50" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
                        </span>
                        Belum Wawancara
                      </span>
                    )}
                  </div>

                  {/* Isi Kartu 2 */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <span className="w-12 h-12 rounded-2xl bg-[#F7941D] text-slate-950 flex items-center justify-center shadow-sm shrink-0">
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                      </span>
                      <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                          Tes Wawancara
                        </h2>
                        <p className="text-xs font-semibold text-[#D97706] mt-0.5">
                          Verifikasi Tatap Muka Pewawancara
                        </p>
                      </div>
                    </div>

                    {wawancaraApproved ? (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Admin telah meng-approve bahwa Anda telah menyelesaikan <strong className="font-semibold text-slate-800">Tes Wawancara</strong> (<strong className="font-semibold text-slate-800">{statusWawancara || 'SUDAH WAWANCARA'}</strong>). Anda tidak dapat mengikuti sesi wawancara kembali.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Nama Anda telah terdaftar pada panel Monitoring Wawancara Admin. Setelah Anda melaksanakan sesi wawancara, Admin akan melakukan <strong className="font-semibold text-slate-800">Approve Wawancara</strong> pada sistem.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Aksi Kartu 2 */}
                <div className="px-6 pb-6 pt-2">
                  {wawancaraApproved ? (
                    <div className="w-full bg-[#8CC63F] text-slate-950 font-bold uppercase tracking-wider text-xs text-center py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs">
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
                      <span>Wawancara Selesai &amp; Terverifikasi</span>
                    </div>
                  ) : (
                    <div className="w-full bg-[#F7941D]/15 border border-[#F7941D]/45 text-amber-950 font-bold text-xs text-center py-3.5 px-4 rounded-xl flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4 text-[#D97706] shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Silakan Mengikuti Wawancara &amp; Tunggu Approve Admin</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Box Aktivasi Notifikasi di Lobby bagi peserta yang sudah selesai ujian kompetensi */}
            {kompetensiSelesai && !hasKelulusanValue && (
              <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#00AEEF]/15 text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs md:text-sm font-extrabold text-slate-900">
                      Notifikasi Pengumuman Kelulusan Akhir
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                      Aktifkan izin notifikasi browser agar Anda langsung mendapatkan pemberitahuan saat pengumuman kelulusan telah tersedia.
                    </p>
                  </div>
                </div>

                {notifPermission === 'granted' && isNotifSubscribed ? (
                  <div className="w-full bg-[#8CC63F]/20 border border-[#8CC63F]/40 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#3F6212] animate-pop-in">
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
                    </svg>
                    <span>Notifikasi Update Kelulusan Sudah Aktif</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotificationPermission}
                    className="w-full bg-[#00AEEF] hover:bg-[#0099D6] text-white font-bold uppercase tracking-wider text-xs py-3 px-4 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span>Aktifkan Notifikasi Update Kelulusan</span>
                  </button>
                )}

                {notifFeedback && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800">
                    {notifFeedback}
                  </div>
                )}
              </div>
            )}

            {/* Footer Bawah Kartu Lobby */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-slate-500 font-medium">
                Bukan akun Anda atau ingin berganti peserta pada perangkat ini?
              </p>
              <button
                type="button"
                onClick={onLogoutIdentity}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-200 font-bold uppercase tracking-wider text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Keluar / Ganti Email Peserta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* POP-UP OTOMATIS SAAT SELURUH TAHAP SELEKSI SELESAI / HASIL KELULUSAN  */}
      {/* ===================================================================== */}
      {hasAcceptedTerms && (bothCompleted || hasKelulusanValue) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto">
            {/* Top Strip 3 Warna BPS */}
            <div className="grid grid-cols-3 h-1.5 w-full overflow-hidden">
              <div className="bg-[#00AEEF]" />
              <div className="bg-[#8CC63F]" />
              <div className="bg-[#F7941D]" />
            </div>

            {/* Header Pop-up */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                {hasKelulusanValue
                  ? 'Pengumuman Hasil Akhir Seleksi'
                  : 'Seluruh Tahapan Seleksi Selesai'}
              </h3>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full ${
                  hasKelulusanValue
                    ? isLulus
                      ? 'bg-[#8CC63F] text-slate-950'
                      : 'bg-[#F7941D]/20 text-[#B45309]'
                    : 'bg-[#00AEEF]/12 text-[#0284C7]'
                }`}
              >
                {hasKelulusanValue ? rawKelulusan.toUpperCase() : 'Selesai 2 Tahap'}
              </span>
            </div>

            {/* Isi Pop-up */}
            <div className="p-6 space-y-4">
              {/* Identitas Ringkas di dalam Pop-up */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Peserta Seleksi MagangHub BPS Soppeng
                  </p>
                  <p className="text-base font-bold text-slate-900 truncate">{namaPeserta}</p>
                  <span className="inline-block mt-1 bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/25 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                    {posisiDilamar}
                  </span>
                </div>
              </div>

              {hasKelulusanValue ? (
                isLulus ? (
                  <div className="bg-[#F4FCEB] border border-[#D9F99D] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#8CC63F] text-slate-950 flex items-center justify-center shadow-xs shrink-0">
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">
                          Selamat! Anda Dinyatakan LULUS
                        </h3>
                        <p className="text-xs text-[#3F6212] font-medium mt-0.5">
                          Keputusan Panitia: {rawKelulusan.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-slate-800 leading-relaxed">
                      Selamat kepada Saudara/i <strong className="font-semibold text-slate-900">{namaPeserta}</strong>! Berdasarkan hasil penilaian <strong className="font-semibold text-slate-900">Tes Seleksi Kompetensi</strong> dan <strong className="font-semibold text-slate-900">Tes Wawancara</strong>, Anda dinyatakan <strong className="font-semibold text-slate-900">LULUS ({rawKelulusan})</strong> pada Seleksi MagangHub BPS Kabupaten Soppeng Batch III Angkatan 2 Tahun 2026.
                    </p>

                    {/* Langkah Tindak Lanjut Melengkapi MagangHub Peserta Lulus */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00AEEF] shrink-0" />
                        <span>Langkah Selanjutnya Lengkapi MagangHub Anda:</span>
                      </p>
                      <ol className="text-xs text-slate-700 list-decimal list-inside space-y-1.5 leading-relaxed">
                        <li>
                          Masuk ke akun <strong className="font-semibold text-slate-900">MagangHub</strong> yang Anda miliki.
                        </li>
                        <li>
                          Lengkapi seluruh <strong className="font-semibold text-slate-900">data administrasi, berkas, dan instrumen MagangHub</strong> yang diwajibkan pada sistem.
                        </li>
                        <li>
                          Pastikan seluruh kelengkapan MagangHub Anda telah terisi dengan benar dan lakukan konfirmasi kepada <strong className="font-semibold text-slate-900">Panitia Pelaksana BPS Kabupaten Soppeng</strong>.
                        </li>
                      </ol>
                    </div>
                  </div>
                ) : isTidakLulus ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#F7941D] text-slate-950 flex items-center justify-center shadow-xs shrink-0">
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" x2="12" y1="8" y2="12" />
                          <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">
                          Pemberitahuan Hasil Akhir Seleksi
                        </h3>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">
                          Status: {rawKelulusan.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                      Terima kasih atas partisipasi dan dedikasi Saudara/i <strong className="font-semibold text-slate-900">{namaPeserta}</strong> dalam mengikuti seluruh rangkaian Seleksi MagangHub BPS Kabupaten Soppeng Batch III. Berdasarkan hasil akhir penilaian, Anda dinyatakan <strong className="font-semibold text-slate-900">{rawKelulusan}</strong> pada periode seleksi kali ini. Tetap semangat dan sukses selalu untuk kesempatan berikutnya!
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-2xl p-5 space-y-2">
                    <span className="inline-block bg-[#00AEEF] text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                      Status Akhir: {rawKelulusan.toUpperCase()}
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-slate-900">
                      Informasi Hasil Akhir: {rawKelulusan}
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Status hasil akhir seleksi Anda telah diperbarui oleh Panitia Pelaksana pada sistem Monitoring Peserta.
                    </p>
                  </div>
                )
              ) : (
                <>
                  {/* Banner Seluruh Tahapan Seleksi Telah Selesai */}
                  <div className="bg-[#F4FCEB] border border-[#D9F99D] rounded-2xl p-4 flex items-start gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#8CC63F] text-slate-950 inline-flex items-center justify-center shrink-0 mt-0.5">
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
                      <p className="text-sm font-bold text-slate-900 mb-0.5">
                        Selamat! Seluruh Tahapan Seleksi Telah Selesai
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Anda tercatat telah menyelesaikan <strong className="font-semibold text-slate-900">Tes Seleksi Kompetensi</strong> dan telah di-approve mengikuti <strong className="font-semibold text-slate-900">Tes Wawancara</strong>. Terima kasih atas partisipasi Anda pada Seleksi MagangHub BPS Kab. Soppeng Batch III!
                      </p>
                    </div>
                  </div>

                  {/* Box Menunggu Pengumuman & Izin Notifikasi */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#00AEEF]/15 text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs md:text-sm font-bold text-slate-900">
                          Menunggu Informasi Pengumuman Kelulusan
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                          Saat ini hasil akhir kelulusan Anda masih dalam proses rekapitulasi oleh Panitia. Silakan <strong className="font-semibold text-slate-800">aktifkan izin notifikasi</strong> di bawah ini agar Anda mendapatkan pemberitahuan saat pengumuman kelulusan telah tersedia.
                        </p>
                      </div>
                    </div>

                    {notifPermission === 'granted' && isNotifSubscribed ? (
                      <div className="w-full bg-[#8CC63F]/20 border border-[#8CC63F]/40 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3F6212] animate-pop-in">
                        <svg
                          className="w-4 h-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
                        </svg>
                        <span>Notifikasi Update Kelulusan Sudah Aktif</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestNotificationPermission}
                        className="w-full bg-[#00AEEF] hover:bg-[#0099D6] text-white font-bold uppercase tracking-wider text-xs py-3.5 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <svg
                          className="w-4 h-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span>Aktifkan Notifikasi Update Kelulusan</span>
                      </button>
                    )}

                    {notifFeedback && (
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800">
                        {notifFeedback}
                      </div>
                    )}

                    {/* Informasi Cara Mengecek Pengumuman Kelulusan Nanti via Login Email */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#F7941D]/15 text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </span>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        <strong className="font-semibold text-slate-900">Cara Mengecek Pengumuman Kelulusan:</strong> Untuk melihat hasil kelulusan nantinya, silakan masuk kembali ke website ini dan pilih tombol <strong className="font-semibold text-slate-900">&quot;Masuk dengan Email&quot;</strong> di halaman utama menggunakan email Anda (<strong className="font-semibold text-slate-900">{emailPeserta}</strong>).
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Tombol Keluar / Selesai */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onLogoutIdentity}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold uppercase tracking-wider text-xs py-3 px-4 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Selesai &amp; Keluar ke Halaman Utama
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-2 space-y-1 z-10">
        <p className="text-xs font-medium text-slate-500">
          Sistem Ujian Seleksi MagangHub Batch III Angkatan 2 Tahun 2026
        </p>
        <p className="text-[11px] text-slate-400">
          Developed by{' '}
          <a
            href="https://alviansyah.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 font-semibold underline decoration-[#00AEEF] hover:text-[#0284C7] transition-colors"
          >
            Alviansyah
          </a>
        </p>
      </footer>
    </main>
  );
}
