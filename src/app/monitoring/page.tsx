'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { POSISI_OPTIONS } from '@/constants/exam';
import { formatTime } from '@/utils/examHelper';
import { playViolationAlarm, stopViolationAlarm } from '@/utils/mediaHelper';
import type { ActiveViolationAlert } from '@/lib/violationAlertStore';

interface PesertaMonitoring {
  id: number;
  rowNumber: number;
  namaPeserta: string;
  emailPeserta?: string;
  teleponPeserta?: string;
  posisiDilamar: string;
  waktuMulai: string;
  batasSelesai: string;
  sisaWaktu: string;
  sisaDetik: number;
  progressStr: string;
  terjawab: number;
  totalSoal: number;
  statusUjian: string;
  statusWawancara: string;
  kompetensiApproved: boolean;
  wawancaraApproved: boolean;
}

type SidebarMenuTab = 'MONITORING' | 'APPROVE_KOMPETENSI' | 'APPROVE_WAWANCARA';

const ADMIN_PIN_STORAGE_KEY = 'bps_skd_admin_pin_v1';

export default function MonitoringAdminPage() {
  const [adminPin, setAdminPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinError, setPinError] = useState('');

  // Menu Sidebar Aktif & Mode Collapse (Hide tapi tetap muncul Icon)
  const [activeTab, setActiveTab] = useState<SidebarMenuTab>('MONITORING');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isIdentityBlurred, setIsIdentityBlurred] = useState(false);
  const [isKompetensiEmailBlurred, setIsKompetensiEmailBlurred] = useState(true);
  const [actionLoadingRow, setActionLoadingRow] = useState<number | 'ALL' | null>(null);

  const [pesertaList, setPesertaList] = useState<PesertaMonitoring[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveViolationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState('-');
  const [filterPosisi, setFilterPosisi] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'AKTIF' | 'SELESAI'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Simpan ID alert yang sudah pernah memicu bunyi atau sudah dimatikan oleh Admin
  const silencedAlertIdsRef = useRef<Set<string>>(new Set());

  // Ambil data monitoring dari server (/api/monitoring) dengan menyertakan header x-admin-pin
  const fetchMonitoringData = useCallback(
    async (isSilent = false, customPin?: string) => {
      const activePin = (customPin ?? adminPin).trim();
      if (!activePin) return;

      if (!isSilent) setRefreshing(true);
      try {
        const res = await fetch('/api/monitoring', {
          cache: 'no-store',
          headers: {
            'x-admin-pin': activePin,
          },
        });
        const json = await res.json();

        if (res.status === 401 || json.unauthorized) {
          setIsAuthorized(false);
          setPinError('PIN Admin tidak valid. Silakan masukkan PIN yang benar.');
          sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
          stopViolationAlarm();
          return;
        }

        if (json.success) {
          setIsAuthorized(true);
          setPinError('');
          sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, activePin);

          setPesertaList(json.data || []);
          const incomingAlerts: ActiveViolationAlert[] = json.activeAlerts || [];
          setActiveAlerts(incomingAlerts);

          // Jika ada alert aktif yang belum di-silence oleh Admin, bunyikan alarm.wav di komputer Admin
          const hasUnsilencedAlert = incomingAlerts.some(
            (a) => !silencedAlertIdsRef.current.has(a.id)
          );
          if (hasUnsilencedAlert) {
            playViolationAlarm(true);
          } else if (incomingAlerts.length === 0) {
            stopViolationAlarm();
          }

          setLastUpdated(json.updatedAt || new Date().toLocaleTimeString('id-ID'));
          setErrorMessage('');
        } else {
          setErrorMessage(json.error || 'Gagal memuat data monitoring.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal menghubungi server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminPin]
  );

  // Pulihkan PIN Admin dari sessionStorage bila sudah pernah login di tab ini
  useEffect(() => {
    try {
      const savedPin = sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY);
      if (savedPin) {
        setAdminPin(savedPin);
        setPinInput(savedPin);
        fetchMonitoringData(false, savedPin);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [fetchMonitoringData]);

  // Matikan bunyi alarm & hapus alert dari antrean server (wajib menyertakan x-admin-pin)
  const handleDismissAlert = async (alertId: string) => {
    silencedAlertIdsRef.current.add(alertId);
    stopViolationAlarm();

    if (alertId === 'ALL') {
      activeAlerts.forEach((a) => silencedAlertIdsRef.current.add(a.id));
      setActiveAlerts([]);
    } else {
      const remaining = activeAlerts.filter((a) => a.id !== alertId);
      setActiveAlerts(remaining);
      const stillHasUnsilenced = remaining.some(
        (a) => !silencedAlertIdsRef.current.has(a.id)
      );
      if (stillHasUnsilenced) {
        playViolationAlarm(true);
      }
    }

    fetch('/api/log', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
      },
      body: JSON.stringify({ alertId }),
    }).catch(() => { });
  };

  // Handler Approve / Revoke Kompetensi & Wawancara
  const handleApproveAction = async (
    type:
      | 'APPROVE_KOMPETENSI'
      | 'REVOKE_KOMPETENSI'
      | 'APPROVE_WAWANCARA'
      | 'REVOKE_WAWANCARA',
    peserta?: PesertaMonitoring,
    batchRows?: { rowNumber: number; namaPeserta: string }[]
  ) => {
    setActionLoadingRow(batchRows ? 'ALL' : peserta?.rowNumber || null);
    try {
      const res = await fetch('/api/monitoring', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          type,
          rowNumber: peserta?.rowNumber,
          namaPeserta: peserta?.namaPeserta,
          rows: batchRows,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMonitoringData(true);
      } else {
        alert(json.error || 'Gagal memperbarui status approve.');
      }
    } catch {
      alert('Gagal menghubungi server.');
    } finally {
      setActionLoadingRow(null);
    }
  };

  // Poll data dari Google Sheets setiap 10 detik (hanya jika sudah terautentikasi sebagai Admin)
  useEffect(() => {
    if (!isAuthorized || !adminPin) return;
    const pollInterval = setInterval(() => {
      fetchMonitoringData(true, adminPin);
    }, 10000);
    return () => {
      clearInterval(pollInterval);
      stopViolationAlarm();
    };
  }, [isAuthorized, adminPin, fetchMonitoringData]);

  // Efek detak 1 detik untuk mengurangi sisaDetik secara live bagi peserta yang masih SEDANG MENGERJAKAN
  useEffect(() => {
    const tick = setInterval(() => {
      setPesertaList((prev) =>
        prev.map((p) => {
          const isFinished = p.statusUjian.toUpperCase().includes('SELESAI');
          if (isFinished || p.sisaDetik <= 0) return p;
          return {
            ...p,
            sisaDetik: Math.max(0, p.sisaDetik - 1),
          };
        })
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Filter dasar berdasarkan Posisi & Search Query
  const baseFiltered = pesertaList.filter((p) => {
    const matchPosisi =
      filterPosisi === 'SEMUA' ||
      p.posisiDilamar.toLowerCase() === filterPosisi.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.namaPeserta.toLowerCase().includes(q) ||
      p.posisiDilamar.toLowerCase().includes(q);

    return matchPosisi && matchQuery;
  });

  // 1. Daftar untuk Tab MONITORING UJIAN (dipertahankan seperti semula)
  const filteredMonitoringPeserta = baseFiltered
    .filter((p) => {
      const isDone = p.statusUjian.toUpperCase().includes('SELESAI');
      return (
        filterStatus === 'SEMUA' ||
        (filterStatus === 'SELESAI' && isDone) ||
        (filterStatus === 'AKTIF' && !isDone)
      );
    })
    .sort((a, b) => {
      const aDone = a.statusUjian.toUpperCase().includes('SELESAI') ? 1 : 0;
      const bDone = b.statusUjian.toUpperCase().includes('SELESAI') ? 1 : 0;
      if (aDone !== bDone) {
        return aDone - bDone;
      }
      return b.id - a.id;
    });

  // 2. Daftar untuk Tab APPROVE KOMPETENSI (Peserta yang belum di-approve ditaruh paling atas)
  const filteredApproveKompetensi = [...baseFiltered].sort((a, b) => {
    const aPriority = !a.kompetensiApproved ? 0 : a.statusUjian ? 2 : 1;
    const bPriority = !b.kompetensiApproved ? 0 : b.statusUjian ? 2 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.id - a.id;
  });

  // 3. Daftar untuk Tab APPROVE WAWANCARA (Peserta yang belum wawancara ditaruh paling atas)
  const filteredApproveWawancara = [...baseFiltered].sort((a, b) => {
    const aDone = a.wawancaraApproved ? 1 : 0;
    const bDone = b.wawancaraApproved ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return b.id - a.id;
  });

  // Hitung badge counter untuk Sidebar
  const waitingKompetensiCount = pesertaList.filter(
    (p) => !p.kompetensiApproved && !p.statusUjian
  ).length;
  const waitingWawancaraCount = pesertaList.filter((p) => !p.wawancaraApproved).length;

  const getPosisiBadgeColor = (posisi: string) => {
    const pos = posisi.toUpperCase();
    if (pos.includes('PUBLISITAS') || pos.includes('HUMAS')) {
      return 'bg-[#F7941D] text-slate-950';
    }
    if (pos.includes('KEUANGAN')) {
      return 'bg-[#8CC63F] text-slate-950';
    }
    return 'bg-[#00AEEF] text-white';
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pinInput.trim();
    if (!trimmed) {
      setPinError('Mohon masukkan PIN Admin terlebih dahulu.');
      return;
    }
    setAdminPin(trimmed);
    setLoading(true);
    fetchMonitoringData(false, trimmed);
  };

  const handleLogoutAdmin = () => {
    stopViolationAlarm();
    sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
    setIsAuthorized(false);
    setAdminPin('');
    setPinInput('');
    setPesertaList([]);
    setActiveAlerts([]);
  };

  // GERBANG KEAMANAN PIN ADMIN (Mencegah peserta mengakses /monitoring tanpa izin)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <div className="grid grid-cols-3 h-1.5 w-full">
          <div className="bg-[#00AEEF]" />
          <div className="bg-[#8CC63F]" />
          <div className="bg-[#F7941D]" />
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-slate-200/90 max-w-md w-full shadow-xl overflow-hidden">
            <div className="h-2 w-full bg-[#00AEEF]" />

            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-xs md:text-sm">
                Login Admin MagangHub BPS
              </span>
              <span className="bg-[#F7941D] text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                7312
              </span>
            </div>

            <form onSubmit={handlePinSubmit} className="p-6 md:p-7 space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="font-extrabold text-slate-900 text-base md:text-lg leading-snug">
                    Verifikasi PIN Monitoring
                  </h1>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">
                    Masukkan PIN Admin untuk membuka dashboard pantauan peserta dan kontrol alarm.
                  </p>
                </div>
              </div>

              {pinError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3.5 text-xs font-bold text-red-700 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    !
                  </span>
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  PIN Admin
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Masukkan PIN Admin..."
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-50 focus:bg-white rounded-xl border-2 border-slate-200 focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15 font-bold text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={refreshing}
                  className="flex-1 bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-50 text-slate-950 font-bold uppercase text-xs tracking-wider py-3.5 px-4 rounded-xl shadow-sm hover:shadow cursor-pointer transition-all"
                >
                  {refreshing ? 'Memverifikasi...' : 'Buka Monitoring'}
                </button>
                <Link
                  href="/"
                  className="bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider py-3.5 px-4 rounded-xl border-2 border-slate-200 transition-all"
                >
                  Kembali
                </Link>
              </div>
            </form>
          </div>
        </div>

        <footer className="text-center py-4 space-y-1 z-10">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* TOP COLOR BAR BPS */}
      <div className="grid grid-cols-3 h-1.5 w-full sticky top-0 z-40">
        <div className="bg-[#00AEEF]" />
        <div className="bg-[#8CC63F]" />
        <div className="bg-[#F7941D]" />
      </div>

      {/* HEADER DASHBOARD MONITORING */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs sticky top-1.5 z-30 px-4 md:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/BPSIndonesia.svg"
                alt="Logo BPS"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg md:text-xl tracking-tight leading-snug">
                Dashboard Monitoring &amp; Approve Seleksi{' '}
                <span className="text-[#0284C7]">• BPS Soppeng</span>
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Pantauan Ujian Real-Time, Approve Akses Kompetensi, &amp; Approve Wawancara
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-[#00AEEF] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Sinkron:</span>
              <span className="font-mono font-bold text-slate-900">{lastUpdated}</span>
            </div>

            <button
              type="button"
              onClick={() => fetchMonitoringData(false)}
              disabled={refreshing}
              className="bg-[#00AEEF] hover:bg-[#0299D4] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              <span>{refreshing ? 'Memuat...' : 'Refresh Data'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogoutAdmin}
              title="Keluar dari Sesi Admin"
              className="bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT UTAMA: SIDEBAR DOCK MENTOK KIRI + KONTEN KANAN */}
      <div className="flex-1 w-full flex flex-col lg:flex-row items-start">
        {/* ================================================================= */}
        {/* SIDEBAR NAVIGASI ADMIN (CURVED DOCK MENTOK KIRI TERBUKA & TERTUTUP) */}
        {/* ================================================================= */}
        <aside
          className={`w-full ${isSidebarCollapsed
            ? 'lg:w-16 bg-[#00AEEF] text-white shadow-xl'
            : 'lg:w-72 bg-white text-slate-800 border-y-2 border-r-2 border-slate-200/90 shadow-lg'
            } lg:my-8 lg:rounded-r-[36px] shrink-0 lg:sticky lg:top-24 transition-all duration-300 ease-in-out relative z-20`}
        >
          {/* Ornamen Lengkungan Halus Atas & Bawah (Menyesuaikan Warna Terbuka Putih / Tertutup Biru) */}
          <div
            aria-hidden="true"
            className={`hidden lg:block absolute -top-7 left-0 w-7 h-7 bg-transparent rounded-bl-3xl pointer-events-none transition-all duration-300 ${isSidebarCollapsed
              ? 'shadow-[-10px_10px_0_0_#00AEEF]'
              : 'shadow-[-10px_10px_0_0_#ffffff] border-l-2 border-b-2 border-slate-200/90'
              }`}
          />
          <div
            aria-hidden="true"
            className={`hidden lg:block absolute -bottom-7 left-0 w-7 h-7 bg-transparent rounded-tl-3xl pointer-events-none transition-all duration-300 ${isSidebarCollapsed
              ? 'shadow-[-10px_-10px_0_0_#00AEEF]'
              : 'shadow-[-10px_-10px_0_0_#ffffff] border-l-2 border-t-2 border-slate-200/90'
              }`}
          />

          {/* Header Sidebar + Tombol Hide / Expand */}
          <div
            className={`flex items-center ${isSidebarCollapsed
              ? 'pt-5 pb-2 px-2 justify-center'
              : 'pt-5 pb-3.5 px-4 justify-between border-b border-slate-200/80'
              }`}
          >
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-[#00AEEF]/12 text-[#0284C7] flex items-center justify-center shrink-0">
                  <svg
                    className="w-4.5 h-4.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 truncate">
                    Panel Admin
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 truncate">
                    Kontrol Seleksi BPS
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'Buka Panel Sidebar' : 'Kecilkan ke Samping Kiri'}
              className={`flex items-center justify-center cursor-pointer transition-all shrink-0 ${isSidebarCollapsed
                ? 'w-11 h-11 rounded-2xl bg-white text-[#00AEEF] shadow-md hover:scale-105'
                : 'w-9 h-9 rounded-xl bg-slate-100 hover:bg-[#00AEEF] text-slate-600 hover:text-white shadow-2xs'
                }`}
            >
              {isSidebarCollapsed ? (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              )}
            </button>
          </div>

          <div
            className={
              isSidebarCollapsed
                ? 'py-4 px-2 flex lg:flex-col items-center justify-center gap-3.5'
                : 'p-3.5 space-y-2'
            }
          >
            {/* MENU 1: MONITORING UJIAN */}
            <button
              type="button"
              onClick={() => setActiveTab('MONITORING')}
              title={`Monitoring Ujian (${pesertaList.length} Peserta)`}
              className={`transition-all cursor-pointer relative ${isSidebarCollapsed
                ? `w-11 h-11 rounded-2xl flex items-center justify-center ${activeTab === 'MONITORING'
                  ? 'bg-white text-[#00AEEF] shadow-md'
                  : 'text-white/85 hover:bg-white/15 hover:text-white'
                }`
                : `w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2.5 ${activeTab === 'MONITORING'
                  ? 'bg-[#00AEEF] border-[#00AEEF] text-white shadow-sm'
                  : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                }`
                }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <svg
                    className="w-5 h-5 stroke-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                  {pesertaList.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-slate-900 text-white text-[9px] font-extrabold flex items-center justify-center rounded-full border border-white">
                      {pesertaList.length}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'MONITORING'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#00AEEF]/12 text-[#0284C7]'
                        }`}
                    >
                      <svg
                        className="w-4 h-4 stroke-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 20V10" />
                        <path d="M12 20V4" />
                        <path d="M6 20v-6" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs uppercase leading-tight truncate">
                        Monitoring Ujian
                      </p>
                      <p
                        className={`text-[10px] font-medium mt-0.5 truncate ${activeTab === 'MONITORING' ? 'text-white/85' : 'text-slate-500'
                          }`}
                      >
                        Pantau waktu &amp; alarm
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${activeTab === 'MONITORING'
                      ? 'bg-white text-[#0284C7]'
                      : 'bg-slate-200/80 text-slate-700'
                      }`}
                  >
                    {pesertaList.length}
                  </span>
                </>
              )}
            </button>

            {/* MENU 2: APPROVE TES KOMPETENSI */}
            <button
              type="button"
              onClick={() => setActiveTab('APPROVE_KOMPETENSI')}
              title={`Approve Kompetensi (${waitingKompetensiCount} Menunggu)`}
              className={`transition-all cursor-pointer relative ${isSidebarCollapsed
                ? `w-11 h-11 rounded-2xl flex items-center justify-center ${activeTab === 'APPROVE_KOMPETENSI'
                  ? 'bg-white text-[#00AEEF] shadow-md'
                  : 'text-white/85 hover:bg-white/15 hover:text-white'
                }`
                : `w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2.5 ${activeTab === 'APPROVE_KOMPETENSI'
                  ? 'bg-[#8CC63F] border-[#8CC63F] text-slate-950 shadow-sm'
                  : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                }`
                }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <svg
                    className="w-5 h-5 stroke-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                  {waitingKompetensiCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-[#8CC63F] text-slate-950 text-[9px] font-extrabold flex items-center justify-center rounded-full border border-white">
                      {waitingKompetensiCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'APPROVE_KOMPETENSI'
                        ? 'bg-slate-950/10 text-slate-950'
                        : 'bg-[#8CC63F]/20 text-[#3F6212]'
                        }`}
                    >
                      <svg
                        className="w-4 h-4 stroke-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8" />
                        <path d="M12 17v4" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs uppercase leading-tight truncate">
                        Approve Kompetensi
                      </p>
                      <p
                        className={`text-[10px] font-medium mt-0.5 truncate ${activeTab === 'APPROVE_KOMPETENSI' ? 'text-slate-800' : 'text-slate-500'
                          }`}
                      >
                        Izinkan akses mulai ujian
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${waitingKompetensiCount > 0
                      ? 'bg-[#F7941D] text-slate-950'
                      : 'bg-white/80 text-slate-700'
                      }`}
                  >
                    {waitingKompetensiCount}
                  </span>
                </>
              )}
            </button>

            {/* MENU 3: APPROVE TES WAWANCARA */}
            <button
              type="button"
              onClick={() => setActiveTab('APPROVE_WAWANCARA')}
              title={`Approve Wawancara (${waitingWawancaraCount} Belum Wawancara)`}
              className={`transition-all cursor-pointer relative ${isSidebarCollapsed
                ? `w-11 h-11 rounded-2xl flex items-center justify-center ${activeTab === 'APPROVE_WAWANCARA'
                  ? 'bg-white text-[#00AEEF] shadow-md'
                  : 'text-white/85 hover:bg-white/15 hover:text-white'
                }`
                : `w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2.5 ${activeTab === 'APPROVE_WAWANCARA'
                  ? 'bg-[#F7941D] border-[#F7941D] text-slate-950 shadow-sm'
                  : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                }`
                }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <svg
                    className="w-5 h-5 stroke-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  {waitingWawancaraCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-[#F7941D] text-slate-950 text-[9px] font-extrabold flex items-center justify-center rounded-full border border-white">
                      {waitingWawancaraCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'APPROVE_WAWANCARA'
                        ? 'bg-slate-950/10 text-slate-950'
                        : 'bg-[#F7941D]/15 text-[#D97706]'
                        }`}
                    >
                      <svg
                        className="w-4 h-4 stroke-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs uppercase leading-tight truncate">
                        Approve Wawancara
                      </p>
                      <p
                        className={`text-[10px] font-medium mt-0.5 truncate ${activeTab === 'APPROVE_WAWANCARA' ? 'text-slate-800' : 'text-slate-500'
                          }`}
                      >
                        Verifikasi selesai wawancara
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${waitingWawancaraCount > 0
                      ? 'bg-[#00AEEF] text-white'
                      : 'bg-white/80 text-slate-700'
                      }`}
                  >
                    {waitingWawancaraCount}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Info Singkat Alur di Bawah Sidebar (Hanya tampil saat tidak di-collapse) */}
          {!isSidebarCollapsed && (
            <div className="mx-3.5 mb-5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] font-medium text-slate-600 space-y-1.5 leading-snug">
              <p className="font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F7941D]" />
                Catatan Sistem
              </p>
              <p>
                • Approve Kompetensi dilakukan Operator ruangan seleksi dan di approve Ketika peserta telah berada diruangan seleksi.
              </p>
              <p>
                • ketika peserta telah di Approve minta peserta untuk menekan tombol refresh kartu ujiannya agar dapat memulai ujian kompetensinya.
              </p>
              <p>
                • Waktu Ujian seleksi Peserta Baru berjalan pada saat peserta menekan tombol mulai ujian.
              </p>
              <p>
                • Jika Operator ruangan ujian ingin memperlihatkan Monitoring dalam ruangan diharapkan Untk memblur identitas peserta agar peserta lain tidak dapat melihat email dari peserta lain.
              </p>
              <p>
                • Setelah melakukan wawancara diharapkan langsung melakukan approve agar peserta dapat melanjutkan tahap berikutnya.
              </p>
            </div>
          )}
        </aside>

        {/* ================================================================= */}
        {/* AREA KONTEN UTAMA (OTOMATIS MELEBAR SAAT SIDEBAR DI-HIDE)         */}
        {/* ================================================================= */}
        <main className="flex-1 min-w-0 w-full p-4 md:p-6 lg:p-8 space-y-5">
          {/* BAR FILTER & PENCARIAN */}
          <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-4 md:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {/* Filter Posisi */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">
                Posisi:
              </span>
              {(['SEMUA', ...POSISI_OPTIONS] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setFilterPosisi(pos)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${filterPosisi === pos
                    ? 'bg-[#00AEEF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                    }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Filter Status & Search */}
            <div className="flex flex-wrap items-center gap-3 ml-auto">
              {activeTab === 'MONITORING' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsIdentityBlurred((prev) => !prev)}
                    title={
                      isIdentityBlurred
                        ? 'Tampilkan Nama & Email Peserta'
                        : 'Samarkan (Blur) Nama & Email Peserta'
                    }
                    className={`px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${isIdentityBlurred
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                  >
                    {isIdentityBlurred ? (
                      <svg
                        className="w-4 h-4 text-[#00AEEF] shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-slate-500 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                    <span>{isIdentityBlurred ? 'Identitas Diblur' : 'Blur Identitas'}</span>
                  </button>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-800 cursor-pointer focus:outline-none focus:border-[#00AEEF]"
                  >
                    <option value="SEMUA">Semua Status</option>
                    <option value="AKTIF">Sedang Mengerjakan</option>
                    <option value="SELESAI">Sudah Selesai</option>
                  </select>
                </>
              )}

              {activeTab === 'APPROVE_KOMPETENSI' && (
                <button
                  type="button"
                  onClick={() => setIsKompetensiEmailBlurred((prev) => !prev)}
                  title={
                    isKompetensiEmailBlurred
                      ? 'Tampilkan Email Peserta'
                      : 'Samarkan (Blur) Email Peserta'
                  }
                  className={`px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${isKompetensiEmailBlurred
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                >
                  {isKompetensiEmailBlurred ? (
                    <svg
                      className="w-4 h-4 text-[#8CC63F] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-slate-500 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                  <span>{isKompetensiEmailBlurred ? 'Email Diblur' : 'Blur Email'}</span>
                </button>
              )}

              <div className="relative">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama peserta..."
                  className="pl-9 pr-4 py-2.5 bg-slate-50 focus:bg-white rounded-xl border-2 border-slate-200 focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none w-56 md:w-64 transition-all"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-4 font-bold text-xs md:text-sm flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                !
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* BANNER ALARM PELANGGARAN AKTIF (SELALU TAMPIL DI ATAS AGAR ADMIN LANGSUNG TAHU) */}
          {activeAlerts.length > 0 && (
            <div className="bg-red-600 rounded-3xl border-2 border-red-700 p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/60 pb-3.5">
                <div className="flex items-center gap-3">
                  <span className="bg-[#F7941D] text-slate-950 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider animate-bounce shadow-xs">
                    Alarm Berbunyi
                  </span>
                  <h2 className="text-white font-extrabold text-sm md:text-base tracking-tight">
                    Terdeteksi Peserta Berpindah Tab ({activeAlerts.length} Peringatan Aktif)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismissAlert('ALL')}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  Matikan Semua Alarm
                </button>
              </div>

              <div className="space-y-2.5">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white rounded-2xl p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">
                          {alert.namaPeserta}
                        </p>
                        {alert.posisiDilamar && (
                          <span className="text-[11px] font-bold bg-[#F7941D] text-slate-950 px-2.5 py-0.5 rounded-full">
                            {alert.posisiDilamar}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-red-600 mt-0.5">
                        {alert.jenisPelanggaran} • Pukul {alert.waktu}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="bg-[#8CC63F] hover:bg-[#7BB335] text-slate-950 text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-2xs cursor-pointer transition-all"
                    >
                      Matikan Alarm Ini
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 1: MONITORING UJIAN                                         */}
          {/* =============================================================== */}
          {activeTab === 'MONITORING' && (
            <>
              {loading ? (
                <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-12 text-center shadow-sm">
                  <div className="inline-block bg-[#00AEEF] text-white rounded-xl px-5 py-2.5 font-bold uppercase tracking-wider text-xs shadow-sm animate-pulse">
                    Memuat Data Monitoring Peserta...
                  </div>
                </div>
              ) : filteredMonitoringPeserta.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-12 text-center shadow-sm">
                  <p className="text-sm md:text-base font-bold text-slate-500">
                    Belum ada data peserta yang sesuai dengan filter.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md overflow-hidden">
                  <div className="h-1.5 w-full bg-[#00AEEF]" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 border-r border-slate-800 text-center w-14">
                            No
                          </th>
                          <th className="py-3.5 px-4 border-r border-slate-800">Nama Peserta</th>
                          <th className="py-3.5 px-4 border-r border-slate-800">Formasi Posisi</th>
                          <th className="py-3.5 px-4 border-r border-slate-800">
                            Waktu Mulai &amp; Batas
                          </th>
                          <th className="py-3.5 px-4 border-r border-slate-800 text-center">
                            Sisa Waktu (Live)
                          </th>
                          <th className="py-3.5 px-4 border-r border-slate-800">
                            Progres Soal Selesai
                          </th>
                          <th className="py-3.5 px-4 text-center">Status Ujian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs md:text-sm font-medium text-slate-800">
                        {filteredMonitoringPeserta.map((p, index) => {
                          const isDone = p.statusUjian.toUpperCase().includes('SELESAI');
                          const isWorking = p.statusUjian.toUpperCase().includes('SEDANG');
                          const pct =
                            p.totalSoal > 0
                              ? Math.min(100, Math.round((p.terjawab / p.totalSoal) * 100))
                              : 0;
                          const pesertaActiveAlert = activeAlerts.find(
                            (a) => a.namaPeserta.toLowerCase() === p.namaPeserta.toLowerCase()
                          );

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${pesertaActiveAlert
                                ? 'bg-red-50 hover:bg-red-100/70'
                                : isDone
                                  ? 'bg-[#F4FCEB]/50 hover:bg-[#F4FCEB]'
                                  : 'bg-white hover:bg-slate-50/90'
                                }`}
                            >
                              <td className="py-4 px-4 border-r border-slate-100 font-bold text-slate-500 text-center">
                                {index + 1}
                              </td>

                              {/* Nama Peserta */}
                              <td className="py-4 px-4 border-r border-slate-100">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p
                                    className={`font-bold text-slate-900 text-sm transition-all ${isIdentityBlurred ? 'blur-xs select-none' : ''
                                      }`}
                                  >
                                    {p.namaPeserta}
                                  </p>
                                  {pesertaActiveAlert && (
                                    <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                                      Alarm Berbunyi!
                                    </span>
                                  )}
                                </div>
                                {(p.emailPeserta || p.teleponPeserta) && (
                                  <p
                                    className={`text-[11px] font-medium text-slate-500 mt-0.5 transition-all ${isIdentityBlurred ? 'blur-xs select-none' : ''
                                      }`}
                                  >
                                    {p.emailPeserta}{' '}
                                    {p.teleponPeserta ? `• ${p.teleponPeserta}` : ''}
                                  </p>
                                )}
                              </td>

                              {/* Posisi */}
                              <td className="py-4 px-4 border-r border-slate-100">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${getPosisiBadgeColor(
                                    p.posisiDilamar
                                  )}`}
                                >
                                  {p.posisiDilamar}
                                </span>
                              </td>

                              {/* Waktu Mulai & Batas */}
                              <td className="py-4 px-4 border-r border-slate-100 text-xs">
                                <p>
                                  <span className="font-bold text-slate-500">Mulai:</span>{' '}
                                  <span className="font-semibold text-slate-800">
                                    {p.waktuMulai}
                                  </span>
                                </p>
                                <p className="mt-0.5">
                                  <span className="font-bold text-slate-500">Batas:</span>{' '}
                                  <span className="font-semibold text-slate-800">
                                    {p.batasSelesai}
                                  </span>
                                </p>
                              </td>

                              {/* Sisa Waktu Live */}
                              <td className="py-4 px-4 border-r border-slate-100 text-center">
                                {isWorking || isDone ? (
                                  <>
                                    <div
                                      className={`inline-block px-3.5 py-1.5 rounded-xl font-mono text-sm md:text-base font-extrabold shadow-2xs ${isDone
                                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                        : p.sisaDetik < 300
                                          ? 'bg-red-600 text-white animate-pulse'
                                          : 'bg-[#F7941D] text-slate-950'
                                        }`}
                                    >
                                      {formatTime(p.sisaDetik)}
                                    </div>
                                    {isDone && (
                                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                        Sisa Saat Kumpul
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">
                                    Belum Mulai
                                  </span>
                                )}
                              </td>

                              {/* Progres Pengerjaan */}
                              <td className="py-4 px-4 border-r border-slate-100 min-w-[180px]">
                                {isWorking || isDone ? (
                                  <>
                                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                        {p.terjawab} / {p.totalSoal} Soal
                                      </span>
                                      <span className="text-slate-700 font-extrabold">{pct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                                      <div
                                        className="h-full bg-[#8CC63F] rounded-full transition-all duration-300"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">-</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4 text-center">
                                {isDone ? (
                                  <span className="inline-block bg-[#8CC63F] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-2xs">
                                    Selesai
                                  </span>
                                ) : isWorking ? (
                                  <span className="inline-block bg-[#00AEEF] text-white px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-2xs">
                                    Sedang Ujian
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Belum Mulai
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* =============================================================== */}
          {/* TAB 2: APPROVE AKSES TES SELEKSI KOMPETENSI                     */}
          {/* =============================================================== */}
          {activeTab === 'APPROVE_KOMPETENSI' && (
            <div className="space-y-4">
              {/* Header Bar Approve Kompetensi + Tombol Approve Semua */}
              <div className="bg-white rounded-3xl border-2 border-[#8CC63F]/55 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="w-10 h-10 rounded-2xl bg-[#8CC63F] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-sm md:text-base">
                      Panel Persetujuan (Approve) Akses Tes Seleksi Kompetensi
                    </h2>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      Setujui akses peserta yang sudah berada di ruangan ujian agar tombol{' '}
                      <strong className="text-slate-900">Mulai Ujian Sekarang</strong> aktif di
                      layar peserta.
                    </p>
                  </div>
                </div>

                {waitingKompetensiCount > 0 && (
                  <button
                    type="button"
                    disabled={actionLoadingRow === 'ALL'}
                    onClick={() => {
                      const unapprovedRows = pesertaList
                        .filter((p) => !p.kompetensiApproved && !p.statusUjian)
                        .map((p) => ({
                          rowNumber: p.rowNumber,
                          namaPeserta: p.namaPeserta,
                        }));
                      handleApproveAction('APPROVE_KOMPETENSI', undefined, unapprovedRows);
                    }}
                    className="bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-xl shadow-xs hover:shadow cursor-pointer shrink-0 transition-all"
                  >
                    {actionLoadingRow === 'ALL'
                      ? 'Memproses...'
                      : `Approve Semua (${waitingKompetensiCount} Peserta)`}
                  </button>
                )}
              </div>

              <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md overflow-hidden">
                <div className="h-1.5 w-full bg-[#8CC63F]" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4 border-r border-slate-800 text-center w-14">
                          No
                        </th>
                        <th className="py-3.5 px-4 border-r border-slate-800">Nama Peserta</th>
                        <th className="py-3.5 px-4 border-r border-slate-800">Formasi Posisi</th>
                        <th className="py-3.5 px-4 border-r border-slate-800 text-center">
                          Status Wawancara
                        </th>
                        <th className="py-3.5 px-4 border-r border-slate-800 text-center">
                          Status Ujian Kompetensi
                        </th>
                        <th className="py-3.5 px-4 text-center">Aksi Approve Akses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs md:text-sm font-medium text-slate-800">
                      {filteredApproveKompetensi.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center font-bold text-slate-500">
                            Belum ada peserta terdaftar.
                          </td>
                        </tr>
                      ) : (
                        filteredApproveKompetensi.map((p, idx) => {
                          const isDone = p.statusUjian.toUpperCase().includes('SELESAI');
                          const isWorking = p.statusUjian.toUpperCase().includes('SEDANG');
                          const isRowLoading = actionLoadingRow === p.rowNumber;

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${!p.kompetensiApproved && !p.statusUjian
                                ? 'bg-amber-50/60 hover:bg-amber-50'
                                : 'bg-white hover:bg-slate-50/90'
                                }`}
                            >
                              <td className="py-4 px-4 border-r border-slate-100 font-bold text-slate-500 text-center">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100">
                                <p className="font-bold text-slate-900 text-sm">{p.namaPeserta}</p>
                                {(p.emailPeserta || p.teleponPeserta) && (
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    {p.emailPeserta && (
                                      <span
                                        className={`transition-all ${isKompetensiEmailBlurred ? 'blur-xs select-none' : ''
                                          }`}
                                      >
                                        {p.emailPeserta}
                                      </span>
                                    )}{' '}
                                    {p.teleponPeserta ? `• ${p.teleponPeserta}` : ''}
                                  </p>
                                )}
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${getPosisiBadgeColor(
                                    p.posisiDilamar
                                  )}`}
                                >
                                  {p.posisiDilamar}
                                </span>
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100 text-center">
                                {p.wawancaraApproved ? (
                                  <span className="inline-block bg-[#8CC63F] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Sudah Wawancara
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Belum Wawancara
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100 text-center">
                                {isDone ? (
                                  <span className="inline-block bg-[#8CC63F] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Selesai Ujian
                                  </span>
                                ) : isWorking ? (
                                  <span className="inline-block bg-[#00AEEF] text-white px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Sedang Mengerjakan
                                  </span>
                                ) : p.kompetensiApproved ? (
                                  <span className="inline-block bg-[#F0F9FF] border border-[#00AEEF]/40 text-[#0284C7] px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Disetujui (Belum Klik Mulai)
                                  </span>
                                ) : (
                                  <span className="inline-block bg-[#F7941D] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Menunggu Approve
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                {isDone || isWorking ? (
                                  <span className="text-xs font-bold text-slate-400">
                                    Sesi Ujian Aktif / Selesai
                                  </span>
                                ) : !p.kompetensiApproved ? (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('APPROVE_KOMPETENSI', p)}
                                    className="bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
                                  >
                                    {isRowLoading ? 'Memproses...' : 'Approve Akses Ujian'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('REVOKE_KOMPETENSI', p)}
                                    className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 font-bold uppercase tracking-wider text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all"
                                  >
                                    {isRowLoading ? '...' : 'Batalkan Approve'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: APPROVE TES WAWANCARA                                    */}
          {/* =============================================================== */}
          {activeTab === 'APPROVE_WAWANCARA' && (
            <div className="space-y-4">
              {/* Header Bar Approve Wawancara */}
              <div className="bg-white rounded-3xl border-2 border-[#F7941D]/55 p-5 shadow-sm flex items-start gap-3.5">
                <span className="w-10 h-10 rounded-2xl bg-[#F7941D] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                  <svg
                    className="w-5 h-5"
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
                  <h2 className="font-extrabold text-slate-900 text-sm md:text-base">
                    Panel Approve Kehadiran &amp; Selesai Tes Wawancara
                  </h2>
                  <p className="text-xs font-medium text-slate-600 mt-0.5 leading-relaxed">
                    Klik <strong className="text-slate-900">Approve Selesai Wawancara</strong> bagi
                    peserta yang telah mengikuti wawancara. Sistem akan mengisi kolom{' '}
                    <strong className="text-slate-900">Status Wawancara</strong> di Google Sheets
                    dan otomatis mengarahkan peserta ke Tes Seleksi Kompetensi (jika belum).
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md overflow-hidden">
                <div className="h-1.5 w-full bg-[#F7941D]" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4 border-r border-slate-800 text-center w-14">
                          No
                        </th>
                        <th className="py-3.5 px-4 border-r border-slate-800">Nama Peserta</th>
                        <th className="py-3.5 px-4 border-r border-slate-800">Formasi Posisi</th>
                        <th className="py-3.5 px-4 border-r border-slate-800 text-center">
                          Status Tes Kompetensi
                        </th>
                        <th className="py-3.5 px-4 border-r border-slate-800 text-center">
                          Status Wawancara
                        </th>
                        <th className="py-3.5 px-4 text-center">Aksi Approve Wawancara</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs md:text-sm font-medium text-slate-800">
                      {filteredApproveWawancara.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center font-bold text-slate-500">
                            Belum ada peserta terdaftar.
                          </td>
                        </tr>
                      ) : (
                        filteredApproveWawancara.map((p, idx) => {
                          const isKompetensiDone = p.statusUjian.toUpperCase().includes('SELESAI');
                          const isKompetensiWorking = p.statusUjian.toUpperCase().includes('SEDANG');
                          const isRowLoading = actionLoadingRow === p.rowNumber;

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${p.wawancaraApproved
                                ? 'bg-[#F4FCEB]/50 hover:bg-[#F4FCEB]'
                                : 'bg-white hover:bg-slate-50/90'
                                }`}
                            >
                              <td className="py-4 px-4 border-r border-slate-100 font-bold text-slate-500 text-center">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100">
                                <p className="font-bold text-slate-900 text-sm">{p.namaPeserta}</p>
                                {(p.emailPeserta || p.teleponPeserta) && (
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    {p.emailPeserta}{' '}
                                    {p.teleponPeserta ? `• ${p.teleponPeserta}` : ''}
                                  </p>
                                )}
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-2xs ${getPosisiBadgeColor(
                                    p.posisiDilamar
                                  )}`}
                                >
                                  {p.posisiDilamar}
                                </span>
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100 text-center">
                                {isKompetensiDone ? (
                                  <span className="inline-block bg-[#8CC63F] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Sudah Kompetensi
                                  </span>
                                ) : isKompetensiWorking ? (
                                  <span className="inline-block bg-[#00AEEF] text-white px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Sedang Ujian
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Belum Kompetensi
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 border-r border-slate-100 text-center">
                                {p.wawancaraApproved ? (
                                  <span className="inline-block bg-[#8CC63F] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    {p.statusWawancara || 'Sudah Wawancara'}
                                  </span>
                                ) : (
                                  <span className="inline-block bg-[#F7941D] text-slate-950 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                                    Belum Wawancara
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                {!p.wawancaraApproved ? (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('APPROVE_WAWANCARA', p)}
                                    className="bg-[#8CC63F] hover:bg-[#7BB335] disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
                                  >
                                    {isRowLoading ? 'Menyimpan...' : 'Approve Selesai Wawancara'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('REVOKE_WAWANCARA', p)}
                                    className="bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 font-bold uppercase tracking-wider text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all"
                                  >
                                    {isRowLoading ? '...' : 'Batalkan Approve'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="text-center py-4 space-y-1 z-10 border-t border-slate-200/80 bg-white/60">
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
    </div>
  );
}
