'use client';

import React, { useState } from 'react';

interface QuickLoginResult {
  found: boolean;
  isProfileComplete: boolean;
  redirectUrl?: string;
}

interface LoginViewProps {
  namaPeserta: string;
  setNamaPeserta: (val: string) => void;
  emailPeserta: string;
  setEmailPeserta: (val: string) => void;
  teleponPeserta: string;
  setTeleponPeserta: (val: string) => void;
  posisiDilamar: string;
  setPosisiDilamar: (val: string) => void;
  alamatPeserta: string;
  setAlamatPeserta: (val: string) => void;
  loginError: string;
  setLoginError: (val: string) => void;
  registering: boolean;
  onConfirmRegister: () => Promise<boolean>;
  onQuickLogin?: (email: string) => Promise<QuickLoginResult>;
  onNavigate?: (url: string) => void;
  onCompleteTerms: () => void;
}

export default function LoginView({
  namaPeserta,
  setNamaPeserta,
  emailPeserta,
  setEmailPeserta,
  teleponPeserta,
  setTeleponPeserta,
  posisiDilamar,
  setPosisiDilamar,
  alamatPeserta,
  setAlamatPeserta,
  loginError,
  setLoginError,
  registering,
  onConfirmRegister,
  onQuickLogin,
  onNavigate,
  onCompleteTerms,
}: LoginViewProps) {
  // Satu Pintu Login: Default diawali di 'QUICK_LOGIN' (Cek Email Terlebih Dahulu).
  // Setelah email terverifikasi & belum pernah isi biodata, otomatis slide ke 'REGISTER'.
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'QUICK_LOGIN'>('QUICK_LOGIN');
  const [quickLoginEmail, setQuickLoginEmail] = useState('');
  const [emailVerifiedState, setEmailVerifiedState] = useState<
    'IDLE' | 'VERIFIED_INCOMPLETE' | 'VERIFIED_COMPLETE'
  >('IDLE');

  // Pop-up 1: Pemberitahuan Konfirmasi Simpan Data Kehadiran
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);
  // Pop-up 2: Alur & Ketentuan Ujian (Muncul SETELAH data kehadiran berhasil disimpan)
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);

  const handleOpenConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!namaPeserta.trim() || !emailPeserta.trim() || !teleponPeserta.trim() || !alamatPeserta.trim()) {
      setLoginError('Mohon lengkapi seluruh data diri Anda termasuk nomor telepon/WhatsApp!');
      return;
    }

    if (!posisiDilamar.trim()) {
      setLoginError('Mohon pilih Posisi yang Anda lamar terlebih dahulu!');
      return;
    }

    setShowConfirmSaveModal(true);
  };

  const handleQuickLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailVerifiedState !== 'IDLE') return;
    setLoginError('');

    const trimmedEmail = quickLoginEmail.trim();
    if (!trimmedEmail) {
      setLoginError('Silakan masukkan alamat email Anda yang terdaftar di MagangHub.');
      return;
    }

    if (onQuickLogin) {
      const result = await onQuickLogin(trimmedEmail);
      if (result.found) {
        if (result.isProfileComplete) {
          setEmailVerifiedState('VERIFIED_COMPLETE');
          setTimeout(() => {
            if (onNavigate) {
              onNavigate(result.redirectUrl || '/lobby');
            }
          }, 1600);
        } else {
          setEmailVerifiedState('VERIFIED_INCOMPLETE');
          setTimeout(() => {
            setActiveTab('REGISTER');
            setEmailVerifiedState('IDLE');
          }, 1600);
        }
      }
    }
  };

  const handleExecuteSaveData = async () => {
    const ok = await onConfirmRegister();
    if (ok) {
      setShowConfirmSaveModal(false);
      setShowTermsModal(true);
    } else {
      setShowConfirmSaveModal(false);
    }
  };

  const isQuickLogin = activeTab === 'QUICK_LOGIN';
  const isVerifiedSuccess = emailVerifiedState !== 'IDLE';

  return (
    <main className="min-h-screen bg-slate-100/80 flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Ambient Background Glow Halus */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 bg-[#00AEEF]/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-80 h-80 bg-[#F7941D]/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 left-1/3 w-96 h-96 bg-[#8CC63F]/10 rounded-full blur-3xl" />

      {/* ===================================================================== */}
      {/* POP-UP 1: PEMBERITAHUAN UNTUK MENYIMPAN DATA YANG TELAH DI-INPUT       */}
      {/* ===================================================================== */}
      {showConfirmSaveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto animate-modal-pop">
            {/* Top Strip 3 Warna BPS */}
            <div className="grid grid-cols-3 h-1.5 w-full overflow-hidden">
              <div className="bg-[#00AEEF]" />
              <div className="bg-[#8CC63F]" />
              <div className="bg-[#F7941D]" />
            </div>

            {/* Header Pemberitahuan */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#F7941D]/15 text-[#D97706] flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Konfirmasi Data Kehadiran
                </h3>
              </div>
              <span className="bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/25 rounded-full text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5">
                Verifikasi
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <p className="text-xs font-semibold text-amber-900 mb-0.5">
                  Periksa Kembali Data Diri Anda
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Data berikut akan disimpan ke dalam sistem <strong>Daftar Hadir Peserta Seleksi</strong>. Pastikan penulisan email dan formasi sudah benar:
                </p>
              </div>

              {/* Ringkasan Data yang Di-input */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Nama Lengkap Peserta
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {namaPeserta.trim()}
                  </span>
                </div>

                <div className="border-t border-slate-200/80 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Email Aktif
                    </span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {emailPeserta.trim()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                      No. Telepon / WhatsApp
                    </span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {teleponPeserta.trim()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                    Formasi Posisi yang Dilamar
                  </span>
                  <span className="inline-block bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/25 font-semibold px-3 py-1 rounded-full text-xs">
                    {posisiDilamar}
                  </span>
                </div>

                <div className="border-t border-slate-200/80 pt-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Alamat Domisili
                  </span>
                  <span className="font-medium text-slate-700 block mt-0.5 leading-relaxed">
                    {alamatPeserta.trim()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={registering}
                  onClick={() => setShowConfirmSaveModal(false)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm py-2.5 px-4 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  disabled={registering}
                  onClick={handleExecuteSaveData}
                  className="flex-1 bg-[#8CC63F] hover:bg-[#7BB335] text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {registering ? 'Menyimpan Data...' : 'Ya, Simpan Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* POP-UP 2: ALUR & KETENTUAN UJIAN (MUNCUL SETELAH DAFTAR HADIR TERSIMPAN) */}
      {/* ===================================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-modal-pop">
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
              <span className="bg-[#8CC63F]/20 text-[#3F6212] border border-[#8CC63F]/40 rounded-full text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5">
                Data Tersimpan
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
                  Data kehadiran atas nama <strong className="font-semibold text-slate-900">{namaPeserta}</strong> telah berhasil disimpan di sistem <strong className="font-semibold text-slate-900">Monitoring Peserta</strong>.
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
                    Harap baca alur seleksi 2 tahap &amp; ketentuan pengerjaan berikut.
                  </p>
                </div>
              </div>

              {/* Daftar Alur & Ketentuan (Scrollable dengan Header Sticky) */}
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

              {/* Tombol Lanjutkan ke Halaman Status / Lobby Peserta */}
              <button
                type="button"
                disabled={!isCheckboxChecked}
                onClick={onCompleteTerms}
                className="w-full bg-[#8CC63F] hover:bg-[#7BB335] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-slate-950 font-semibold text-sm py-3.5 px-6 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
              >
                {isCheckboxChecked
                  ? 'Setuju & Lihat Status Seleksi Saya'
                  : 'Centang Persetujuan Terlebih Dahulu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div />

      {/* ===================================================================== */}
      {/* KARTU UTAMA SLIDING SPLIT-PANEL (SEPERTI REFERENSI GAMBAR)            */}
      {/* ===================================================================== */}
      <div className="max-w-4xl w-full mx-auto my-auto z-10 py-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-900/8 overflow-hidden relative">
          {/* Top Strip 3 Warna BPS */}
          <div className="grid grid-cols-3 h-1.5 w-full overflow-hidden relative z-30">
            <div className="bg-[#00AEEF]" />
            <div className="bg-[#8CC63F]" />
            <div className="bg-[#F7941D]" />
          </div>

          {/* ================================================================= */}
          {/* CONTAINER UTAMA 2 KOLOM DENGAN SLIDING OVERLAY DI DESKTOP (md+)   */}
          {/* ================================================================= */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 min-h-[560px]">
            {/* --------------------------------------------------------------- */}
            {/* KOLOM KIRI: SATU PINTU VERIFIKASI EMAIL (TERBUKA SAAT DEFAULT)  */}
            {/* --------------------------------------------------------------- */}
            <div
              className={`p-6 sm:p-8 md:p-10 flex flex-col justify-center transition-all duration-500 ${isQuickLogin
                ? 'opacity-100 translate-x-0 z-10 block'
                : 'opacity-0 md:-translate-x-6 pointer-events-none hidden md:flex'
                }`}
            >
              <div className="max-w-sm mx-auto w-full">
                {/* Header Form Masuk / Ceklis Bulat Saat Terverifikasi */}
                <div className="text-center mb-6">
                  {isVerifiedSuccess ? (
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-3.5">
                      <span className="absolute inset-0 rounded-full bg-[#8CC63F]/60 animate-ripple-ring" />
                      <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#8CC63F] text-slate-950 shadow-lg shadow-[#8CC63F]/30 ring-4 ring-[#8CC63F]/25 animate-pop-in">
                        <svg
                          className="w-8 h-8"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#00AEEF]/12 text-[#0284C7] mb-3 transition-transform duration-300 hover:scale-105">
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {isVerifiedSuccess ? 'Email Terdaftar!' : 'Masuk Seleksi'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {isVerifiedSuccess
                      ? 'Anda terdaftar dalam panggilan mengikuti Ujian Seleksi MagangHub BPS Kab. Soppeng.'
                      : 'Masukkan alamat email yang Anda daftarkan pada MagangHub untuk verifikasi panggilan seleksi'}
                  </p>
                </div>

                {/* Banner Sukses Ceklis Saat Email Ditemukan di Database */}
                {isVerifiedSuccess && (
                  <div className="bg-[#F4FCEB] border-2 border-[#8CC63F] text-slate-800 rounded-2xl p-3.5 mb-4 flex items-center gap-3 text-xs shadow-xs animate-modal-pop">
                    <span className="w-7 h-7 rounded-full bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div className="leading-relaxed">
                      <p className="font-bold text-slate-900">
                        {posisiDilamar
                          ? `Email terdaftar di posisi ${posisiDilamar}`
                          : 'Panggilan Seleksi Terkonfirmasi'}
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {emailVerifiedState === 'VERIFIED_COMPLETE'
                          ? 'Data diri sudah lengkap. Mengarahkan Anda ke halaman Lobby...'
                          : 'Silakan lengkapi data diri Anda...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Alert di Kolom Kiri (Dengan Animasi Shake) */}
                {loginError && isQuickLogin && !isVerifiedSuccess && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs animate-shake">
                    <svg
                      className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
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
                    <span className="leading-relaxed font-medium">{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleQuickLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Peserta MagangHub
                    </label>
                    <div className={`relative ${loginError && isQuickLogin && !isVerifiedSuccess ? 'animate-shake' : ''}`}>
                      <input
                        type="email"
                        required
                        disabled={registering || isVerifiedSuccess}
                        value={quickLoginEmail}
                        onChange={(e) => {
                          setQuickLoginEmail(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="Masukkan email Anda..."
                        className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                          isVerifiedSuccess
                            ? 'bg-[#F4FCEB] border-2 border-[#8CC63F] pr-11 font-bold'
                            : loginError && isQuickLogin
                              ? 'bg-red-50/50 border-2 border-red-300 focus:bg-white focus:border-[#00AEEF]'
                              : 'bg-slate-100/80 border border-slate-200/90 focus:bg-white focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15'
                        }`}
                      />
                      {isVerifiedSuccess && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#8CC63F] text-slate-950 flex items-center justify-center shadow-2xs animate-pop-in">
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline className="animate-draw-check" points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={registering || isVerifiedSuccess}
                      className={`w-full font-bold uppercase tracking-wider text-xs py-3.5 px-6 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2.5 ${isVerifiedSuccess
                        ? 'bg-[#8CC63F] text-slate-950 cursor-default'
                        : 'bg-[#00AEEF] hover:bg-[#0099D6] disabled:opacity-60 text-white cursor-pointer hover:shadow'
                        }`}
                    >
                      {(registering || isVerifiedSuccess) && (
                        <svg
                          className="w-4 h-4 animate-spin shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      )}
                      <span>
                        {isVerifiedSuccess
                          ? emailVerifiedState === 'VERIFIED_COMPLETE'
                            ? 'Terverifikasi • Masuk ke Lobby...'
                            : 'Terverifikasi • Membuka Daftar Hadir...'
                          : registering
                            ? 'Memeriksa Email...'
                            : 'Cek & Masuk Seleksi'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* --------------------------------------------------------------- */}
            {/* KOLOM KANAN: FORM KELENGKAPAN DATA DIRI (SETELAH EMAIL LOLOS)   */}
            {/* --------------------------------------------------------------- */}
            <div
              className={`p-6 sm:p-8 md:p-10 flex flex-col justify-center transition-all duration-500 ${!isQuickLogin
                ? 'opacity-100 translate-x-0 z-10 block'
                : 'opacity-0 md:translate-x-6 pointer-events-none hidden md:flex'
                }`}
            >
              <div className="max-w-md mx-auto w-full">
                {/* Header Form Daftar Hadir */}
                <div className="text-center mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-[#8CC63F]/20 text-[#3F6212] border border-[#8CC63F]/40 rounded-full text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 mb-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#8CC63F] text-slate-950 inline-flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Email Terdaftar • Lengkapi Biodata
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Isi Absensi Kehadiran
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {posisiDilamar ? (
                      <>
                        Email terdaftar di posisi{' '}
                        <strong className="font-bold text-[#0284C7]">{posisiDilamar}</strong>, silakan lengkapi data diri Anda
                      </>
                    ) : (
                      'Lengkapi data diri Anda sebelum memulai tahapan seleksi'
                    )}
                  </p>
                </div>

                {/* Error Alert di Kolom Kanan */}
                {loginError && !isQuickLogin && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs animate-shake">
                    <svg
                      className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
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
                    <span className="leading-relaxed font-medium">{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleOpenConfirmSave} className="space-y-3.5">
                  <div>
                    <input
                      type="text"
                      required
                      value={namaPeserta}
                      onChange={(e) => setNamaPeserta(e.target.value)}
                      placeholder="Nama Lengkap Peserta"
                      className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/90 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="email"
                        required
                        readOnly
                        value={emailPeserta}
                        title="Email yang telah diverifikasi"
                        className="w-full px-4 py-2.5 pr-9 bg-slate-200/70 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#8CC63F] text-slate-950 flex items-center justify-center">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    </div>
                    <div>
                      <input
                        type="tel"
                        required
                        value={teleponPeserta}
                        onChange={(e) => setTeleponPeserta(e.target.value)}
                        placeholder="No. Telepon / WA"
                        className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/90 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      readOnly
                      value={posisiDilamar}
                      placeholder="Posisi yang Dilamar (Otomatis dari Database)"
                      title="Posisi yang dilamar sesuai data pendaftaran MagangHub"
                      className="w-full px-4 py-2.5 pr-9 bg-slate-200/70 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed focus:outline-none"
                    />
                    {posisiDilamar && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#8CC63F] text-slate-950 flex items-center justify-center">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div>
                    <textarea
                      required
                      rows={2}
                      value={alamatPeserta}
                      onChange={(e) => setAlamatPeserta(e.target.value)}
                      placeholder="Alamat Domisili Lengkap"
                      className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/90 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15 transition-all"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={registering}
                      className="w-full bg-[#F7941D] hover:bg-[#E08312] disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider text-xs py-3.5 px-6 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                    >
                      {registering ? 'Menyimpan...' : 'Simpan Daftar Hadir'}
                    </button>
                  </div>
                </form>

                {/* Tombol Ganti Email untuk Layar Mobile */}
                <div className="mt-5 pt-4 border-t border-slate-100 text-center md:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('QUICK_LOGIN');
                      setEmailVerifiedState('IDLE');
                      setLoginError('');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Ganti Email Lain
                  </button>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* SLIDING SOLID PANEL OVERLAY (BERGESER KIRI <-> KANAN)            */}
            {/* =============================================================== */}
            <div
              className={`hidden md:flex flex-col justify-center items-center text-center p-10 absolute top-0 bottom-0 left-0 w-1/2 z-20 transition-all duration-700 ease-in-out overflow-hidden ${isQuickLogin
                ? 'translate-x-full bg-[#00AEEF] text-white rounded-l-[36px]'
                : 'translate-x-0 bg-[#8CC63F] text-slate-950 rounded-r-[36px]'
                }`}
            >
              {/* Lingkaran Dekoratif Halus di Dalam Panel Warna */}
              <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-20 -right-16 w-56 h-56 rounded-full bg-white/10" />

              {/* Logo BPS di Atas Panel Sliding */}
              <div className="w-16 h-16 bg-white rounded-2xl p-2.5 shadow-md flex items-center justify-center mb-5 relative z-10">
                <img
                  src="/BPSIndonesia.svg"
                  alt="Logo BPS Indonesia"
                  className="w-full h-full object-contain"
                />
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 relative z-10 ${isQuickLogin
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-950/12 text-slate-950'
                  }`}
              >
                BPS Kab. Soppeng • Batch III
              </span>

              {isQuickLogin ? (
                /* Konten Panel Saat Berada di Kanan (Tahap 1: Verifikasi Email Satu Pintu) */
                <div className="max-w-xs space-y-3 relative z-10">
                  <h2 className="text-2xl font-bold tracking-tight leading-snug text-white">
                    Verifikasi Email MagangHub Anda
                  </h2>
                  <p className="text-xs leading-relaxed text-white/90 font-medium">
                    Hanya email peserta yang terdaftar pada panggilan seleksi BPS Kab. Soppeng yang dapat mengakses sistem daftar hadir dan ruang ujian.
                  </p>
                </div>
              ) : (
                /* Konten Panel Saat Bergeser ke Kiri (Tahap 2: Melengkapi Biodata Daftar Hadir) */
                <div className="max-w-xs space-y-3 relative z-10">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white text-[#3F6212] shadow-sm mb-1">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight leading-snug text-slate-950">
                    Anda Terdaftar Mengikuti Seleksi!
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-900/85 font-medium">
                    {posisiDilamar ? (
                      <>
                        Email terdaftar di posisi <strong className="font-bold underline">{posisiDilamar}</strong>. Silakan lengkapi Nama Lengkap, Nomor WhatsApp, serta Alamat Domisili Anda pada formulir di samping.
                      </>
                    ) : (
                      'Silakan lengkapi Nama Lengkap, Nomor WhatsApp, serta Alamat Domisili Anda pada formulir di samping.'
                    )}
                  </p>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('QUICK_LOGIN');
                        setEmailVerifiedState('IDLE');
                        setLoginError('');
                      }}
                      className="px-6 py-2.5 rounded-xl border-2 border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                    >
                      Ganti Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
