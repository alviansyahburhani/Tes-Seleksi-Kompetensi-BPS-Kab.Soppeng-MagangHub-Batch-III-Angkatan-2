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

  // State Cooldown tombol manual Cek Status Terbaru (10 detik)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // State Modal Pengajuan Ganti Akun / Logout ke Admin
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [alasanInput, setAlasanInput] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSubmittedSuccess, setRequestSubmittedSuccess] = useState(false);
  const [requestError, setRequestError] = useState('');

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

  // Peserta mengirim permohonan ganti akun ke Admin
  const handleSubmitResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError('');
    setSubmittingRequest(true);

    try {
      const res = await fetch('/api/start', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_RESET_ACCOUNT',
          rowNumber: lobbyStatus.rowNumber,
          namaPeserta: lobbyStatus.namaPeserta,
          emailPeserta: lobbyStatus.emailPeserta,
          posisiDilamar: lobbyStatus.posisiDilamar,
          alasan: alasanInput.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRequestSubmittedSuccess(true);
        onRefreshStatus();
      } else {
        setRequestError(json.error || 'Gagal mengirim permohonan ke Admin.');
      }
    } catch {
      setRequestError('Gagal menghubungi server. Periksa koneksi internet Anda.');
    } finally {
      setSubmittingRequest(false);
    }
  };

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
  } = lobbyStatus;

  const bothCompleted = kompetensiSelesai && wawancaraApproved;

  return (
    <main className="min-h-screen bg-[#FFFDF7] flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
      {/* ===================================================================== */}
      {/* POP-UP MANDATORY: ALUR & KETENTUAN UJIAN (MUNCUL JIKA BELUM CENTANG/SETUJU) */}
      {/* ===================================================================== */}
      {!hasAcceptedTerms && (
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
              <span className="bg-[#F7941D] text-slate-950 text-xs font-black px-2 py-0.5 border border-white">
                WAJIB DISETUJUI
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
                  Data kehadiran atas nama <strong>{namaPeserta}</strong> telah tersimpan di sistem <strong>Monitoring Peserta</strong>.
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
                    Harap baca alur dan ketentuan pelaksanaan seleksi berikut.
                  </p>
                </div>
              </div>

              {/* Daftar Alur & Ketentuan */}
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

              {/* Tombol Setuju */}
              <button
                type="button"
                disabled={!isCheckboxChecked}
                onClick={onAcceptTerms}
                className="w-full bg-[#8CC63F] hover:bg-[#9bd64d] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black uppercase tracking-wider text-sm py-3.5 px-6 border-3 border-slate-950 shadow-[5px_5px_0px_0px_#0f172a] disabled:shadow-none transition-all cursor-pointer"
              >
                {isCheckboxChecked
                  ? 'Setuju & Lanjutkan ke Status Seleksi →'
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
      <div className="max-w-3xl w-full mx-auto mt-2">
        <div className="grid grid-cols-3 h-4 border-4 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] overflow-hidden">
          <div className="bg-[#00AEEF] border-r-4 border-slate-950" />
          <div className="bg-[#8CC63F] border-r-4 border-slate-950" />
          <div className="bg-[#F7941D]" />
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto my-6 z-10 space-y-6">
        {/* KARTU UTAMA IDENTITAS & ARAHAN ALUR SELEKSI */}
        <div className="bg-white border-4 border-slate-950 shadow-[10px_10px_0px_0px_#0f172a] p-6 md:p-8">
          {/* Badges Atas */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#8CC63F] text-slate-950 font-black text-xs uppercase tracking-wider px-3 py-1 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a]">
                DAFTAR HADIR TERSIMPAN
              </span>
              <span className="bg-[#00AEEF] text-slate-950 font-black text-xs uppercase tracking-wider px-3 py-1 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a]">
                PORTAL STATUS SELEKSI
              </span>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshingStatus || cooldownSeconds > 0}
              className="bg-[#FFFDF7] hover:bg-[#E6F7FF] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase px-3.5 py-1.5 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a] disabled:shadow-none transition cursor-pointer"
            >
              {refreshingStatus
                ? '↻ Memperbarui...'
                : cooldownSeconds > 0
                  ? `↻ Tunggu (${cooldownSeconds}s)`
                  : '↻ Cek Status Terbaru'}
            </button>
          </div>

          {/* Header BPS */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#FFFDF7] border-3 border-slate-950 p-2 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
              <img
                src="/BPSIndonesia.svg"
                alt="Logo BPS Indonesia"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tight leading-tight">
                Status Tahapan Seleksi Peserta
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Badan Pusat Statistik Kabupaten Soppeng • MagangHub Batch III
              </p>
            </div>
          </div>

          {/* Box Identitas Peserta Terdaftar */}
          <div className="bg-[#FFFDF7] border-3 border-slate-950 p-4 shadow-[4px_4px_0px_0px_#0f172a] mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Peserta Terdaftar Hadir
                </span>
                <p className="text-lg font-black text-slate-950 leading-tight">{namaPeserta}</p>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  {emailPeserta} • {alamatPeserta}
                </p>
              </div>
              <div className="md:text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Formasi Dilamar
                </span>
                <span className="inline-block bg-[#00AEEF] text-slate-950 font-black text-xs px-3 py-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
                  {posisiDilamar}
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-500 text-white border-3 border-slate-950 p-4 shadow-[4px_4px_0px_0px_#0f172a] mb-6">
              <p className="text-xs font-black uppercase tracking-wider mb-1">
                ⚠️ Pemberitahuan
              </p>
              <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* ================================================================= */}
          {/* BANNER PEMBERITAHUAN ARAHAN OTOMATIS SESUAI KONDISI PESERTA       */}
          {/* ================================================================= */}
          {bothCompleted && (
            <div className="bg-[#8CC63F] border-4 border-slate-950 p-5 shadow-[6px_6px_0px_0px_#0f172a] mb-6">
              <p className="text-sm md:text-base font-black uppercase text-slate-950 mb-1">
                🎉 Selamat! Seluruh Tahapan Seleksi Telah Selesai
              </p>
              <p className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed">
                Anda tercatat telah menyelesaikan <strong>Tes Seleksi Kompetensi</strong> dan telah di-approve mengikuti <strong>Tes Wawancara</strong>. Terima kasih atas partisipasi Anda pada Seleksi MagangHub BPS Kab. Soppeng Batch III!
              </p>
            </div>
          )}

          {!bothCompleted && wawancaraApproved && !kompetensiSelesai && (
            <div className="bg-[#00AEEF] border-4 border-slate-950 p-5 shadow-[6px_6px_0px_0px_#0f172a] mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-slate-950 text-white text-[10px] font-black uppercase px-2 py-0.5">
                  ARAHAN TAHAP BERIKUTNYA
                </span>
              </div>
              <p className="text-sm md:text-base font-black uppercase text-slate-950 mb-1">
                Anda Telah Menyelesaikan Wawancara — Silakan Ikuti Tes Seleksi Kompetensi
              </p>
              <p className="text-xs md:text-sm font-bold text-slate-950 leading-relaxed">
                Status <strong>Tes Wawancara</strong> Anda telah di-approve oleh Admin dan tidak dapat diikuti kembali. Sekarang Anda diarahkan untuk mengikuti <strong>Tes Seleksi Kompetensi</strong> pada kartu di bawah ini.
              </p>
            </div>
          )}

          {!bothCompleted && kompetensiSelesai && !wawancaraApproved && (
            <div className="bg-[#F7941D] border-4 border-slate-950 p-5 shadow-[6px_6px_0px_0px_#0f172a] mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-slate-950 text-white text-[10px] font-black uppercase px-2 py-0.5">
                  ARAHAN TAHAP BERIKUTNYA
                </span>
              </div>
              <p className="text-sm md:text-base font-black uppercase text-slate-950 mb-1">
                Anda Telah Menyelesaikan Tes Kompetensi — Silakan Mengikuti Tes Wawancara
              </p>
              <p className="text-xs md:text-sm font-bold text-slate-950 leading-relaxed">
                Jawaban <strong>Tes Seleksi Kompetensi</strong> Anda telah tersimpan dan tidak dapat diakses ulang. Silakan menuju ke meja/ruangan <strong>Tes Wawancara</strong> dan konfirmasikan kehadiran Anda kepada Admin/Pewawancara untuk di-approve.
              </p>
            </div>
          )}

          {!bothCompleted && !kompetensiSelesai && !wawancaraApproved && (
            <div className="bg-[#FFF5E6] border-3 border-slate-950 p-4 shadow-[4px_4px_0px_0px_#0f172a] mb-6">
              <p className="text-xs md:text-sm font-black uppercase text-slate-950 mb-1">
                📌 Informasi Rangkaian Seleksi (2 Tahap)
              </p>
              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                Anda telah terdaftar hadir. Silakan ikuti arahan panitia di ruangan: jika Anda berada di sesi <strong>Wawancara</strong> terlebih dahulu, Admin akan melakukan approve setelah wawancara selesai; jika Anda berada di ruangan <strong>Tes Seleksi Kompetensi</strong>, tunggu Admin melakukan <strong>Approve Akses Kompetensi</strong> agar tombol <em>Mulai Ujian</em> aktif.
              </p>
            </div>
          )}

          {/* ================================================================= */}
          {/* DUA KARTU TAHAPAN: TES SELEKSI KOMPETENSI & TES WAWANCARA         */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* KARTU 1: TES SELEKSI KOMPETENSI */}
            <div
              className={`border-4 border-slate-950 p-5 flex flex-col justify-between shadow-[6px_6px_0px_0px_#0f172a] ${kompetensiSelesai
                ? 'bg-[#F2FAE9]'
                : kompetensiApproved
                  ? 'bg-[#E6F7FF]'
                  : 'bg-[#FFFDF7]'
                }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="bg-slate-950 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1">
                    TAHAP KOMPETENSI
                  </span>
                  {kompetensiSelesai ? (
                    <span className="bg-[#8CC63F] text-slate-950 border-2 border-slate-950 font-black text-[11px] uppercase px-2.5 py-0.5">
                      SUDAH SELESAI
                    </span>
                  ) : kompetensiApproved ? (
                    <span className="bg-[#00AEEF] text-slate-950 border-2 border-slate-950 font-black text-[11px] uppercase px-2.5 py-0.5 animate-pulse">
                      AKSES DISETUJUI ADMIN
                    </span>
                  ) : (
                    <span className="bg-[#F7941D] text-slate-950 border-2 border-slate-950 font-black text-[11px] uppercase px-2.5 py-0.5">
                      MENUNGGU APPROVE ADMIN
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-black text-slate-950 uppercase leading-tight mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 bg-[#00AEEF] border-2 border-slate-950 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a] shrink-0">
                    <svg
                      className="w-4 h-4 stroke-slate-950"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                    </svg>
                  </span>
                  <span>Tes Seleksi Kompetensi</span>
                </h2>

                {kompetensiSelesai ? (
                  <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">
                    Anda telah menyelesaikan dan mengirimkan jawaban Tes Seleksi Kompetensi ({statusUjian || 'SELESAI'}). Anda tidak dapat mengikuti ujian kompetensi kembali.
                  </p>
                ) : kompetensiApproved ? (
                  <p className="text-xs font-bold text-slate-800 leading-relaxed mb-4">
                    Admin telah menyetujui akses ujian Anda! Waktu <strong>60 Menit</strong> baru akan dihitung saat Anda menekan tombol <strong>&quot;Mulai Ujian Sekarang&quot;</strong> di bawah ini.
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">
                    Akses soal kompetensi menunggu <strong>Approve</strong> dari Admin pengawas ruangan. Halaman ini akan otomatis mendeteksi begitu Admin memberikan persetujuan.
                  </p>
                )}
              </div>

              <div>
                {kompetensiSelesai ? (
                  <div className="w-full bg-slate-200 text-slate-700 font-black uppercase text-xs text-center py-3 px-4 border-3 border-slate-950">
                    Tes Kompetensi Telah Selesai
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!kompetensiApproved || startingExam}
                    onClick={onStartCompetencyExam}
                    className={`w-full font-black uppercase tracking-wider text-xs md:text-sm py-3.5 px-4 border-3 border-slate-950 transition-all ${kompetensiApproved
                      ? 'bg-[#8CC63F] hover:bg-[#9bd64d] text-slate-950 shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#0f172a] cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                  >
                    {startingExam
                      ? 'Menyiapkan Soal & Timer 60 Menit...'
                      : kompetensiApproved
                        ? 'Mulai Ujian Sekarang (60 Menit)'
                        : 'Menunggu Approve Admin Ruangan...'}
                  </button>
                )}
              </div>
            </div>

            {/* KARTU 2: TES WAWANCARA */}
            <div
              className={`border-4 border-slate-950 p-5 flex flex-col justify-between shadow-[6px_6px_0px_0px_#0f172a] ${wawancaraApproved ? 'bg-[#F2FAE9]' : 'bg-[#FFFDF7]'
                }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="bg-slate-950 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1">
                    TAHAP WAWANCARA
                  </span>
                  {wawancaraApproved ? (
                    <span className="bg-[#8CC63F] text-slate-950 border-2 border-slate-950 font-black text-[11px] uppercase px-2.5 py-0.5">
                      SUDAH DI-APPROVE
                    </span>
                  ) : (
                    <span className="bg-[#F7941D] text-slate-950 border-2 border-slate-950 font-black text-[11px] uppercase px-2.5 py-0.5">
                      BELUM WAWANCARA
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-black text-slate-950 uppercase leading-tight mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 bg-[#F7941D] border-2 border-slate-950 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a] shrink-0">
                    <svg
                      className="w-4 h-4 stroke-slate-950"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </span>
                  <span>Tes Wawancara</span>
                </h2>

                {wawancaraApproved ? (
                  <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">
                    Admin telah meng-approve bahwa Anda telah menyelesaikan <strong>Tes Wawancara</strong> ({statusWawancara || 'SUDAH WAWANCARA'}). Anda tidak dapat mengikuti sesi wawancara kembali.
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">
                    Nama Anda telah terdaftar pada panel Monitoring Wawancara Admin. Setelah Anda melaksanakan sesi wawancara, Admin akan melakukan <strong>Approve Wawancara</strong> pada sistem.
                  </p>
                )}
              </div>

              <div>
                {wawancaraApproved ? (
                  <div className="w-full bg-[#8CC63F]/40 text-slate-950 font-black uppercase text-xs text-center py-3 px-4 border-3 border-slate-950">
                    Wawancara Selesai &amp; Terverifikasi Admin
                  </div>
                ) : (
                  <div className="w-full bg-[#FFF5E6] text-slate-900 font-black uppercase text-xs text-center py-3 px-4 border-3 border-slate-950">
                    Silakan Melakukan Wawancara &amp; Telah Approve di Admin
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Bawah Kartu Lobby */}
          <div className="mt-6 pt-4 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {lobbyStatus.resetRequestStatus === 'PENDING' ? (
                <span className="bg-[#FFF5E6] border-2 border-slate-950 px-2.5 py-1 text-slate-950 font-black uppercase text-[11px] animate-pulse">
                  Menunggu Persetujuan Admin untuk Ganti Akun...
                </span>
              ) : lobbyStatus.resetRequestStatus === 'REJECTED' ? (
                <div className="flex items-center gap-2">
                  <span className="bg-red-500 text-white font-black uppercase text-[10px] px-2 py-0.5 border border-slate-950">
                    Permohonan Ditolak Admin
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestError('');
                      setRequestSubmittedSuccess(false);
                      setShowRequestModal(true);
                    }}
                    className="text-slate-700 hover:text-red-600 font-black uppercase underline cursor-pointer"
                  >
                    Ajukan Lagi
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRequestError('');
                    setRequestSubmittedSuccess(false);
                    setShowRequestModal(true);
                  }}
                  className="text-slate-700 hover:text-red-600 font-black uppercase underline cursor-pointer"
                >
                  Ajukan Izin Ganti Akun / Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* POP-UP PENGAJUAN GANTI AKUN / KELUAR DARI LOBBY KE ADMIN              */}
      {/* ===================================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] border-4 border-slate-950 max-w-sm w-full shadow-[10px_10px_0px_0px_#0f172a] overflow-hidden my-auto">
            {/* Header Modal */}
            <div className="bg-slate-950 text-white px-5 py-3 border-b-4 border-slate-950 flex items-center justify-between">
              <span className="font-black uppercase tracking-wider text-xs">
                Permohonan Izin Ganti Akun
              </span>
              <span className="bg-[#00AEEF] text-slate-950 text-[10px] font-black px-1.5 py-0.5 border border-white">
                ADMIN APPROVAL
              </span>
            </div>

            <form onSubmit={handleSubmitResetRequest} className="p-5 space-y-4">
              <div className="bg-[#FFF5E6] border-2 border-slate-950 p-3">
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  Permohonan Anda akan langsung dikirim ke <strong>Sidebar Monitoring Admin</strong>. Admin akan memilih untuk <strong>Menyetujui</strong> atau <strong>Menolak</strong> permohonan Anda.
                </p>
              </div>

              {requestError && (
                <div className="bg-red-500 text-white text-xs font-bold p-2.5 border-2 border-slate-950">
                  ⚠️ {requestError}
                </div>
              )}

              {requestSubmittedSuccess ? (
                <div className="bg-[#8CC63F]/25 border-2 border-slate-950 p-3 text-center space-y-2">
                  <p className="text-xs font-black uppercase text-slate-950">
                    ✓ Permohonan Terkirim ke Admin
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">
                    Silakan tunggu konfirmasi Admin pada sistem atau hubungi pengawas ruangan. Halaman ini akan otomatis kembali ke beranda begitu disetujui.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="w-full bg-[#8CC63F] text-slate-950 font-black uppercase text-xs py-2 border-2 border-slate-950"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-950 mb-1">
                      Alasan Pengajuan (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={alasanInput}
                      onChange={(e) => setAlasanInput(e.target.value)}
                      placeholder="Contoh: Salah ketik nama / email..."
                      className="w-full px-3 py-2 bg-white border-2 border-slate-950 font-bold text-xs text-slate-950 focus:outline-none focus:bg-[#E6F7FF]"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={submittingRequest}
                      onClick={() => setShowRequestModal(false)}
                      className="flex-1 bg-white hover:bg-slate-100 text-slate-950 font-black uppercase text-xs py-2.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRequest}
                      className="flex-1 bg-[#F7941D] hover:bg-[#ff9f2e] disabled:opacity-60 text-slate-950 font-black uppercase text-xs py-2.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer"
                    >
                      {submittingRequest ? 'Mengirim...' : 'Kirim ke Admin →'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

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

