'use client';

import React, { useState } from 'react';
import { POSISI_OPTIONS } from '@/constants/exam';

interface LoginViewProps {
  namaPeserta: string;
  setNamaPeserta: (val: string) => void;
  emailPeserta: string;
  setEmailPeserta: (val: string) => void;
  posisiDilamar: string;
  setPosisiDilamar: (val: string) => void;
  alamatPeserta: string;
  setAlamatPeserta: (val: string) => void;
  loginError: string;
  setLoginError: (val: string) => void;
  registering: boolean;
  onConfirmRegister: () => Promise<boolean>;
  onCompleteTerms: () => void;
}

export default function LoginView({
  namaPeserta,
  setNamaPeserta,
  emailPeserta,
  setEmailPeserta,
  posisiDilamar,
  setPosisiDilamar,
  alamatPeserta,
  setAlamatPeserta,
  loginError,
  setLoginError,
  registering,
  onConfirmRegister,
  onCompleteTerms,
}: LoginViewProps) {
  // Pop-up 1: Pemberitahuan Konfirmasi Simpan Data Kehadiran
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);
  // Pop-up 2: Alur & Ketentuan Ujian (Muncul SETELAH data kehadiran berhasil disimpan)
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);

  const handleOpenConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!namaPeserta.trim() || !emailPeserta.trim() || !alamatPeserta.trim()) {
      setLoginError('Mohon lengkapi seluruh data diri Anda terlebih dahulu!');
      return;
    }

    setShowConfirmSaveModal(true);
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

  return (
    <main className="min-h-screen bg-[#FFFDF7] flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
      {/* ===================================================================== */}
      {/* POP-UP 1: PEMBERITAHUAN UNTUK MENYIMPAN DATA YANG TELAH DI-INPUT       */}
      {/* ===================================================================== */}
      {showConfirmSaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] border-4 border-slate-950 max-w-md w-full shadow-[12px_12px_0px_0px_#F7941D] overflow-hidden my-auto">
            {/* Top Bar BPS */}
            <div className="grid grid-cols-3 h-3 border-b-3 border-slate-950">
              <div className="bg-[#00AEEF] border-r-3 border-slate-950" />
              <div className="bg-[#8CC63F] border-r-3 border-slate-950" />
              <div className="bg-[#F7941D]" />
            </div>

            {/* Header Pemberitahuan */}
            <div className="bg-slate-950 text-white px-5 py-3.5 border-b-4 border-slate-950 flex items-center justify-between">
              <span className="font-black uppercase tracking-wider text-xs md:text-sm">
                Pemberitahuan Simpan Data
              </span>
              <span className="bg-[#00AEEF] text-slate-950 text-[11px] font-black px-2 py-0.5 border border-white">
                KONFIRMASI HADIR
              </span>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="bg-[#FFF5E6] border-3 border-slate-950 p-3.5 shadow-[4px_4px_0px_0px_#0f172a]">
                <p className="text-xs font-black uppercase text-slate-950 mb-1">
                  📋 Periksa Kembali Data Kehadiran Anda
                </p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">
                  Data yang Anda inputkan akan disimpan ke dalam <strong>Daftar Hadir Peserta Seleksi</strong>. Pastikan seluruh informasi berikut sudah benar:
                </p>
              </div>

              {/* Ringkasan Data yang Di-input */}
              <div className="bg-white border-3 border-slate-950 p-4 shadow-[4px_4px_0px_0px_#0f172a] space-y-2.5 text-xs">
                <div>
                  <span className="font-black uppercase text-slate-500 block text-[10px]">
                    Nama Lengkap Peserta
                  </span>
                  <span className="font-black text-slate-950 text-sm">
                    {namaPeserta.trim()}
                  </span>
                </div>
                <div className="border-t-2 border-dashed border-slate-200 pt-2">
                  <span className="font-black uppercase text-slate-500 block text-[10px]">
                    Email Aktif
                  </span>
                  <span className="font-bold text-slate-900">
                    {emailPeserta.trim()}
                  </span>
                </div>
                <div className="border-t-2 border-dashed border-slate-200 pt-2">
                  <span className="font-black uppercase text-slate-500 block text-[10px]">
                    Formasi Posisi yang Dilamar
                  </span>
                  <span className="inline-block mt-0.5 bg-[#00AEEF] text-slate-950 font-black px-2 py-0.5 border-2 border-slate-950">
                    {posisiDilamar}
                  </span>
                </div>
                <div className="border-t-2 border-dashed border-slate-200 pt-2">
                  <span className="font-black uppercase text-slate-500 block text-[10px]">
                    Alamat Domisili
                  </span>
                  <span className="font-bold text-slate-800 block">
                    {alamatPeserta.trim()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  disabled={registering}
                  onClick={() => setShowConfirmSaveModal(false)}
                  className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider text-xs py-3 px-4 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] transition cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  disabled={registering}
                  onClick={handleExecuteSaveData}
                  className="flex-1 bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-60 text-slate-950 font-black uppercase tracking-wider text-xs py-3 px-4 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] transition cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-950/80 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] border-4 border-slate-950 max-w-lg w-full max-h-[90vh] flex flex-col shadow-[12px_12px_0px_0px_#00AEEF] overflow-hidden my-auto">
            {/* Top Bar BPS */}
            <div className="grid grid-cols-3 h-3 border-b-3 border-slate-950 shrink-0">
              <div className="bg-[#00AEEF] border-r-3 border-slate-950" />
              <div className="bg-[#8CC63F] border-r-3 border-slate-950" />
              <div className="bg-[#F7941D]" />
            </div>

            {/* Header Modal */}
            <div className="bg-slate-950 text-white px-5 md:px-6 py-3.5 border-b-4 border-slate-950 flex items-center justify-between shrink-0">
              <span className="font-black uppercase tracking-wider text-xs md:text-sm">
                Alur &amp; Ketentuan Seleksi
              </span>
              <span className="bg-[#8CC63F] text-slate-950 text-xs font-black px-2 py-0.5 border border-white">
                DATA TERSIMPAN
              </span>
            </div>

            {/* Area Isi Pop-up yang Dapat Di-scroll */}
            <div className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Banner Pemberitahuan Data Berhasil Disimpan */}
              <div className="bg-[#8CC63F]/25 border-3 border-slate-950 p-3 shadow-[3px_3px_0px_0px_#0f172a] flex items-center gap-3">
                <span className="bg-[#8CC63F] border-2 border-slate-950 w-7 h-7 flex items-center justify-center font-black text-slate-950 shrink-0">
                  ✓
                </span>
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  Data kehadiran atas nama <strong>{namaPeserta}</strong> telah berhasil disimpan di sistem <strong>Monitoring Peserta</strong>.
                </p>
              </div>

              {/* Identitas BPS */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-white border-3 border-slate-950 p-2 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-black text-slate-950 text-base md:text-lg uppercase leading-tight">
                    Seleksi MagangHub BPS Kab. Soppeng
                  </h2>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    Harap baca alur seleksi 2 tahap &amp; ketentuan pengerjaan berikut.
                  </p>
                </div>
              </div>

              {/* Daftar Alur & Ketentuan (Scrollable dengan Header Blur Sticky) */}
              <div className="bg-[#FFF5E6] border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] max-h-60 overflow-y-auto">
                <div className="sticky top-0 z-10 bg-[#FFF5E6]/75 backdrop-blur-md px-4 pt-3.5 pb-2 border-b-2 border-slate-950/15">
                  <p className="text-xs font-black uppercase text-slate-950 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 bg-[#F7941D] border border-slate-950 shrink-0" />
                    Alur dan Ketentuan Pelaksanaan Seleksi
                  </p>
                </div>
                <ol className="px-4 py-3 text-xs md:text-sm font-bold text-slate-900 list-decimal list-inside space-y-2.5 leading-relaxed">
                  <li>
                    <strong>Tahapan Seleksi:</strong> Proses seleksi ini terdiri dari 2 (dua) tahapan utama, yaitu <strong>Tes Seleksi Kompetensi</strong> dan <strong>Tes Wawancara</strong>.
                  </li>
                  <li>
                    <strong>Kewajiban Peserta:</strong> Seluruh peserta wajib mengikuti kedua tahapan tes tersebut secara lengkap tanpa terkecuali.
                  </li>
                  <li>
                    <strong>Mekanisme Perpindahan Tahap:</strong> Peserta yang telah menyelesaikan Tes Wawancara dan mendapatkan persetujuan (<em>approval</em>) dari pewawancara akan diarahkan untuk mengikuti Tes Seleksi Kompetensi. Sebaliknya, peserta yang telah menyelesaikan Tes Seleksi Kompetensi terlebih dahulu akan diarahkan menuju ruang Tes Wawancara.
                  </li>
                  <li>
                    <strong>Koordinasi Pelaksanaan:</strong> Seluruh alur pelaksanaan dan perpindahan ruangan akan dipandu langsung oleh Panitia Pelaksana.
                  </li>
                  <li>
                    <strong>Tanggung Jawab Peserta:</strong> Peserta wajib memperhatikan jadwal dan arahan dengan saksama. Tahapan tes yang terlewat akibat kelalaian peserta sepenuhnya berada di luar tanggung jawab Panitia Pelaksana.
                  </li>
                  <li>
                    <strong>Akses Ujian:</strong> Untuk memulai Tes Seleksi Kompetensi, peserta wajib menunggu persetujuan akses (<em>approval</em>) terlebih dahulu dari Admin Ruangan.
                  </li>
                  <li>
                    <strong>Durasi Pengerjaan:</strong> Waktu pengerjaan Tes Seleksi Kompetensi adalah <strong>60 menit</strong> dan akan dihitung mundur secara otomatis sesaat setelah peserta menekan tombol <strong>&quot;Mulai Ujian Sekarang&quot;</strong>.
                  </li>
                  <li>
                    <strong>Pengumpulan Tugas Praktik:</strong> Hasil pengerjaan soal Praktik Kompetensi wajib dikumpulkan dalam bentuk tautan (<em>link</em>) dengan pengaturan akses publik (<strong>&quot;Anyone with the link&quot;</strong> atau <strong>&quot;Siapa saja yang memiliki link dapat melihat&quot;</strong>).
                  </li>
                  <li>
                    <strong>Integritas dan Kesempatan Tes:</strong> Peserta dilarang keras melakukan kecurangan dalam bentuk apa pun selama proses seleksi berlangsung. Setiap tahapan seleksi (baik Tes Kompetensi maupun Wawancara) hanya dapat diikuti sebanyak <strong>1 (satu) kali</strong>.
                  </li>
                </ol>
              </div>

              {/* Checkbox Persetujuan */}
              <label className="flex items-start gap-3 p-3.5 bg-white border-3 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a] cursor-pointer select-none hover:bg-[#E6F7FF] transition">
                <input
                  type="checkbox"
                  checked={isCheckboxChecked}
                  onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-[#8CC63F] border-2 border-slate-950 cursor-pointer shrink-0"
                />
                <span className="text-xs font-black text-slate-950 leading-snug">
                  Saya telah membaca, memahami, dan menyetujui seluruh alur tahapan serta tata tertib Seleksi MagangHub BPS Kab. Soppeng Batch III Angkatan 2 Tahun 2026.
                </span>
              </label>

              {/* Tombol Lanjutkan ke Halaman Status / Lobby Peserta */}
              <button
                type="button"
                disabled={!isCheckboxChecked}
                onClick={onCompleteTerms}
                className="w-full bg-[#8CC63F] hover:bg-[#9bd64d] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black uppercase tracking-wider text-sm py-3.5 px-6 border-3 border-slate-950 shadow-[5px_5px_0px_0px_#0f172a] disabled:shadow-none transition-all cursor-pointer"
              >
                {isCheckboxChecked
                  ? 'Setuju & Lihat Status Seleksi Saya'
                  : 'Centang Persetujuan Terlebih Dahulu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dekorasi Latar Neobrutalism */}
      <div className="pointer-events-none fixed -top-12 -left-12 w-44 h-44 bg-[#00AEEF] border-4 border-slate-950 rounded-full opacity-90 hidden lg:block shadow-[8px_8px_0px_0px_#0f172a]" />
      <div className="pointer-events-none fixed top-16 -right-10 w-36 h-36 bg-[#F7941D] border-4 border-slate-950 rotate-12 hidden lg:block shadow-[8px_8px_0px_0px_#0f172a]" />
      <div className="pointer-events-none fixed -bottom-12 right-20 w-48 h-28 bg-[#8CC63F] border-4 border-slate-950 -rotate-6 hidden lg:block shadow-[8px_4px_0px_0px_#0f172a]" />

      {/* Top Bar BPS Color Strip */}
      <div className="max-w-xl w-full mx-auto mt-2">
        <div className="grid grid-cols-3 h-4 border-4 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] overflow-hidden">
          <div className="bg-[#00AEEF] border-r-4 border-slate-950" />
          <div className="bg-[#8CC63F] border-r-4 border-slate-950" />
          <div className="bg-[#F7941D]" />
        </div>
      </div>

      <div className="max-w-xl w-full mx-auto my-8 z-10">
        <div className="bg-white border-4 border-slate-950 shadow-[10px_10px_0px_0px_#0f172a] p-6 md:p-8">
          {/* Header Card */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="bg-[#00AEEF] text-slate-950 font-black text-xs uppercase tracking-wider px-3 py-1 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a]">
              BPS • BATCH III
            </span>
            <span className="bg-[#8CC63F] text-slate-950 font-black text-xs uppercase tracking-wider px-3 py-1 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a]">
              DAFTAR HADIR PESERTA
            </span>
            <span className="bg-[#F7941D] text-slate-950 font-black text-xs uppercase tracking-wider px-3 py-1 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a]">
              KOMPETENSI &amp; WAWANCARA
            </span>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FFFDF7] border-3 border-slate-950 p-2 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
              <img
                src="/BPSIndonesia.svg"
                alt="Logo BPS Indonesia"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-950 uppercase tracking-tight leading-none">
                Seleksi MagangHub BPS Kab. Soppeng
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-1.5">
                Silakan isi daftar hadir di bawah ini untuk memulai rangkaian seleksi
              </p>
            </div>
          </div>

          <form onSubmit={handleOpenConfirmSave} className="space-y-5">
            {loginError && (
              <div className="bg-red-500 text-white border-3 border-slate-950 p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                <p className="text-xs font-black uppercase tracking-wider mb-1">
                  Pemberitahuan Sistem
                </p>
                <p className="text-xs font-bold leading-relaxed">{loginError}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-950 mb-1.5">
                Nama Lengkap Peserta
              </label>
              <input
                type="text"
                required
                value={namaPeserta}
                onChange={(e) => setNamaPeserta(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-3 bg-[#FFFDF7] border-3 border-slate-950 font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none focus:bg-[#E6F7FF] shadow-[4px_4px_0px_0px_#0f172a] transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-950 mb-1.5">
                  Email Aktif
                </label>
                <input
                  type="email"
                  required
                  value={emailPeserta}
                  onChange={(e) => setEmailPeserta(e.target.value)}
                  placeholder="budi@email.com"
                  className="w-full px-4 py-3 bg-[#FFFDF7] border-3 border-slate-950 font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none focus:bg-[#E6F7FF] shadow-[4px_4px_0px_0px_#0f172a] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-950 mb-1.5">
                  Posisi yang Dilamar
                </label>
                <select
                  value={posisiDilamar}
                  onChange={(e) => setPosisiDilamar(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFDF7] border-3 border-slate-950 font-bold text-slate-950 focus:outline-none focus:bg-[#F2FAE9] shadow-[4px_4px_0px_0px_#0f172a] transition cursor-pointer"
                >
                  {POSISI_OPTIONS.map((posisi) => (
                    <option key={posisi} value={posisi}>
                      {posisi}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-950 mb-1.5">
                Alamat Domisili
              </label>
              <textarea
                required
                rows={2}
                value={alamatPeserta}
                onChange={(e) => setAlamatPeserta(e.target.value)}
                placeholder="Masukkan alamat lengkap domisili saat ini..."
                className="w-full px-4 py-3 bg-[#FFFDF7] border-3 border-slate-950 font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none focus:bg-[#FFF5E6] shadow-[4px_4px_0px_0px_#0f172a] transition"
              />
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full bg-[#F7941D] hover:bg-[#ff9f2e] disabled:opacity-60 text-slate-950 font-black uppercase tracking-wider text-base py-4 px-6 border-4 border-slate-950 shadow-[6px_6px_0px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#0f172a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all cursor-pointer"
            >
              {registering ? 'Menyimpan Daftar Hadir...' : 'Simpan Daftar Hadir & Lanjutkan'}
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center py-2 space-y-1 z-10">
        <p className="text-xs font-black uppercase tracking-widest text-slate-600">
          Sistem Ujian Seleksi Maganghub Batch III Angkatan 2 Tahun 2026
        </p>
        <p className="text-[11px] font-bold text-slate-500">
          Developed by{' '}
          <a
            href="https://alviansyah.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-900 font-black underline decoration-2 decoration-[#00AEEF] hover:text-[#00AEEF] transition-colors"
          >
            Alviansyah
          </a>
        </p>
      </footer>
    </main>
  );
}
