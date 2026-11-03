'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { POSISI_OPTIONS } from '@/constants/exam';
import { formatTime } from '@/utils/examHelper';
import { playViolationAlarm, stopViolationAlarm } from '@/utils/mediaHelper';
import type { ActiveViolationAlert } from '@/lib/violationAlertStore';

interface PesertaMonitoring {
  id: number;
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
}

const ADMIN_PIN_STORAGE_KEY = 'bps_skd_admin_pin_v1';

export default function MonitoringAdminPage() {
  const [adminPin, setAdminPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinError, setPinError] = useState('');

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

  // Filter peserta berdasarkan Posisi, Status, & Pencarian Nama/Email,
  // lalu urutkan: SEDANG MENGERJAKAN selalu di atas, dan SELESAI selalu di bawah.
  const filteredPeserta = pesertaList
    .filter((p) => {
      const matchPosisi =
        filterPosisi === 'SEMUA' ||
        p.posisiDilamar.toLowerCase() === filterPosisi.toLowerCase();

      const isDone = p.statusUjian.toUpperCase().includes('SELESAI');
      const matchStatus =
        filterStatus === 'SEMUA' ||
        (filterStatus === 'SELESAI' && isDone) ||
        (filterStatus === 'AKTIF' && !isDone);

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.namaPeserta.toLowerCase().includes(q) ||
        p.posisiDilamar.toLowerCase().includes(q);

      return matchPosisi && matchStatus && matchQuery;
    })
    .sort((a, b) => {
      const aDone = a.statusUjian.toUpperCase().includes('SELESAI') ? 1 : 0;
      const bDone = b.statusUjian.toUpperCase().includes('SELESAI') ? 1 : 0;
      if (aDone !== bDone) {
        return aDone - bDone; // 0 (Sedang Mengerjakan) di atas, 1 (Selesai) di bawah
      }
      return b.id - a.id; // Peserta terbaru berada lebih atas di kelompoknya
    });

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
                  {refreshing ? 'Memverifikasi...' : 'Buka Monitoring →'}
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
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
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
                Dashboard Monitoring Peserta • BPS
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Rekapitulasi Sisa Waktu &amp; Progres Pengerjaan Soal Secara Real-Time
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

            <button
              type="button"
              onClick={handleLogoutAdmin}
              className="bg-[#F7941D] hover:bg-[#ffa333] text-slate-950 text-xs font-black uppercase tracking-wider px-3.5 py-2 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] cursor-pointer transition-all"
            >
              🔒 Kunci
            </button>

            <Link
              href="/"
              className="bg-white hover:bg-slate-100 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 border-3 border-slate-950 shadow-[4px_4px_0px_0px_#0f172a] transition-all"
            >
              ← Halaman Ujian
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-[#FFFDF7] border-2 border-slate-950 text-xs font-black uppercase text-slate-950 cursor-pointer"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="AKTIF">Sedang Mengerjakan</option>
              <option value="SELESAI">Sudah Selesai</option>
            </select>

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

        {/* BANNER ALARM PELANGGARAN AKTIF (MENUNJUKKAN SIAPA PESERTA YANG SEDANG BERBUNYI) */}
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

        {/* TABEL & KARTU MONITORING PESERTA */}
        {loading ? (
          <div className="bg-white border-4 border-slate-950 p-12 text-center shadow-[8px_8px_0px_0px_#0f172a]">
            <div className="inline-block bg-[#00AEEF] border-3 border-slate-950 px-5 py-2.5 font-black uppercase text-sm shadow-[4px_4px_0px_0px_#0f172a] animate-bounce">
              Memuat Data Monitoring Peserta...
            </div>
          </div>
        ) : filteredPeserta.length === 0 ? (
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
                    <th className="py-3.5 px-4 border-r-2 border-slate-800">Waktu Mulai &amp; Batas</th>
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
                  {filteredPeserta.map((p, index) => {
                    const isDone = p.statusUjian.toUpperCase().includes('SELESAI');
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
                            <p className="font-black text-slate-950 text-sm">{p.namaPeserta}</p>
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
                            <span className="font-black text-slate-600">Mulai:</span> {p.waktuMulai}
                          </p>
                          <p className="mt-0.5">
                            <span className="font-black text-slate-600">Batas:</span>{' '}
                            {p.batasSelesai}
                          </p>
                        </td>

                        {/* Sisa Waktu Live */}
                        <td className="py-4 px-4 border-r-2 border-slate-950 text-center">
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
                        </td>

                        {/* Progres Pengerjaan (Berapa / Berapa Soal Selesai) */}
                        <td className="py-4 px-4 border-r-2 border-slate-950 min-w-[180px]">
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
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          {isDone ? (
                            <span className="inline-block bg-[#8CC63F] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
                              ✓ SELESAI
                            </span>
                          ) : (
                            <span className="inline-block bg-[#00AEEF] border-2 border-slate-950 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]">
                              ● SEDANG UJIAN
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
      </main>
    </div>
  );
}

