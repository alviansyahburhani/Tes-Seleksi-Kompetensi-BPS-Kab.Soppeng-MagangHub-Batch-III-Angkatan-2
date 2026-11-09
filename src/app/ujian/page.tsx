'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXAM_DURATION_SECONDS,
  EXAM_SESSION_STORAGE_KEY,
  PARTICIPANT_LOBBY_STORAGE_KEY,
  TERMS_ACCEPTED_STORAGE_KEY,
  POSISI_OPTIONS,
} from '@/constants/exam';
import {
  DataPraktik,
  ParticipantLobbyStatus,
  SavedExamSession,
  Soal,
  TipeSoal,
} from '@/types/exam';
import { formatTime } from '@/utils/examHelper';
import {
  playViolationAlarm,
  stopViolationAlarm,
  unlockViolationAlarm,
} from '@/utils/mediaHelper';
import FinishedView from '@/components/exam/FinishedView';
import ViolationModal from '@/components/exam/ViolationModal';
import UnansweredModal from '@/components/exam/UnansweredModal';
import ConfirmSubmitModal from '@/components/exam/ConfirmSubmitModal';
import ExamHeader from '@/components/exam/ExamHeader';
import QuestionCard from '@/components/exam/QuestionCard';
import QuestionNavigationMap from '@/components/exam/QuestionNavigationMap';

// Lama waktu (ms) pengamatan aktivitas Paste setelah peserta kembali ke halaman ujian
const PASTE_WATCH_MS = 15000;

// Info saat peserta meninggalkan halaman (dipakai untuk menghitung durasi keluar)
type LeaveInfo = { leftAt: number; soalNo: number; ke: number };
// Log pelanggaran yang menunggu hasil pengamatan Paste sebelum dikirim ke sheet
type PendingViolationLog = {
  deskripsi: string;
  ke: number;
  timer: ReturnType<typeof setTimeout>;
};

const formatDurasi = (totalDetik: number) => {
  if (totalDetik < 60) return `${totalDetik} detik`;
  const menit = Math.floor(totalDetik / 60);
  const detik = totalDetik % 60;
  return detik > 0 ? `${menit} menit ${detik} detik` : `${menit} menit`;
};

export default function UjianPage() {
  const router = useRouter();

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [namaPeserta, setNamaPeserta] = useState('');
  const [emailPeserta, setEmailPeserta] = useState('');
  const [teleponPeserta, setTeleponPeserta] = useState('');
  const [posisiDilamar, setPosisiDilamar] = useState<string>('');
  const [alamatPeserta, setAlamatPeserta] = useState('');
  const [lobbyStatus, setLobbyStatus] = useState<ParticipantLobbyStatus | null>(null);

  // State soal & navigasi soal
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // State jawaban peserta
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [jawabanPraktik, setJawabanPraktik] = useState<Record<number, DataPraktik>>({});

  // State sesi, timer, & anti-cheat
  const [loading, setLoading] = useState(false);
  const [monitoringRowNumber, setMonitoringRowNumber] = useState<number | null>(null);
  const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [unansweredWarning, setUnansweredWarning] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showNavMap, setShowNavMap] = useState(true);

  // Refs untuk mencegah stale closure pada event listener & interval timer
  const jawabanRef = useRef(jawaban);
  const jawabanPraktikRef = useRef(jawabanPraktik);
  const soalListRef = useRef(soalList);
  const violationsRef = useRef(violations);
  const timeLeftRef = useRef(timeLeft);
  const monitoringRowRef = useRef<number | null>(monitoringRowNumber);
  const identitasRef = useRef({
    namaPeserta,
    emailPeserta,
    teleponPeserta,
    posisiDilamar,
    alamatPeserta,
  });
  const activeSoalTipeRef = useRef<TipeSoal>('PG');
  const lastSyncedTerjawabCountRef = useRef<number>(0);
  const showWarningRef = useRef(showWarning);
  const lastViolationLogTimeRef = useRef<number>(0);
  const currentIndexRef = useRef(currentIndex);
  const leaveInfoRef = useRef<LeaveInfo | null>(null);
  const pendingViolationLogRef = useRef<PendingViolationLog | null>(null);

  const terjawabCount = Object.values(jawaban).filter((val) => val && val.trim() !== '').length;

  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  useEffect(() => {
    jawabanRef.current = jawaban;
  }, [jawaban]);

  useEffect(() => {
    jawabanPraktikRef.current = jawabanPraktik;
  }, [jawabanPraktik]);

  useEffect(() => {
    soalListRef.current = soalList;
  }, [soalList]);

  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    monitoringRowRef.current = monitoringRowNumber;
  }, [monitoringRowNumber]);

  useEffect(() => {
    identitasRef.current = {
      namaPeserta,
      emailPeserta,
      teleponPeserta,
      posisiDilamar,
      alamatPeserta,
    };
  }, [namaPeserta, emailPeserta, teleponPeserta, posisiDilamar, alamatPeserta]);

  useEffect(() => {
    const active = soalList[currentIndex];
    activeSoalTipeRef.current = active?.tipe || 'PG';
    currentIndexRef.current = currentIndex;
  }, [soalList, currentIndex]);

  // 1. Pulihkan sesi ujian aktif dari localStorage (Route Guard: jika tidak ada sesi ujian, arahkan ke /lobby atau /login)
  useEffect(() => {
    try {
      const savedLobby = localStorage.getItem(PARTICIPANT_LOBBY_STORAGE_KEY);
      if (savedLobby) {
        try {
          setLobbyStatus(JSON.parse(savedLobby));
        } catch {}
      }

      const savedSession = localStorage.getItem(EXAM_SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed: SavedExamSession = JSON.parse(savedSession);
        if (parsed && parsed.isLoggedIn && !parsed.isFinished && parsed.endTimeMs) {
          const remainingSec = Math.max(0, Math.floor((parsed.endTimeMs - Date.now()) / 1000));
          if (remainingSec > 0 && Array.isArray(parsed.soalList) && parsed.soalList.length > 0) {
            const restoredJawaban = parsed.jawaban || {};
            const restoredTerjawabCount = Object.values(restoredJawaban).filter(
              (v) => v && v.trim() !== ''
            ).length;
            lastSyncedTerjawabCountRef.current = restoredTerjawabCount;

            setNamaPeserta(parsed.namaPeserta || '');
            setEmailPeserta(parsed.emailPeserta || '');
            setTeleponPeserta(parsed.teleponPeserta || '');
            setPosisiDilamar(parsed.posisiDilamar || POSISI_OPTIONS[0]);
            setAlamatPeserta(parsed.alamatPeserta || '');
            setSoalList(parsed.soalList);
            setJawaban(restoredJawaban);
            setJawabanPraktik(parsed.jawabanPraktik || {});
            setViolations(parsed.violations || 0);
            setCurrentIndex(parsed.currentIndex || 0);
            setMonitoringRowNumber(parsed.monitoringRowNumber || null);
            setEndTimeMs(parsed.endTimeMs);
            setTimeLeft(remainingSec);
            setIsSessionReady(true);
            return;
          } else {
            localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
          }
        }
      }

      // Jika tidak sedang dalam sesi ujian aktif, arahkan ke /lobby (jika sudah absen) atau /login
      if (savedLobby) {
        router.replace('/lobby');
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  // 2. Auto-save sesi ujian aktif ke localStorage setiap ada perubahan
  useEffect(() => {
    if (!isSessionReady || isFinished || !endTimeMs) return;
    try {
      const payload: SavedExamSession = {
        isLoggedIn: true,
        isFinished,
        namaPeserta,
        emailPeserta,
        teleponPeserta,
        posisiDilamar,
        alamatPeserta,
        soalList,
        jawaban,
        jawabanPraktik,
        violations,
        currentIndex,
        monitoringRowNumber,
        endTimeMs,
      };
      localStorage.setItem(EXAM_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Abaikan jika kuota localStorage penuh
    }
  }, [
    isSessionReady,
    isFinished,
    namaPeserta,
    emailPeserta,
    teleponPeserta,
    posisiDilamar,
    alamatPeserta,
    soalList,
    jawaban,
    jawabanPraktik,
    violations,
    currentIndex,
    monitoringRowNumber,
    endTimeMs,
  ]);

  // Helper untuk keluar dari ujian secara otomatis apabila data peserta dihapus dari spreadsheet oleh Admin
  const forceEjectMissingParticipant = useCallback(() => {
    stopViolationAlarm();
    localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
    localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
    localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
    setIsSessionReady(false);
    setIsFinished(false);
    router.replace('/login');
  }, [router]);

  // 3.A. Validasi sebelum membuka Pop-up Konfirmasi Pengumpulan
  const handleRequestSubmit = () => {
    const currentSoalList = soalListRef.current;
    const currentJawaban = jawabanRef.current;

    const firstEmptyIdx = currentSoalList.findIndex(
      (s) => !currentJawaban[s.id] || currentJawaban[s.id].trim() === ''
    );

    if (firstEmptyIdx !== -1) {
      const emptyCount = currentSoalList.filter(
        (s) => !currentJawaban[s.id] || currentJawaban[s.id].trim() === ''
      ).length;
      setCurrentIndex(firstEmptyIdx);
      setUnansweredWarning(
        `Masih ada ${emptyCount} soal yang belum terjawab! Anda telah diarahkan ke Soal Nomor ${
          firstEmptyIdx + 1
        } yang masih kosong.`
      );
      return;
    }

    setShowConfirmSubmit(true);
  };

  // 3.B. Eksekusi pengiriman & penyimpanan jawaban ke server
  const submitUjian = useCallback(
    async (isAutoSubmit = false) => {
      if (!isAutoSubmit) {
        setShowConfirmSubmit(false);
      }
      setLoading(true);

      try {
        const { namaPeserta, emailPeserta, posisiDilamar, alamatPeserta } = identitasRef.current;
        const sisaWaktuStr = formatTime(timeLeftRef.current);

        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namaPeserta,
            emailPeserta,
            posisiDilamar,
            alamatPeserta,
            jawabanPeserta: jawabanRef.current,
            jawabanPraktik: jawabanPraktikRef.current,
            soalDikerjakanIds: soalListRef.current.map((s) => s.id),
            totalPelanggaran: violationsRef.current,
            monitoringRowNumber: monitoringRowRef.current,
            sisaWaktuStr,
          }),
        });
        if (res.status === 404) {
          forceEjectMissingParticipant();
          return;
        }
        const json = await res.json();
        if (json.success) {
          localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
          setLobbyStatus((prev) => {
            const base: ParticipantLobbyStatus = prev || {
              rowNumber: monitoringRowRef.current ?? 0,
              namaPeserta,
              emailPeserta,
              posisiDilamar,
              alamatPeserta,
              statusUjian: '',
              statusWawancara: '',
              statusKelulusan: '',
              kompetensiApproved: true,
              kompetensiSelesai: true,
              sedangUjian: false,
              wawancaraApproved: false,
            };
            const updated: ParticipantLobbyStatus = {
              ...base,
              kompetensiSelesai: true,
              sedangUjian: false,
              statusUjian: `SELESAI (${terjawabCount}/${soalListRef.current.length})`,
            };
            try {
              sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(updated));
              if (updated.kompetensiSelesai && updated.wawancaraApproved) {
                localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
                localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
              } else {
                localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(updated));
              }
            } catch {}
            return updated;
          });

          // Sinkronkan status wawancara & kelulusan terbaru dari server setelah submit
          try {
            const params = new URLSearchParams();
            if (monitoringRowRef.current) params.set('rowNumber', String(monitoringRowRef.current));
            if (emailPeserta) params.set('email', emailPeserta);
            if (namaPeserta) params.set('nama', namaPeserta);
            fetch(`/api/start?${params.toString()}`, { cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : null))
              .then((fresh) => {
                if (fresh && fresh.success) {
                  const synced: ParticipantLobbyStatus = {
                    rowNumber: fresh.rowNumber,
                    namaPeserta: fresh.namaPeserta || namaPeserta,
                    emailPeserta: fresh.emailPeserta || emailPeserta,
                    teleponPeserta: fresh.teleponPeserta || '',
                    posisiDilamar: fresh.posisiDilamar || posisiDilamar,
                    alamatPeserta: fresh.alamatPeserta || alamatPeserta,
                    statusUjian:
                      fresh.statusUjian ||
                      `SELESAI (${terjawabCount}/${soalListRef.current.length})`,
                    statusWawancara: fresh.statusWawancara || '',
                    statusKelulusan: fresh.statusKelulusan || '',
                    kompetensiApproved: Boolean(fresh.kompetensiApproved),
                    kompetensiSelesai: true,
                    sedangUjian: false,
                    wawancaraApproved: Boolean(fresh.wawancaraApproved),
                  };
                  setLobbyStatus(synced);
                  try {
                    sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(synced));
                    if (
                      synced.wawancaraApproved ||
                      (synced.statusKelulusan && synced.statusKelulusan.trim())
                    ) {
                      localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
                      localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
                    } else {
                      localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(synced));
                    }
                  } catch {}
                }
              })
              .catch(() => {});
          } catch {}

          setIsFinished(true);
        } else {
          alert('Gagal mengirim jawaban: ' + json.error);
        }
      } catch {
        alert('Terjadi kesalahan jaringan saat mengirim jawaban.');
      } finally {
        setLoading(false);
      }
    },
    [terjawabCount, forceEjectMissingParticipant]
  );

  // 4. Timer Countdown + Sinkronisasi Sisa Waktu ke Sheet Monitoring_Peserta setiap 2 menit (120 detik)
  //    serta pengecekan validitas sesi ke RAM Cache server setiap 15 detik agar langsung keluar jika di-reset Admin
  useEffect(() => {
    if (!isSessionReady || isFinished) return;

    const verifyActiveParticipantInSheet = () => {
      const params = new URLSearchParams();
      if (monitoringRowRef.current) params.set('rowNumber', String(monitoringRowRef.current));
      if (identitasRef.current.emailPeserta) params.set('email', identitasRef.current.emailPeserta);
      if (identitasRef.current.namaPeserta) params.set('nama', identitasRef.current.namaPeserta);
      params.set('mode', 'ujian');

      fetch(`/api/start?${params.toString()}`, { cache: 'no-store' })
        .then((res) => {
          if (res.status === 404) {
            forceEjectMissingParticipant();
          }
        })
        .catch(() => {});
    };

    // Cek segera saat halaman /ujian dibuka / dipulihkan
    verifyActiveParticipantInSheet();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitUjian(true);
          return 0;
        }
        const nextTime = prev - 1;
        if (nextTime % 120 === 0 && monitoringRowRef.current) {
          const currentTerjawab = Object.values(jawabanRef.current).filter(
            (v) => v && v.trim() !== ''
          ).length;
          lastSyncedTerjawabCountRef.current = currentTerjawab;

          fetch('/api/start', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rowNumber: monitoringRowRef.current,
              emailPeserta: identitasRef.current.emailPeserta,
              namaPeserta: identitasRef.current.namaPeserta,
              sisaWaktuStr: formatTime(nextTime),
              terjawabCount: currentTerjawab,
              totalSoal: soalListRef.current.length,
              statusUjian: 'SEDANG MENGERJAKAN',
            }),
          })
            .then(async (res) => {
              if (res.status === 404) {
                forceEjectMissingParticipant();
              }
            })
            .catch(() => {});
        } else if (nextTime % 15 === 0) {
          verifyActiveParticipantInSheet();
        }
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSessionReady, isFinished, submitUjian, forceEjectMissingParticipant]);

  // 4.5. Sinkronisasi ke Monitoring_Peserta HANYA jika jumlah soal terjawab berubah (Debounce 5 detik)
  useEffect(() => {
    if (!isSessionReady || isFinished || !monitoringRowNumber) return;
    if (terjawabCount === lastSyncedTerjawabCountRef.current) return;

    const syncTimeout = setTimeout(() => {
      lastSyncedTerjawabCountRef.current = terjawabCount;
      fetch('/api/start', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowNumber: monitoringRowNumber,
          emailPeserta: identitasRef.current.emailPeserta,
          namaPeserta: identitasRef.current.namaPeserta,
          sisaWaktuStr: formatTime(timeLeftRef.current),
          terjawabCount,
          totalSoal: soalList.length,
          statusUjian: 'SEDANG MENGERJAKAN',
        }),
      })
        .then((res) => {
          if (res.status === 404) {
            forceEjectMissingParticipant();
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearTimeout(syncTimeout);
  }, [
    terjawabCount,
    isSessionReady,
    isFinished,
    monitoringRowNumber,
    soalList.length,
    forceEjectMissingParticipant,
  ]);

  // 4.9. Unlock audio alarm pada interaksi pengguna (Autoplay Policy) agar alarm langsung
  //      berbunyi saat peserta pindah tab, bukan baru terdengar ketika kembali.
  useEffect(() => {
    if (!isSessionReady || isFinished) return;
    const unlock = () => unlockViolationAlarm();
    const opts = { capture: true, passive: true } as const;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    window.addEventListener('touchstart', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock, opts);
      window.removeEventListener('keydown', unlock, opts);
      window.removeEventListener('touchstart', unlock, opts);
    };
  }, [isSessionReady, isFinished]);

  // 5. Deteksi Pindah Tab / VisibilityChange (Silent bypass HANYA saat di soal PRAKTIK)
  //    Log diperkaya: durasi keluar halaman, nomor soal, & aktivitas Paste setelah kembali.
  //    - Saat keluar  -> tahap 'mulai'  : alarm real-time ke /monitoring + hitung pelanggaran di server
  //    - Saat kembali -> tahap 'detail' : catat 1 baris lengkap ke sheet Log_Pelanggaran
  useEffect(() => {
    if (!isSessionReady || isFinished) return;

    const kirimLog = (payload: Record<string, unknown>, useBeacon = false) => {
      const body = JSON.stringify({
        namaPeserta: `${namaPeserta} (${posisiDilamar})`,
        murniNama: namaPeserta,
        emailPeserta,
        posisiDilamar,
        ...payload,
      });
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    // Kirim log 'detail' yang sedang menunggu pengamatan Paste
    const flushPendingLog = (pasteLength?: number, useBeacon = false) => {
      const pending = pendingViolationLogRef.current;
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingViolationLogRef.current = null;

      const infoPaste =
        pasteLength && pasteLength > 0
          ? ` [Terdeteksi Paste ${pasteLength} karakter]`
          : '';

      kirimLog(
        {
          tahap: 'detail',
          pelanggaranKe: pending.ke,
          jenisPelanggaran: `${pending.deskripsi}${infoPaste} (Pelanggaran ke-${pending.ke})`,
        },
        useBeacon
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Jika peserta keluar lagi saat masa pengamatan Paste, kirim log sebelumnya terlebih dahulu
        flushPendingLog();

        // Hanya soal PRAKTIK yang bebas pindah tab (karena membuka Canva/Spreadsheet)
        if (activeSoalTipeRef.current === 'PRAKTIK') {
          return;
        }

        const now = Date.now();
        if (showWarningRef.current || now - lastViolationLogTimeRef.current < 8000) {
          playViolationAlarm();
          setShowWarning(true);
          return;
        }

        lastViolationLogTimeRef.current = now;
        showWarningRef.current = true;

        const ke = violationsRef.current + 1;
        const soalNo = currentIndexRef.current + 1;
        violationsRef.current = ke;
        setViolations(ke);
        leaveInfoRef.current = { leftAt: now, soalNo, ke };

        kirimLog({
          tahap: 'mulai',
          pelanggaranKe: ke,
          jenisPelanggaran: `Keluar dari halaman saat mengerjakan Soal #${soalNo} (Pelanggaran ke-${ke})`,
        });

        playViolationAlarm(true);
        setShowWarning(true);
      } else {
        const info = leaveInfoRef.current;
        if (!info) return;
        leaveInfoRef.current = null;

        const durasiDetik = Math.max(1, Math.round((Date.now() - info.leftAt) / 1000));
        const deskripsi = `Keluar dari halaman selama ${formatDurasi(durasiDetik)} saat mengerjakan Soal #${info.soalNo}`;
        pendingViolationLogRef.current = {
          deskripsi,
          ke: info.ke,
          timer: setTimeout(() => flushPendingLog(), PASTE_WATCH_MS),
        };

        // Perbarui tampilan di /monitoring begitu peserta kembali agar durasi keluar langsung terlihat
        kirimLog({
          tahap: 'kembali',
          pelanggaranKe: info.ke,
          jenisPelanggaran: `${deskripsi} (Pelanggaran ke-${info.ke})`,
        });
      }
    };

    // Tangkap aktivitas Paste selama masa pengamatan setelah peserta kembali
    const handlePaste = (e: ClipboardEvent) => {
      if (!pendingViolationLogRef.current) return;
      const teks = e.clipboardData?.getData('text') || '';
      flushPendingLog(teks.length);
    };

    // Jika peserta menutup / meninggalkan halaman ujian saat masih keluar, tetap catat ke sheet
    const handlePageHide = () => {
      flushPendingLog(undefined, true);
      const info = leaveInfoRef.current;
      if (!info) return;
      leaveInfoRef.current = null;
      const durasiDetik = Math.max(1, Math.round((Date.now() - info.leftAt) / 1000));
      kirimLog(
        {
          tahap: 'detail',
          pelanggaranKe: info.ke,
          jenisPelanggaran: `Keluar dari halaman saat mengerjakan Soal #${info.soalNo}, lalu menutup/meninggalkan halaman ujian setelah ${formatDurasi(durasiDetik)}. (Pelanggaran ke-${info.ke})`,
        },
        true
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('paste', handlePaste, true);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('pagehide', handlePageHide);
      flushPendingLog();
    };
  }, [isSessionReady, isFinished, namaPeserta, emailPeserta, posisiDilamar]);

  // Handler perubahan jawaban PG / Deskripsi
  const handlePilihOpsi = (idSoal: number, nilaiJawaban: string) => {
    setUnansweredWarning('');
    setJawaban((prev) => ({ ...prev, [idSoal]: nilaiJawaban }));
  };

  // Handler perubahan jawaban Praktik
  const handleUpdatePraktik = (idSoal: number, patch: Partial<DataPraktik>) => {
    setUnansweredWarning('');
    setJawabanPraktik((prev) => {
      const updated = { ...(prev[idSoal] || {}), ...patch };
      const trimmedLink = (updated.linkUrl || '').trim();
      if (trimmedLink) {
        setJawaban((jPrev) => ({
          ...jPrev,
          [idSoal]: trimmedLink,
        }));
      } else {
        setJawaban((jPrev) => {
          const copy = { ...jPrev };
          delete copy[idSoal];
          return copy;
        });
      }
      return { ...prev, [idSoal]: updated };
    });
  };

  if (!isSessionReady && !isFinished) {
    return null;
  }

  // TAMPILAN SAAT UJIAN KOMPETENSI SELESAI
  if (isFinished) {
    return (
      <FinishedView
        namaPeserta={namaPeserta}
        emailPeserta={emailPeserta}
        posisiDilamar={posisiDilamar}
        terjawabCount={terjawabCount}
        totalSoal={soalList.length}
        wawancaraApproved={Boolean(lobbyStatus?.wawancaraApproved)}
        statusKelulusan={lobbyStatus?.statusKelulusan || ''}
        onBackToLobby={() => {
          try {
            if (lobbyStatus) {
              sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(lobbyStatus));
            }
          } catch {}
          const isAllCompleted =
            Boolean(lobbyStatus?.wawancaraApproved) ||
            Boolean(lobbyStatus?.statusKelulusan && lobbyStatus.statusKelulusan.trim());
          if (isAllCompleted) {
            router.replace('/pengumuman');
          } else {
            router.replace('/lobby');
          }
        }}
      />
    );
  }

  const activeSoal = soalList[currentIndex];
  const totalTerjawab = terjawabCount;
  const activePraktikData = activeSoal ? jawabanPraktik[activeSoal.id] || {} : {};

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {showWarning && (
        <ViolationModal
          violations={violations}
          onClose={() => {
            stopViolationAlarm();
            setShowWarning(false);
          }}
        />
      )}

      {unansweredWarning && (
        <UnansweredModal
          message={unansweredWarning}
          onClose={() => setUnansweredWarning('')}
        />
      )}

      {showConfirmSubmit && (
        <ConfirmSubmitModal
          terjawabCount={totalTerjawab}
          totalSoal={soalList.length}
          sisaWaktuStr={formatTime(timeLeft)}
          loading={loading}
          onCancel={() => setShowConfirmSubmit(false)}
          onConfirm={() => submitUjian(false)}
        />
      )}

      <ExamHeader
        namaPeserta={namaPeserta}
        posisiDilamar={posisiDilamar}
        timeLeft={timeLeft}
        loading={loading}
        onSubmit={handleRequestSubmit}
      />

      {/* LAYOUT UTAMA: KONTEN SOAL KIRI + SIDEBAR NAVIGASI DOCK MENTOK KANAN */}
      <div className="flex-1 w-full flex flex-col lg:flex-row items-start">
        <main className="flex-1 min-w-0 w-full p-4 md:p-6 lg:p-8 space-y-6">
          {activeSoal ? (
            <QuestionCard
              activeSoal={activeSoal}
              currentIndex={currentIndex}
              totalSoal={soalList.length}
              totalTerjawab={totalTerjawab}
              showNavMap={showNavMap}
              onToggleNavMap={() => setShowNavMap((prev) => !prev)}
              jawabanValue={jawaban[activeSoal.id] || ''}
              activePraktikData={activePraktikData}
              onSelectAnswer={handlePilihOpsi}
              onUpdatePraktik={handleUpdatePraktik}
              onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              onNext={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
            />
          ) : null}
        </main>

        <QuestionNavigationMap
          soalList={soalList}
          jawaban={jawaban}
          currentIndex={currentIndex}
          totalTerjawab={totalTerjawab}
          isCollapsed={!showNavMap}
          onToggleCollapse={() => setShowNavMap((prev) => !prev)}
          onSelectQuestion={(idx) => setCurrentIndex(idx)}
        />
      </div>
    </div>
  );
}
