'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXAM_SESSION_STORAGE_KEY,
  PARTICIPANT_LOBBY_STORAGE_KEY,
  TERMS_ACCEPTED_STORAGE_KEY,
} from '@/constants/exam';
import { ParticipantLobbyStatus, SavedExamSession } from '@/types/exam';

// Link undangan Grup WhatsApp untuk peserta yang dinyatakan LULUS.
// Atur di .env.local: NEXT_PUBLIC_WHATSAPP_GROUP_URL=https://chat.whatsapp.com/xxxxxxxx
// (Jika kosong, kartu ajakan bergabung grup WhatsApp tidak ditampilkan.)
const WHATSAPP_GROUP_URL = (process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL || '').trim();

export default function PengumumanPage() {
  const router = useRouter();

  const [statusData, setStatusData] = useState<ParticipantLobbyStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<
    'default' | 'granted' | 'denied' | 'unsupported'
  >('default');
  const [isNotifSubscribed, setIsNotifSubscribed] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState('');
  const [hasNotifiedResult, setHasNotifiedResult] = useState(false);

  // 1. Cek izin notifikasi browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  // Sinkronkan status aktivasi notifikasi per email peserta
  useEffect(() => {
    if (!statusData?.emailPeserta || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    try {
      const subKey = `bps_notif_sub_${statusData.emailPeserta.trim().toLowerCase()}`;
      if (Notification.permission === 'granted' && localStorage.getItem(subKey) === 'true') {
        setIsNotifSubscribed(true);
      }
    } catch {}
  }, [statusData?.emailPeserta]);

  // 2. Timer cooldown 10 detik untuk tombol Cek Status Kelulusan Terbaru
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // 3. Validasi sesi peserta saat membuka /pengumuman
  useEffect(() => {
    try {
      // Jika masih ada sesi ujian yang aktif, kembalikan ke /ujian
      const savedSession = localStorage.getItem(EXAM_SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsedSession: SavedExamSession = JSON.parse(savedSession);
        if (
          parsedSession &&
          parsedSession.isLoggedIn &&
          !parsedSession.isFinished &&
          parsedSession.endTimeMs
        ) {
          const remainingSec = Math.max(
            0,
            Math.floor((parsedSession.endTimeMs - Date.now()) / 1000)
          );
          if (remainingSec > 0) {
            router.replace('/ujian');
            return;
          } else {
            localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
          }
        }
      }

      // Cek sesi dari sessionStorage atau fallback dari localStorage
      // (Jangan langsung dihapus saat mount agar aman terhadap React Strict Mode double-mount!)
      const tempLobbyLogin = sessionStorage.getItem('bps_temp_lobby_login_v1');
      const savedLobby = tempLobbyLogin || localStorage.getItem(PARTICIPANT_LOBBY_STORAGE_KEY);

      if (!savedLobby) {
        router.replace('/login');
        return;
      }

      const parsed: ParticipantLobbyStatus = JSON.parse(savedLobby);
      if (!parsed || !parsed.namaPeserta || !parsed.emailPeserta) {
        router.replace('/login');
        return;
      }

      const isCompletedAll =
        Boolean(parsed.kompetensiSelesai && parsed.wawancaraApproved) ||
        Boolean(parsed.statusKelulusan && parsed.statusKelulusan.trim().length > 0);

      // Jika belum menyelesaikan kedua tahap dan belum ada status kelulusan, kembalikan ke /lobby
      if (!isCompletedAll) {
        router.replace('/lobby');
        return;
      }

      // Simpan ke sessionStorage selama berada di /pengumuman & bersihkan localStorage
      try {
        sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(parsed));
        localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
        localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
      } catch {}

      setStatusData(parsed);
      setLastCheckedTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      // Sinkronisasi data terbaru dari Google Sheets Monitoring_Peserta
      const params = new URLSearchParams();
      if (parsed.rowNumber) params.set('rowNumber', String(parsed.rowNumber));
      if (parsed.emailPeserta) params.set('email', parsed.emailPeserta);
      if (parsed.namaPeserta) params.set('nama', parsed.namaPeserta);

      fetch(`/api/start?${params.toString()}`, { cache: 'no-store' })
        .then(async (res) => {
          if (res.status === 404) {
            router.replace('/login');
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((json) => {
          if (json && json.success) {
            const freshStatus: ParticipantLobbyStatus = {
              rowNumber: json.rowNumber,
              namaPeserta: json.namaPeserta,
              emailPeserta: json.emailPeserta,
              teleponPeserta: json.teleponPeserta || '',
              posisiDilamar: json.posisiDilamar,
              alamatPeserta: json.alamatPeserta,
              statusUjian: json.statusUjian || '',
              statusWawancara: json.statusWawancara || '',
              statusKelulusan: json.statusKelulusan || '',
              kompetensiApproved: Boolean(json.kompetensiApproved),
              kompetensiSelesai: Boolean(json.kompetensiSelesai),
              sedangUjian: Boolean(json.sedangUjian),
              wawancaraApproved: Boolean(json.wawancaraApproved),
              resetRequestStatus: json.resetRequestStatus || 'NONE',
            };
            setStatusData(freshStatus);
            try {
              sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(freshStatus));
            } catch {}
          }
        })
        .catch(() => {});
    } catch {
      router.replace('/login');
    }
  }, [router]);

  // 4. Handler cek pembaruan status kelulusan manual
  const handleManualRefresh = useCallback(async () => {
    if (!statusData || refreshing || cooldownSeconds > 0) return;
    setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (statusData.rowNumber) params.set('rowNumber', String(statusData.rowNumber));
      if (statusData.emailPeserta) params.set('email', statusData.emailPeserta);
      if (statusData.namaPeserta) params.set('nama', statusData.namaPeserta);

      const res = await fetch(`/api/start?${params.toString()}`, { cache: 'no-store' });
      if (res.status === 404) {
        router.replace('/login');
        return;
      }

      const json = await res.json();
      if (json && json.success) {
        const updated: ParticipantLobbyStatus = {
          rowNumber: json.rowNumber,
          namaPeserta: json.namaPeserta,
          emailPeserta: json.emailPeserta,
          teleponPeserta: json.teleponPeserta || '',
          posisiDilamar: json.posisiDilamar,
          alamatPeserta: json.alamatPeserta,
          statusUjian: json.statusUjian || '',
          statusWawancara: json.statusWawancara || '',
          statusKelulusan: json.statusKelulusan || '',
          kompetensiApproved: Boolean(json.kompetensiApproved),
          kompetensiSelesai: Boolean(json.kompetensiSelesai),
          sedangUjian: Boolean(json.sedangUjian),
          wawancaraApproved: Boolean(json.wawancaraApproved),
          resetRequestStatus: json.resetRequestStatus || 'NONE',
        };
        setStatusData(updated);
        setCooldownSeconds(10);
        setLastCheckedTime(
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    } catch {
      // Abaikan gangguan jaringan sesaat
    } finally {
      setRefreshing(false);
    }
  }, [statusData, refreshing, cooldownSeconds, router]);

  // 5. Meminta izin notifikasi browser
  const handleRequestNotificationPermission = async () => {
    setNotifFeedback('');
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      setNotifFeedback('Browser perangkat Anda tidak mendukung fitur notifikasi sistem.');
      return;
    }

    try {
      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        setIsNotifSubscribed(true);
        try {
          if (statusData?.emailPeserta) {
            const subKey = `bps_notif_sub_${statusData.emailPeserta.trim().toLowerCase()}`;
            localStorage.setItem(subKey, 'true');
          }
        } catch {}
        setNotifFeedback(
          'Notifikasi berhasil diaktifkan! Anda akan menerima pemberitahuan saat pengumuman kelulusan diperbarui oleh Admin.'
        );
        try {
          new Notification('Notifikasi Seleksi BPS Kab. Soppeng Aktif', {
            body: `Halo ${statusData?.namaPeserta || 'Peserta'}, kami akan mengirimkan notifikasi begitu hasil akhir kelulusan Anda diumumkan.`,
            icon: '/BPSIndonesia.svg',
          });
        } catch {}
      } else if (permission === 'denied') {
        setNotifFeedback(
          'Izin notifikasi diblokir di pengaturan browser Anda. Silakan klik ikon pengaturan/gembok di sebelah alamat URL browser lalu izinkan Notifications.'
        );
      }
    } catch {
      setNotifFeedback('Gagal meminta izin notifikasi pada browser ini.');
    }
  };

  // Evaluasi status kelulusan
  const rawKelulusan = (statusData?.statusKelulusan || '').trim();
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

  // Kirim notifikasi browser otomatis jika status kelulusan terisi & izin granted
  useEffect(() => {
    if (!statusData || !hasKelulusanValue || hasNotifiedResult) return;
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        const title = isLulus
          ? 'Selamat! Anda Dinyatakan LULUS Seleksi BPS Soppeng'
          : 'Pengumuman Hasil Seleksi BPS Kab. Soppeng';
        const body = isLulus
          ? `Selamat ${statusData.namaPeserta}! Anda dinyatakan LULUS (${rawKelulusan}) pada Seleksi MagangHub BPS Kab. Soppeng.`
          : `Halo ${statusData.namaPeserta}, status hasil akhir seleksi Anda: ${rawKelulusan}.`;
        new Notification(title, {
          body,
          icon: '/BPSIndonesia.svg',
        });
        setHasNotifiedResult(true);
      } catch {}
    }
  }, [statusData, hasKelulusanValue, hasNotifiedResult, isLulus, rawKelulusan]);

  if (!statusData) {
    return null;
  }

  const {
    namaPeserta,
    emailPeserta,
    teleponPeserta,
    posisiDilamar,
    alamatPeserta,
    statusUjian,
    statusWawancara,
  } = statusData;

  return (
    <main className="min-h-screen bg-slate-100/80 flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Ambient Background Glow Halus */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 bg-[#00AEEF]/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-80 h-80 bg-[#F7941D]/10 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 left-1/3 w-96 h-96 bg-[#8CC63F]/10 rounded-full blur-3xl" />

      <div />

      <div className="max-w-2xl w-full mx-auto my-auto z-10 py-4">
        <div className="bg-white border-2 border-slate-200/90 rounded-3xl shadow-xl shadow-slate-900/8 overflow-hidden animate-modal-pop relative">
          {/* Partikel Confetti Selebrasi Saat Dinyatakan LULUS */}
          {isLulus && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden z-20">
              <span className="absolute left-[10%] top-2 w-2.5 h-2.5 rounded-xs bg-[#00AEEF] animate-confetti-1" />
              <span className="absolute left-[26%] top-0 w-2 h-3 rounded-xs bg-[#8CC63F] animate-confetti-2" />
              <span className="absolute left-[46%] top-1 w-2.5 h-2.5 rounded-full bg-[#F7941D] animate-confetti-3" />
              <span className="absolute left-[66%] top-0 w-2 h-3 rounded-xs bg-[#00AEEF] animate-confetti-2" />
              <span className="absolute left-[82%] top-2 w-2.5 h-2.5 rounded-xs bg-[#8CC63F] animate-confetti-1" />
              <span className="absolute left-[92%] top-1 w-2 h-2 rounded-full bg-[#F7941D] animate-confetti-3" />
            </div>
          )}

          {/* Top Strip 3 Warna BPS */}
          <div className="grid grid-cols-3 h-2 w-full overflow-hidden">
            <div className="bg-[#00AEEF]" />
            <div className="bg-[#8CC63F]" />
            <div className="bg-[#F7941D]" />
          </div>

          {/* HERO HEADER BIRU BPS */}
          <div className="bg-[#00AEEF] text-white p-6 md:p-7 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-white/10" />

            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs ${
                    hasKelulusanValue
                      ? isLulus
                        ? 'bg-[#8CC63F] text-slate-950'
                        : 'bg-[#F7941D] text-slate-950'
                      : 'bg-[#8CC63F] text-slate-950'
                  }`}
                >
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
                  <span>
                    {hasKelulusanValue ? rawKelulusan.toUpperCase() : 'Selesai 2 Tahap Seleksi'}
                  </span>
                </span>
                <span className="bg-white/20 text-white font-semibold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full">
                  Portal Pengumuman
                </span>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing || cooldownSeconds > 0}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 disabled:bg-white/60 disabled:text-slate-600 disabled:cursor-not-allowed text-[#0284C7] font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <svg
                  className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0-6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                <span>
                  {refreshing
                    ? 'Memperbarui...'
                    : cooldownSeconds > 0
                      ? `Tunggu (${cooldownSeconds}s)`
                      : 'Cek Status Terbaru'}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-white rounded-2xl p-2 shadow-md flex items-center justify-center shrink-0">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">
                    {hasKelulusanValue
                      ? 'Pengumuman Hasil Akhir Seleksi'
                      : 'Seluruh Tahapan Seleksi Selesai'}
                  </h1>
                  <p className="text-xs text-white/90 font-medium mt-0.5">
                    Badan Pusat Statistik Kabupaten Soppeng • MagangHub Batch III
                  </p>
                </div>
              </div>

              {lastCheckedTime && (
                <div className="inline-flex items-center gap-1.5 bg-slate-950/15 text-white/95 text-[11px] font-medium px-3 py-1.5 rounded-xl self-start sm:self-auto">
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

            {/* Kartu Identitas Peserta di dalam Hero */}
            <div className="mt-5 bg-white text-slate-900 rounded-2xl p-4 shadow-md relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Identitas Peserta Seleksi
                  </span>
                  <p className="text-base md:text-lg font-extrabold text-slate-900 truncate">
                    {namaPeserta}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium mt-1">
                    <span>{emailPeserta}</span>
                    {teleponPeserta && <span>• {teleponPeserta}</span>}
                    {alamatPeserta && <span>• {alamatPeserta}</span>}
                  </div>
                </div>
                <div className="sm:text-right border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Formasi Dilamar
                  </span>
                  <span className="inline-block bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/25 font-bold text-xs px-3 py-1 rounded-xl">
                    {posisiDilamar}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AREA ISI PENGUMUMAN */}
          <div className="p-6 md:p-7 bg-slate-50/70 space-y-5">
            {/* Ringkasan 2 Tahap yang Telah Dilalui */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-white border-2 border-[#8CC63F]/50 rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5"
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
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tahap 1 • Kompetensi
                  </p>
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {statusUjian || 'SELESAI'}
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-[#8CC63F]/50 rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5"
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
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tahap 2 • Wawancara
                  </p>
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {statusWawancara || 'SUDAH WAWANCARA'}
                  </p>
                </div>
              </div>
            </div>

            {/* Konten Utama Berdasarkan Status Kelulusan */}
            {hasKelulusanValue ? (
              isLulus ? (
                <div className="bg-[#F4FCEB] border-2 border-[#8CC63F] rounded-2xl p-5 md:p-6 space-y-4 shadow-sm animate-modal-pop">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                      <span className="absolute inset-0 rounded-2xl bg-[#8CC63F]/50 animate-ripple-ring" />
                      <div className="relative w-12 h-12 rounded-2xl bg-[#8CC63F] text-slate-950 flex items-center justify-center shadow-xs animate-pop-in">
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline className="animate-draw-check" points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">
                        Selamat! Anda Dinyatakan LULUS
                      </h2>
                      <p className="text-xs text-[#3F6212] font-bold mt-0.5">
                        Keputusan Panitia: {rawKelulusan.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-slate-800 leading-relaxed">
                    Selamat kepada Saudara/i{' '}
                    <strong className="font-bold text-slate-900">{namaPeserta}</strong>! Berdasarkan
                    hasil penilaian{' '}
                    <strong className="font-bold text-slate-900">Tes Seleksi Kompetensi</strong> dan{' '}
                    <strong className="font-bold text-slate-900">Tes Wawancara</strong>, Anda
                    dinyatakan{' '}
                    <strong className="font-bold text-slate-900">LULUS ({rawKelulusan})</strong>{' '}
                    pada Seleksi MagangHub BPS Kabupaten Soppeng Batch III Angkatan 2 Tahun 2026.
                  </p>

                  {/* Ajakan Bergabung Grup WhatsApp Peserta Lulus */}
                  {WHATSAPP_GROUP_URL && (
                    <div className="bg-white border-2 border-[#25D366]/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 shadow-2xs">
                      <span className="w-11 h-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5c0-5.19 4.23-9.41 9.42-9.41 2.51 0 4.88.98 6.65 2.76a9.35 9.35 0 0 1 2.75 6.66c0 5.19-4.23 9.41-9.41 9.41zm8.01-17.42A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.33-8.01z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs md:text-sm font-extrabold text-slate-900">
                          Wajib Bergabung ke Grup WhatsApp Peserta Lulus
                        </p>
                        <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed mt-0.5">
                          Informasi lanjutan, jadwal, dan koordinasi dengan Panitia BPS Kabupaten
                          Soppeng akan disampaikan melalui grup ini.
                        </p>
                      </div>
                      <a
                        href={WHATSAPP_GROUP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5A] text-white font-bold uppercase tracking-wider text-xs py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all shrink-0"
                      >
                        Gabung Grup
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 17 17 7" />
                          <path d="M7 7h10v10" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {/* Langkah Tindak Lanjut Melengkapi MagangHub Peserta Lulus */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                    <p className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00AEEF] shrink-0" />
                      <span>Langkah Selanjutnya Lengkapi MagangHub Anda:</span>
                    </p>
                    <ol className="text-xs text-slate-700 list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>
                        Masuk ke akun <strong className="font-semibold text-slate-900">MagangHub</strong>{' '}
                        yang Anda miliki.
                      </li>
                      <li>
                        Lengkapi seluruh{' '}
                        <strong className="font-semibold text-slate-900">
                          data administrasi, berkas, dan instrumen MagangHub
                        </strong>{' '}
                        yang diwajibkan pada sistem.
                      </li>
                      <li>
                        Pastikan seluruh kelengkapan MagangHub Anda telah terisi dengan benar dan
                        lakukan konfirmasi kepada{' '}
                        <strong className="font-semibold text-slate-900">
                          Panitia Pelaksana BPS Kabupaten Soppeng
                        </strong>
                        .
                      </li>
                    </ol>
                  </div>
                </div>
              ) : isTidakLulus ? (
                <div className="bg-amber-50 border-2 border-[#F7941D] rounded-2xl p-5 md:p-6 space-y-3.5 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7941D] text-slate-950 flex items-center justify-center shadow-xs shrink-0">
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
                      <h2 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">
                        Pemberitahuan Hasil Akhir Seleksi
                      </h2>
                      <p className="text-xs text-amber-900 font-bold mt-0.5">
                        Status: {rawKelulusan.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                    Terima kasih atas partisipasi dan dedikasi Saudara/i{' '}
                    <strong className="font-bold text-slate-900">{namaPeserta}</strong> dalam
                    mengikuti seluruh rangkaian Seleksi MagangHub BPS Kabupaten Soppeng Batch III.
                    Berdasarkan hasil akhir penilaian, Anda dinyatakan{' '}
                    <strong className="font-bold text-slate-900">{rawKelulusan}</strong> pada
                    periode seleksi kali ini. Tetap semangat dan sukses selalu untuk kesempatan
                    berikutnya!
                  </p>
                </div>
              ) : (
                <div className="bg-[#F0F9FF] border-2 border-[#00AEEF]/40 rounded-2xl p-5 space-y-2 shadow-sm">
                  <span className="inline-block bg-[#00AEEF] text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                    Status Akhir: {rawKelulusan.toUpperCase()}
                  </span>
                  <h2 className="text-base md:text-lg font-extrabold text-slate-900">
                    Informasi Hasil Akhir: {rawKelulusan}
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Status hasil akhir seleksi Anda telah diperbarui oleh Panitia Pelaksana pada
                    sistem Monitoring Peserta.
                  </p>
                </div>
              )
            ) : (
              <>
                {/* Banner Seluruh Tahapan Seleksi Telah Selesai */}
                <div className="bg-[#F4FCEB] border-2 border-[#8CC63F]/60 rounded-2xl p-4 md:p-5 flex items-start gap-3.5 shadow-2xs">
                  <span className="w-9 h-9 rounded-xl bg-[#8CC63F] text-slate-950 inline-flex items-center justify-center shrink-0 mt-0.5">
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
                    <p className="text-sm font-extrabold text-slate-900 mb-1">
                      Selamat! Seluruh Tahapan Seleksi Telah Selesai
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Anda tercatat telah menyelesaikan{' '}
                      <strong className="font-semibold text-slate-900">
                        Tes Seleksi Kompetensi
                      </strong>{' '}
                      dan telah di-approve mengikuti{' '}
                      <strong className="font-semibold text-slate-900">Tes Wawancara</strong>.
                      Terima kasih atas partisipasi Anda pada Seleksi MagangHub BPS Kab. Soppeng
                      Batch III!
                    </p>
                  </div>
                </div>

                {/* Box Menunggu Pengumuman & Izin Notifikasi */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
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
                        Saat ini hasil akhir kelulusan Anda masih dalam proses rekapitulasi oleh
                        Panitia. Silakan{' '}
                        <strong className="font-semibold text-slate-800">
                          aktifkan izin notifikasi
                        </strong>{' '}
                        di bawah ini agar Anda mendapatkan pemberitahuan saat pengumuman kelulusan
                        telah tersedia.
                      </p>
                    </div>
                  </div>

                  {notifPermission === 'granted' && isNotifSubscribed ? (
                    <div className="w-full bg-[#8CC63F] text-slate-950 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider shadow-2xs animate-pop-in">
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
                      className="w-full bg-[#00AEEF] hover:bg-[#0299D4] text-white font-bold uppercase tracking-wider text-xs py-3.5 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800">
                      {notifFeedback}
                    </div>
                  )}

                  {/* Informasi Cara Mengecek Pengumuman Kelulusan Nanti via Login Email */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#F7941D] text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
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
                      <strong className="font-semibold text-slate-900">
                        Cara Mengecek Pengumuman Kelulusan:
                      </strong>{' '}
                      Untuk melihat hasil kelulusan nantinya, silakan masuk kembali ke website ini
                      dan pilih tombol{' '}
                      <strong className="font-semibold text-slate-900">
                        &quot;Masuk dengan Email&quot;
                      </strong>{' '}
                      di halaman login menggunakan email Anda (
                      <strong className="font-semibold text-slate-900">{emailPeserta}</strong>).
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Tombol Selesai & Keluar ke Halaman Login */}
            <div className="pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('bps_temp_lobby_login_v1');
                    localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
                    localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
                    localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
                  } catch {}
                  router.replace('/login');
                }}
                className="w-full bg-[#00AEEF] hover:bg-[#0299D4] text-white font-bold uppercase tracking-wider text-xs py-3.5 px-5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Selesai &amp; Keluar ke Halaman Utama
              </button>
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

