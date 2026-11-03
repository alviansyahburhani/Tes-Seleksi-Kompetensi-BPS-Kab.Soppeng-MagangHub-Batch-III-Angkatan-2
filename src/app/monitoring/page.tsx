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

interface ResetAccountRequestItem {
  id: string;
  rowNumber: number;
  namaPeserta: string;
  emailPeserta: string;
  posisiDilamar: string;
  alasan?: string;
  waktu: string;
}

type SidebarMenuTab =
  | 'MONITORING'
  | 'APPROVE_KOMPETENSI'
  | 'APPROVE_WAWANCARA'
  | 'APPROVE_RESET_AKUN';

const ADMIN_PIN_STORAGE_KEY = 'bps_skd_admin_pin_v1';

export default function MonitoringAdminPage() {
  const [adminPin, setAdminPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinError, setPinError] = useState('');

  // Menu Sidebar Aktif & Mode Collapse (Hide tapi tetap muncul Icon)
  const [activeTab, setActiveTab] = useState<SidebarMenuTab>('MONITORING');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [actionLoadingRow, setActionLoadingRow] = useState<number | 'ALL' | null>(null);

  const [pesertaList, setPesertaList] = useState<PesertaMonitoring[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveViolationAlert[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetAccountRequestItem[]>([]);
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
          setResetRequests(json.resetRequests || []);

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

  // Handler Persetujuan / Penolakan Ganti Akun Peserta
  const handleResolveResetRequest = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoadingRow('ALL');
    try {
      const res = await fetch('/api/monitoring', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          type: 'RESOLVE_RESET_ACCOUNT',
          requestId,
          action,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchMonitoringData(true);
      } else {
        alert(json.error || 'Gagal memproses permohonan ganti akun.');
      }
    } catch {
      alert('Gagal menghubungi server.');
    } finally {
      setActionLoadingRow(null);
    }
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
    if (pos.includes('PUBLISITAS') || pos.includes('HUMAS')) return 'bg-[#F7941D]';
    if (pos.includes('KEUANGAN')) return 'bg-[#8CC63F]';
    return 'bg-[#00AEEF]';
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
      <div className="min-h-screen bg-[#FFFDF7] flex flex-col">
        <div className="grid grid-cols-3 h-3 border-b-2 border-slate-950">
          <div className="bg-[#00AEEF]" />
          <div className="bg-[#8CC63F]" />
          <div className="bg-[#F7941D]" />
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-slate-950 max-w-md w-full shadow-[10px_10px_0px_0px_#0f172a] overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 border-b-4 border-slate-950 flex items-center justify-between">
              <span className="font-black uppercase tracking-wider text-sm">
                Login Admin MagangHub BPS
              </span>
              <span className="bg-[#F7941D] text-slate-950 text-xs font-black px-2 py-0.5 border border-white">
                7312
              </span>
            </div>

            <form onSubmit={handlePinSubmit} className="p-6 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-[#FFFDF7] border-3 border-slate-950 p-2 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
                  <img
                    src="/BPSIndonesia.svg"
                    alt="Logo BPS Indonesia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="font-black text-slate-950 text-lg uppercase leading-tight">
                    Verifikasi PIN Monitoring
                  </h1>
                  <p className="text-xs font-bold text-slate-600 mt-1">
                    Masukkan PIN Admin untuk membuka dashboard pantauan peserta dan kontrol alarm.
                  </p>
                </div>
              </div>

              {pinError && (
                <div className="bg-red-100 border-3 border-slate-950 p-3 text-xs font-black text-red-700 shadow-[3px_3px_0px_0px_#0f172a]">
                  ⚠️ {pinError}
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-slate-950 mb-1.5">
                  PIN Admin:
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Masukkan PIN Admin..."
                  autoFocus
                  className="w-full px-4 py-3 bg-[#FFFDF7] border-3 border-slate-950 font-black text-base text-slate-950 focus:outline-none focus:bg-[#E6F7FF] shadow-[4px_4px_0px_0px_#0f172a]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={refreshing}
                  className="flex-1 bg-[#8CC63F] hover:bg-[#9bd64d] text-slate-950 font-black uppercase text-xs tracking-wider py-3 px-4 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] cursor-pointer transition"
                >
                  {refreshing ? 'Memverifikasi...' : 'Buka Monitoring'}
                </button>
                <Link
                  href="/"
                  className="bg-white hover:bg-slate-100 text-slate-950 font-black uppercase text-xs tracking-wider py-3 px-4 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a]"
                >
                  Kembali
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col">
      {/* TOP COLOR BAR BPS */}
      <div className="grid grid-cols-3 h-3 border-b-2 border-slate-950">
        <div className="bg-[#00AEEF]" />
        <div className="bg-[#8CC63F]" />
        <div className="bg-[#F7941D]" />
      </div>

      {/* HEADER DASHBOARD MONITORING */}
      <header className="bg-white border-b-4 border-slate-950 sticky top-0 z-30 px-4 md:px-8 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[#FFFDF7] border-2 border-slate-950 p-1.5 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center shrink-0">
              <img
                src="/BPSIndonesia.svg"
                alt="Logo BPS"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-black text-slate-950 text-xl md:text-2xl uppercase tracking-tight leading-none">
                Dashboard Monitoring &amp; Approve Seleksi • BPS
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Pantauan Ujian Real-Time, Approve Akses Kompetensi, &amp; Approve Wawancara
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="bg-[#FFFDF7] border-2 border-slate-950 px-3 py-1.5 text-xs font-black text-slate-950">
              Sinkron Terakhir: <span className="font-mono">{lastUpdated}</span>
            </div>

            <button
              type="button"
              onClick={() => fetchMonitoringData(false)}
              disabled={refreshing}
              className="bg-[#00AEEF] hover:bg-[#24beff] disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
            >
              {refreshing ? 'Memuat...' : '↻ Refresh Sekarang'}
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT UTAMA: SIDEBAR KIRI (SUPER RAMPING & CLEAN SAAT DI-HIDE) + KONTEN KANAN */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-5 items-start">
        {/* ================================================================= */}
        {/* SIDEBAR NAVIGASI ADMIN (3 MENU UTAMA + TOMBOL HIDE/COLLAPSE)       */}
        {/* ================================================================= */}
        <aside
          className={`w-full ${isSidebarCollapsed
            ? 'lg:w-14 shadow-[4px_4px_0px_0px_#0f172a]'
            : 'lg:w-64 shadow-[8px_8px_0px_0px_#0f172a]'
            } shrink-0 bg-white border-3 border-slate-950 lg:sticky lg:top-24 transition-all duration-200`}
        >
          {/* Header Sidebar + Tombol Hide / Expand */}
          <div
            className={`bg-slate-950 text-white border-b-3 border-slate-950 flex items-center ${isSidebarCollapsed ? 'p-1.5 justify-center' : 'px-3 py-2.5 justify-between'
              }`}
          >
            {!isSidebarCollapsed && (
              <p className="text-[11px] font-black uppercase tracking-wider truncate pl-0.5">
                Panel Admin
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'Buka Sidebar' : 'Kecilkan Sidebar'}
              className="w-7 h-7 bg-[#FFFDF7] hover:bg-[#F7941D] text-slate-950 font-black text-xs border-2 border-slate-950 flex items-center justify-center cursor-pointer transition shrink-0"
            >
              {isSidebarCollapsed ? '»' : '«'}
            </button>
          </div>

          <div
            className={
              isSidebarCollapsed
                ? 'p-1.5 flex lg:flex-col items-center justify-center gap-2'
                : 'p-2.5 space-y-2'
            }
          >
            {/* MENU 1: MONITORING UJIAN (TETAP DIPERTAHANKAN 100%) */}
            <button
              type="button"
              onClick={() => setActiveTab('MONITORING')}
              title={`Monitoring Ujian (${pesertaList.length} Peserta)`}
              className={`border-2 border-slate-950 transition-all cursor-pointer relative ${isSidebarCollapsed
                ? 'w-9 h-9 flex items-center justify-center'
                : 'w-full p-3 text-left flex items-center justify-between gap-2'
                } ${activeTab === 'MONITORING'
                  ? 'bg-[#00AEEF] text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-[#FFFDF7] hover:bg-slate-100 text-slate-950'
                }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <svg
                    className="w-4 h-4 stroke-slate-950"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                  {pesertaList.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-slate-950 text-white text-[9px] font-black flex items-center justify-center rounded-full border border-white">
                      {pesertaList.length}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-white border-2 border-slate-950 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 stroke-slate-950"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 20V10" />
                        <path d="M12 20V4" />
                        <path d="M6 20v-6" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase leading-tight truncate">
                        Monitoring Ujian
                      </p>
                      <p className="text-[10px] font-bold text-slate-700 mt-0.5 truncate">
                        Pantau waktu &amp; alarm
                      </p>
                    </div>
                  </div>
                  <span className="bg-white border-2 border-slate-950 px-1.5 py-0.5 text-[11px] font-black shrink-0">
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
              className={`border-2 border-slate-950 transition-all cursor-pointer relative ${isSidebarCollapsed
                ? 'w-9 h-9 flex items-center justify-center'
                : 'w-full p-3 text-left flex items-center justify-between gap-2'
                } ${activeTab === 'APPROVE_KOMPETENSI'
                  ? 'bg-[#8CC63F] text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-[#FFFDF7] hover:bg-slate-100 text-slate-950'
                }`}
            >
              {isSidebarCollapsed ? (
                <>
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
                  {waitingKompetensiCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-[#F7941D] text-slate-950 text-[9px] font-black flex items-center justify-center rounded-full border border-slate-950">
                      {waitingKompetensiCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-white border-2 border-slate-950 flex items-center justify-center shrink-0">
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
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase leading-tight truncate">
                        Approve Kompetensi
                      </p>
                      <p className="text-[10px] font-bold text-slate-700 mt-0.5 truncate">
                        Izinkan akses mulai ujian
                      </p>
                    </div>
                  </div>
                  <span
                    className={`border-2 border-slate-950 px-1.5 py-0.5 text-[11px] font-black shrink-0 ${waitingKompetensiCount > 0
                      ? 'bg-[#F7941D] text-slate-950'
                      : 'bg-white text-slate-950'
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
              className={`border-2 border-slate-950 transition-all cursor-pointer relative ${isSidebarCollapsed
                ? 'w-9 h-9 flex items-center justify-center'
                : 'w-full p-3 text-left flex items-center justify-between gap-2'
                } ${activeTab === 'APPROVE_WAWANCARA'
                  ? 'bg-[#F7941D] text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-[#FFFDF7] hover:bg-slate-100 text-slate-950'
                }`}
            >
              {isSidebarCollapsed ? (
                <>
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
                  {waitingWawancaraCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-[#00AEEF] text-slate-950 text-[9px] font-black flex items-center justify-center rounded-full border border-slate-950">
                      {waitingWawancaraCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-white border-2 border-slate-950 flex items-center justify-center shrink-0">
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
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase leading-tight truncate">
                        Approve Wawancara
                      </p>
                      <p className="text-[10px] font-bold text-slate-700 mt-0.5 truncate">
                        Verifikasi selesai wawancara
                      </p>
                    </div>
                  </div>
                  <span
                    className={`border-2 border-slate-950 px-1.5 py-0.5 text-[11px] font-black shrink-0 ${waitingWawancaraCount > 0
                      ? 'bg-[#00AEEF] text-slate-950'
                      : 'bg-white text-slate-950'
                      }`}
                  >
                    {waitingWawancaraCount}
                  </span>
                </>
              )}
            </button>

            {/* MENU 4: APPROVE GANTI AKUN PESERTA */}
            <button
              type="button"
              onClick={() => setActiveTab('APPROVE_RESET_AKUN')}
              title={`Permohonan Ganti Akun (${resetRequests.length} Permohonan)`}
              className={`border-2 border-slate-950 transition-all cursor-pointer relative ${isSidebarCollapsed
                ? 'w-9 h-9 flex items-center justify-center'
                : 'w-full p-3 text-left flex items-center justify-between gap-2'
                } ${activeTab === 'APPROVE_RESET_AKUN'
                  ? 'bg-[#F7941D] text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-[#FFFDF7] hover:bg-slate-100 text-slate-950'
                }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <svg
                    className="w-4 h-4 stroke-slate-950"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 11l-3-3m0 0l-3 3m3-3v6" />
                  </svg>
                  {resetRequests.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border border-white animate-pulse">
                      {resetRequests.length}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-white border-2 border-slate-950 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 stroke-slate-950"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 11l-3-3m0 0l-3 3m3-3v6" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase leading-tight truncate">
                        Izin Ganti Akun
                      </p>
                      <p className="text-[10px] font-bold text-slate-700 mt-0.5 truncate">
                        Setujui / tolak reset peserta
                      </p>
                    </div>
                  </div>
                  <span
                    className={`border-2 border-slate-950 px-1.5 py-0.5 text-[11px] font-black shrink-0 ${resetRequests.length > 0
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white text-slate-950'
                      }`}
                  >
                    {resetRequests.length}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Info Singkat Alur di Bawah Sidebar (Hanya tampil saat tidak di-collapse) */}
          {!isSidebarCollapsed && (
            <div className="p-3 bg-[#FFF5E6] border-t-3 border-slate-950 text-[10px] font-bold text-slate-800 space-y-1 leading-snug">
              <p className="font-black uppercase text-slate-950">📌 Catatan:</p>
              <p>
                • Kolom Ujian &amp; Wawancara otomatis kosong saat peserta baru isi Daftar Hadir.
              </p>
              <p>
                • Timer 60 menit jalan saat peserta klik <strong>Mulai Ujian</strong>.
              </p>
            </div>
          )}
        </aside>

        {/* ================================================================= */}
        {/* AREA KONTEN UTAMA (OTOMATIS MELEBAR SAAT SIDEBAR DI-HIDE)         */}
        {/* ================================================================= */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {/* BAR FILTER & PENCARIAN */}
          <div className="bg-white border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_#0f172a] flex flex-wrap items-center justify-between gap-4">
            {/* Filter Posisi */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-950 mr-1">Posisi:</span>
              {(['SEMUA', ...POSISI_OPTIONS] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setFilterPosisi(pos)}
                  className={`px-3 py-1.5 border-2 border-slate-950 text-xs font-black uppercase cursor-pointer transition ${filterPosisi === pos
                    ? 'bg-slate-950 text-white shadow-[2px_2px_0px_0px_#00AEEF]'
                    : 'bg-[#FFFDF7] text-slate-950 hover:bg-slate-200'
                    }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Filter Status & Search */}
            <div className="flex flex-wrap items-center gap-3 ml-auto">
              {activeTab === 'MONITORING' && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-[#FFFDF7] border-2 border-slate-950 text-xs font-black uppercase text-slate-950 cursor-pointer"
                >
                  <option value="SEMUA">Semua Status</option>
                  <option value="AKTIF">Sedang Mengerjakan</option>
                  <option value="SELESAI">Sudah Selesai</option>
                </select>
              )}

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama peserta..."
                className="px-3.5 py-2 bg-[#FFFDF7] border-2 border-slate-950 text-xs font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none focus:bg-[#E6F7FF] w-56"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-500 text-white border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_#0f172a] font-black text-sm">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* BANNER ALARM PELANGGARAN AKTIF (SELALU TAMPIL DI ATAS AGAR ADMIN LANGSUNG TAHU) */}
          {activeAlerts.length > 0 && (
            <div className="bg-red-500 border-4 border-slate-950 p-4 md:p-5 shadow-[8px_8px_0px_0px_#0f172a] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-slate-950 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#F7941D] text-slate-950 border-2 border-slate-950 px-2.5 py-1 text-xs font-black uppercase animate-bounce">
                    🚨 ALARM BERBUNYI
                  </span>
                  <h2 className="text-white font-black text-sm md:text-base uppercase tracking-wide">
                    Terdeteksi Peserta Berpindah Tab ({activeAlerts.length} Peringatan Aktif)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismissAlert('ALL')}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase px-3.5 py-2 border-2 border-white cursor-pointer transition"
                >
                  🔇 Matikan Semua Alarm
                </button>
              </div>

              <div className="space-y-2">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-[#FFFDF7] border-3 border-slate-950 p-3 flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_0px_#0f172a]"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        🔊 {alert.namaPeserta}{' '}
                        {alert.posisiDilamar && (
                          <span className="text-xs font-black bg-[#F7941D] px-2 py-0.5 border border-slate-950 ml-1">
                            {alert.posisiDilamar}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-bold text-red-600 mt-0.5">
                        {alert.jenisPelanggaran} • Pukul {alert.waktu}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="bg-[#8CC63F] hover:bg-[#9bd64d] text-slate-950 text-xs font-black uppercase px-3 py-1.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer"
                    >
                      ✓ Matikan Alarm Ini
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: APPROVE / TOLAK PERMOHONAN GANTI AKUN PESERTA           */}
          {/* =============================================================== */}
          {activeTab === 'APPROVE_RESET_AKUN' && (
            <div className="space-y-4">
              {/* Header Bar Approve Reset Akun */}
              <div className="bg-[#FFF5E6] border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_#0f172a]">
                <h2 className="font-black text-slate-950 text-base uppercase">
                  🔐 Panel Permohonan Izin Ganti Akun / Logout Peserta
                </h2>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  Peserta di Lobby mengajukan izin untuk mengganti akun atau kembali ke formulir pendaftaran. Anda dapat <strong>Menyetujui</strong> atau <strong>Menolak</strong> permohonan mereka di bawah ini.
                </p>
              </div>

              <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-white border-b-4 border-slate-950 text-xs font-black uppercase tracking-wider">
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">No</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Nama Peserta</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Email</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Posisi</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Waktu Pengajuan</th>
                        <th className="py-3.5 px-4 text-center">Tindakan Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-3 divide-slate-950 text-xs md:text-sm font-bold text-slate-950">
                      {resetRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center font-black uppercase text-slate-500">
                            ✓ Tidak ada permohonan ganti akun yang sedang menunggu.
                          </td>
                        </tr>
                      ) : (
                        resetRequests.map((req, idx) => {
                          const isRowLoading = actionLoadingRow === 'ALL';
                          return (
                            <tr key={req.id} className="bg-[#FFFDF7] hover:bg-slate-100 transition">
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-center">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-sm">
                                {req.namaPeserta}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-bold text-slate-700">
                                {req.emailPeserta}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950">
                                <span
                                  className={`inline-block px-2.5 py-1 border-2 border-slate-950 text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] ${getPosisiBadgeColor(
                                    req.posisiDilamar
                                  )}`}
                                >
                                  {req.posisiDilamar}
                                </span>
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-xs font-mono font-bold text-slate-700">
                                {req.waktu}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleResolveResetRequest(req.id, 'APPROVE')}
                                    className="bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 font-black uppercase text-xs px-3 py-1.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer transition"
                                  >
                                    ✓ Setujui Ganti Akun
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleResolveResetRequest(req.id, 'REJECT')}
                                    className="bg-white hover:bg-red-100 disabled:opacity-50 text-red-700 font-black uppercase text-xs px-3 py-1.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer transition"
                                  >
                                    ✕ Tolak
                                  </button>
                                </div>
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
          {/* TAB 1: MONITORING UJIAN (TAMPILAN ASLI TETAP DIPERTAHANKAN)     */}
          {/* =============================================================== */}
          {activeTab === 'MONITORING' && (
            <>
              {loading ? (
                <div className="bg-white border-4 border-slate-950 p-12 text-center shadow-[8px_8px_0px_0px_#0f172a]">
                  <div className="inline-block bg-[#00AEEF] border-3 border-slate-950 px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0px_0px_#0f172a] animate-bounce">
                    Memuat Data Monitoring Peserta...
                  </div>
                </div>
              ) : filteredMonitoringPeserta.length === 0 ? (
                <div className="bg-white border-4 border-slate-950 p-12 text-center shadow-[8px_8px_0px_0px_#0f172a]">
                  <p className="text-base font-black uppercase text-slate-700">
                    Belum ada data peserta yang sesuai dengan filter.
                  </p>
                </div>
              ) : (
                <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-white border-b-4 border-slate-950 text-xs font-black uppercase tracking-wider">
                          <th className="py-3.5 px-4 border-r-2 border-slate-800">No</th>
                          <th className="py-3.5 px-4 border-r-2 border-slate-800">Nama Peserta</th>
                          <th className="py-3.5 px-4 border-r-2 border-slate-800">Formasi Posisi</th>
                          <th className="py-3.5 px-4 border-r-2 border-slate-800">
                            Waktu Mulai &amp; Batas
                          </th>
                          <th className="py-3.5 px-4 border-r-2 border-slate-800 text-center">
                            Sisa Waktu (Live)
                          </th>
                          <th className="py-3.5 px-4 border-r-2 border-slate-800">
                            Progres Soal Selesai
                          </th>
                          <th className="py-3.5 px-4 text-center">Status Ujian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-3 divide-slate-950 text-xs md:text-sm font-bold text-slate-950">
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
                              className={`transition ${pesertaActiveAlert
                                ? 'bg-red-100 hover:bg-red-200/80'
                                : isDone
                                  ? 'bg-[#F2FAE9]/50 hover:bg-[#FFFDF7]'
                                  : 'bg-white hover:bg-[#FFFDF7]'
                                }`}
                            >
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-center">
                                {index + 1}
                              </td>

                              {/* Nama Peserta */}
                              <td className="py-4 px-4 border-r-2 border-slate-950">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-black text-slate-950 text-sm">
                                    {p.namaPeserta}
                                  </p>
                                  {pesertaActiveAlert && (
                                    <span className="bg-red-600 text-white border-2 border-slate-950 px-2 py-0.5 text-[10px] font-black uppercase animate-pulse shadow-[2px_2px_0px_0px_#0f172a]">
                                      🚨 ALARM BERBUNYI!
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Posisi */}
                              <td className="py-4 px-4 border-r-2 border-slate-950">
                                <span
                                  className={`inline-block px-2.5 py-1 border-2 border-slate-950 text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] ${getPosisiBadgeColor(
                                    p.posisiDilamar
                                  )}`}
                                >
                                  {p.posisiDilamar}
                                </span>
                              </td>

                              {/* Waktu Mulai & Batas */}
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-xs">
                                <p>
                                  <span className="font-black text-slate-600">Mulai:</span>{' '}
                                  {p.waktuMulai}
                                </p>
                                <p className="mt-0.5">
                                  <span className="font-black text-slate-600">Batas:</span>{' '}
                                  {p.batasSelesai}
                                </p>
                              </td>

                              {/* Sisa Waktu Live */}
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-center">
                                {isWorking || isDone ? (
                                  <>
                                    <div
                                      className={`inline-block px-3 py-1.5 border-2 border-slate-950 font-mono text-base font-black shadow-[3px_3px_0px_0px_#0f172a] ${isDone
                                        ? 'bg-slate-200 text-slate-800'
                                        : p.sisaDetik < 300
                                          ? 'bg-red-500 text-white animate-pulse'
                                          : 'bg-[#F7941D] text-slate-950'
                                        }`}
                                    >
                                      {formatTime(p.sisaDetik)}
                                    </div>
                                    {isDone && (
                                      <span className="block text-[10px] font-black uppercase text-slate-500 mt-1">
                                        Sisa Saat Kumpul
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs font-black text-slate-400">
                                    Belum Mulai
                                  </span>
                                )}
                              </td>

                              {/* Progres Pengerjaan (Berapa / Berapa Soal Selesai) */}
                              <td className="py-4 px-4 border-r-2 border-slate-950 min-w-[180px]">
                                {isWorking || isDone ? (
                                  <>
                                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                                      <span className="bg-[#FFFDF7] px-2 py-0.5 border border-slate-950">
                                        {p.terjawab} / {p.totalSoal} Soal
                                      </span>
                                      <span>{pct}%</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-200 border-2 border-slate-950 overflow-hidden">
                                      <div
                                        className="h-full bg-[#8CC63F] transition-all duration-300"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs font-black text-slate-400">-</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4 text-center">
                                {isDone ? (
                                  <span className="inline-block bg-[#8CC63F] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
                                    ✓ SELESAI
                                  </span>
                                ) : isWorking ? (
                                  <span className="inline-block bg-[#00AEEF] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
                                    ● SEDANG UJIAN
                                  </span>
                                ) : (
                                  <span className="inline-block bg-[#FFF5E6] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-700">
                                    ⏳ BELUM MULAI
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
              <div className="bg-[#8CC63F]/25 border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_#0f172a] flex flex-wrap items-center justify-between gap-4">

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
                    className="bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] cursor-pointer shrink-0"
                  >
                    {actionLoadingRow === 'ALL'
                      ? 'Memproses...'
                      : `✓ Approve Semua (${waitingKompetensiCount} Peserta)`}
                  </button>
                )}
              </div>

              <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-white border-b-4 border-slate-950 text-xs font-black uppercase tracking-wider">
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">No</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Nama Peserta</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Formasi Posisi</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800 text-center">
                          Status Wawancara
                        </th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800 text-center">
                          Status Ujian Kompetensi
                        </th>
                        <th className="py-3.5 px-4 text-center">Aksi Approve Akses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-3 divide-slate-950 text-xs md:text-sm font-bold text-slate-950">
                      {filteredApproveKompetensi.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center font-black uppercase text-slate-500">
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
                              className={
                                !p.kompetensiApproved && !p.statusUjian
                                  ? 'bg-[#FFF5E6] hover:bg-[#ffedd1]'
                                  : 'bg-white hover:bg-[#FFFDF7]'
                              }
                            >
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-center">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-sm">
                                {p.namaPeserta}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950">
                                <span
                                  className={`inline-block px-2.5 py-1 border-2 border-slate-950 text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] ${getPosisiBadgeColor(
                                    p.posisiDilamar
                                  )}`}
                                >
                                  {p.posisiDilamar}
                                </span>
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-center">
                                {p.wawancaraApproved ? (
                                  <span className="inline-block bg-[#8CC63F] border-2 border-slate-950 px-2.5 py-0.5 text-[11px] font-black uppercase">
                                    ✓ SUDAH WAWANCARA
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slate-100 border-2 border-slate-950 px-2.5 py-0.5 text-[11px] font-black uppercase text-slate-600">
                                    BELUM WAWANCARA
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-center">
                                {isDone ? (
                                  <span className="inline-block bg-[#8CC63F] border-2 border-slate-950 px-2.5 py-1 text-xs font-black uppercase">
                                    ✓ SELESAI UJIAN
                                  </span>
                                ) : isWorking ? (
                                  <span className="inline-block bg-[#00AEEF] border-2 border-slate-950 px-2.5 py-1 text-xs font-black uppercase">
                                    ● SEDANG MENGERJAKAN
                                  </span>
                                ) : p.kompetensiApproved ? (
                                  <span className="inline-block bg-[#E6F7FF] border-2 border-slate-950 px-2.5 py-1 text-xs font-black uppercase text-slate-950">
                                    ✓ DISETUJUI (BELUM KLIK MULAI)
                                  </span>
                                ) : (
                                  <span className="inline-block bg-[#F7941D] border-2 border-slate-950 px-2.5 py-1 text-xs font-black uppercase text-slate-950">
                                    ⏳ MENUNGGU APPROVE
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                {isDone || isWorking ? (
                                  <span className="text-xs font-black uppercase text-slate-500">
                                    Sesi Ujian Aktif / Selesai
                                  </span>
                                ) : !p.kompetensiApproved ? (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('APPROVE_KOMPETENSI', p)}
                                    className="bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 font-black uppercase text-xs px-3.5 py-2 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a] cursor-pointer transition"
                                  >
                                    {isRowLoading ? 'Memproses...' : '✓ Approve Akses Ujian'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('REVOKE_KOMPETENSI', p)}
                                    className="bg-white hover:bg-red-100 disabled:opacity-50 text-red-700 font-black uppercase text-xs px-3 py-1.5 border-2 border-slate-950 cursor-pointer transition"
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
              <div className="bg-[#F7941D]/25 border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_#0f172a]">
                <h2 className="font-black text-slate-950 text-base uppercase">
                  🎤 Panel Approve Kehadiran &amp; Selesai Tes Wawancara
                </h2>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  Klik <strong>Approve Selesai Wawancara</strong> bagi peserta yang telah mengikuti wawancara. Sistem akan mengisi kolom <strong>Status Wawancara</strong> di Google Sheets dan otomatis mengarahkan peserta ke Tes Seleksi Kompetensi (jika belum).
                </p>
              </div>

              <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-white border-b-4 border-slate-950 text-xs font-black uppercase tracking-wider">
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">No</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Nama Peserta</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Formasi Posisi</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800 text-center">
                          Status Tes Kompetensi
                        </th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800 text-center">
                          Status Wawancara
                        </th>
                        <th className="py-3.5 px-4 text-center">Aksi Approve Wawancara</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-3 divide-slate-950 text-xs md:text-sm font-bold text-slate-950">
                      {filteredApproveWawancara.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center font-black uppercase text-slate-500">
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
                              className={
                                p.wawancaraApproved
                                  ? 'bg-[#F2FAE9]/60 hover:bg-[#FFFDF7]'
                                  : 'bg-white hover:bg-[#FFFDF7]'
                              }
                            >
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-center">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-sm">
                                {p.namaPeserta}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950">
                                <span
                                  className={`inline-block px-2.5 py-1 border-2 border-slate-950 text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] ${getPosisiBadgeColor(
                                    p.posisiDilamar
                                  )}`}
                                >
                                  {p.posisiDilamar}
                                </span>
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-center">
                                {isKompetensiDone ? (
                                  <span className="inline-block bg-[#8CC63F] border-2 border-slate-950 px-2.5 py-0.5 text-[11px] font-black uppercase">
                                    ✓ SUDAH KOMPETENSI
                                  </span>
                                ) : isKompetensiWorking ? (
                                  <span className="inline-block bg-[#00AEEF] border-2 border-slate-950 px-2.5 py-0.5 text-[11px] font-black uppercase">
                                    ● SEDANG UJIAN
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slate-100 border-2 border-slate-950 px-2.5 py-0.5 text-[11px] font-black uppercase text-slate-600">
                                    BELUM KOMPETENSI
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-center">
                                {p.wawancaraApproved ? (
                                  <span className="inline-block bg-[#8CC63F] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
                                    ✓ {p.statusWawancara || 'SUDAH WAWANCARA'}
                                  </span>
                                ) : (
                                  <span className="inline-block bg-[#FFF5E6] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-600">
                                    BELUM WAWANCARA
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                {!p.wawancaraApproved ? (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('APPROVE_WAWANCARA', p)}
                                    className="bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 font-black uppercase text-xs px-3.5 py-2 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#0f172a] cursor-pointer transition"
                                  >
                                    {isRowLoading ? 'Menyimpan...' : 'Approve Selesai Wawancara'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleApproveAction('REVOKE_WAWANCARA', p)}
                                    className="bg-white hover:bg-red-100 disabled:opacity-50 text-red-700 font-black uppercase text-xs px-3 py-1.5 border-2 border-slate-950 cursor-pointer transition"
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
          {/* TAB 4: APPROVE / TOLAK PERMOHONAN GANTI AKUN PESERTA           */}
          {/* =============================================================== */}
          {activeTab === 'APPROVE_RESET_AKUN' && (
            <div className="space-y-4">
              {/* Header Bar Approve Reset Akun */}
              <div className="bg-[#FFF5E6] border-4 border-slate-950 p-4 shadow-[6px_6px_0px_0px_#0f172a]">
                <h2 className="font-black text-slate-950 text-base uppercase">
                  🔐 Panel Permohonan Izin Ganti Akun / Logout Peserta
                </h2>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  Peserta di Lobby mengajukan izin untuk mengganti akun atau kembali ke formulir pendaftaran. Anda dapat <strong>Menyetujui</strong> atau <strong>Menolak</strong> permohonan mereka di bawah ini.
                </p>
              </div>

              <div className="bg-white border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-white border-b-4 border-slate-950 text-xs font-black uppercase tracking-wider">
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">No</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Nama Peserta</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Email</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Posisi</th>
                        <th className="py-3.5 px-4 border-r-2 border-slate-800">Waktu Pengajuan</th>
                        <th className="py-3.5 px-4 text-center">Tindakan Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-3 divide-slate-950 text-xs md:text-sm font-bold text-slate-950">
                      {resetRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center font-black uppercase text-slate-500">
                            ✓ Tidak ada permohonan ganti akun yang sedang menunggu.
                          </td>
                        </tr>
                      ) : (
                        resetRequests.map((req, idx) => {
                          const isRowLoading = actionLoadingRow === 'ALL';
                          return (
                            <tr key={req.id} className="bg-[#FFFDF7] hover:bg-slate-100 transition">
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-center">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-black text-sm">
                                {req.namaPeserta}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 font-bold text-slate-700">
                                {req.emailPeserta}
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950">
                                <span
                                  className={`inline-block px-2.5 py-1 border-2 border-slate-950 text-xs font-black text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] ${getPosisiBadgeColor(
                                    req.posisiDilamar
                                  )}`}
                                >
                                  {req.posisiDilamar}
                                </span>
                              </td>
                              <td className="py-4 px-4 border-r-2 border-slate-950 text-xs font-mono font-bold text-slate-700">
                                {req.waktu}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleResolveResetRequest(req.id, 'APPROVE')}
                                    className="bg-[#8CC63F] hover:bg-[#9bd64d] disabled:opacity-50 text-slate-950 font-black uppercase text-xs px-3 py-1.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer transition"
                                  >
                                    ✓ Setujui Ganti Akun
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isRowLoading}
                                    onClick={() => handleResolveResetRequest(req.id, 'REJECT')}
                                    className="bg-white hover:bg-red-100 disabled:opacity-50 text-red-700 font-black uppercase text-xs px-3 py-1.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer transition"
                                  >
                                    ✕ Tolak
                                  </button>
                                </div>
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
    </div>
  );
}
