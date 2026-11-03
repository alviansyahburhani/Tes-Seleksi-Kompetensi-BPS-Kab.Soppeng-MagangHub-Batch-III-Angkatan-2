'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { formatTime, isSoalMatchPosisi, shuffleArray } from '@/utils/examHelper';
import { playViolationAlarm, stopViolationAlarm } from '@/utils/mediaHelper';
import LoginView from '@/components/exam/LoginView';
import ParticipantLobbyView from '@/components/exam/ParticipantLobbyView';
import FinishedView from '@/components/exam/FinishedView';
import ViolationModal from '@/components/exam/ViolationModal';
import UnansweredModal from '@/components/exam/UnansweredModal';
import ConfirmSubmitModal from '@/components/exam/ConfirmSubmitModal';
import ExamHeader from '@/components/exam/ExamHeader';
import QuestionCard from '@/components/exam/QuestionCard';
import QuestionNavigationMap from '@/components/exam/QuestionNavigationMap';

export default function UjianSKD() {
  // State identitas peserta & alur tahapan (Daftar Hadir -> Lobby -> Ujian -> Selesai)
  const [isInLobby, setIsInLobby] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [lobbyStatus, setLobbyStatus] = useState<ParticipantLobbyStatus | null>(null);
  const [registering, setRegistering] = useState(false);
  const [refreshingLobby, setRefreshingLobby] = useState(false);
  const [lobbyError, setLobbyError] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [namaPeserta, setNamaPeserta] = useState('');
  const [emailPeserta, setEmailPeserta] = useState('');
  const [posisiDilamar, setPosisiDilamar] = useState<string>(POSISI_OPTIONS[0]);
  const [alamatPeserta, setAlamatPeserta] = useState('');
  const [loginError, setLoginError] = useState('');

  // State bank soal & navigasi soal
  const [allBankSoal, setAllBankSoal] = useState<Soal[]>([]);
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // State jawaban peserta
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [jawabanPraktik, setJawabanPraktik] = useState<Record<number, DataPraktik>>({});

  // State sesi, timer, & anti-cheat
  const [loading, setLoading] = useState(false);
  const [startingExam, setStartingExam] = useState(false);
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
  const identitasRef = useRef({ namaPeserta, emailPeserta, posisiDilamar, alamatPeserta });
  const activeSoalTipeRef = useRef<TipeSoal>('PG');
  const lastSyncedTerjawabCountRef = useRef<number>(0);
  const showWarningRef = useRef(showWarning);
  const lastViolationLogTimeRef = useRef<number>(0);

  // Hitung jumlah soal yang benar-benar sudah terjawab (tidak kosong)
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
    identitasRef.current = { namaPeserta, emailPeserta, posisiDilamar, alamatPeserta };
  }, [namaPeserta, emailPeserta, posisiDilamar, alamatPeserta]);

  useEffect(() => {
    const active = soalList[currentIndex];
    activeSoalTipeRef.current = active?.tipe || 'PG';
  }, [soalList, currentIndex]);

  // 1. Pulihkan sesi ujian atau sesi lobby dari localStorage & muat bank soal
  useEffect(() => {
    let hasRestoredSoalFromSession = false;

    try {
      const savedSession = localStorage.getItem(EXAM_SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed: SavedExamSession = JSON.parse(savedSession);
        if (parsed && parsed.isLoggedIn && !parsed.isFinished && parsed.endTimeMs) {
          const remainingSec = Math.max(0, Math.floor((parsed.endTimeMs - Date.now()) / 1000));
          if (remainingSec > 0) {
            const restoredJawaban = parsed.jawaban || {};
            const restoredTerjawabCount = Object.values(restoredJawaban).filter(
              (v) => v && v.trim() !== ''
            ).length;
            lastSyncedTerjawabCountRef.current = restoredTerjawabCount;

            setNamaPeserta(parsed.namaPeserta || '');
            setEmailPeserta(parsed.emailPeserta || '');
            setPosisiDilamar(parsed.posisiDilamar || POSISI_OPTIONS[0]);
            setAlamatPeserta(parsed.alamatPeserta || '');
            setSoalList(parsed.soalList || []);
            setJawaban(restoredJawaban);
            setJawabanPraktik(parsed.jawabanPraktik || {});
            setViolations(parsed.violations || 0);
            setCurrentIndex(parsed.currentIndex || 0);
            setMonitoringRowNumber(parsed.monitoringRowNumber || null);
            setEndTimeMs(parsed.endTimeMs);
            setTimeLeft(remainingSec);
            setIsLoggedIn(true);

            if (Array.isArray(parsed.soalList) && parsed.soalList.length > 0) {
              hasRestoredSoalFromSession = true;
            }
          } else {
            localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
          }
        }
      }

      // Jika tidak sedang mengerjakan soal, cek apakah sudah pernah isi Daftar Hadir (tersimpan di Lobby)
      if (!hasRestoredSoalFromSession) {
        const savedLobby = localStorage.getItem(PARTICIPANT_LOBBY_STORAGE_KEY);
        const termsAccepted = localStorage.getItem(TERMS_ACCEPTED_STORAGE_KEY) === 'true';
        setHasAcceptedTerms(termsAccepted);

        if (savedLobby) {
          const parsedLobby: ParticipantLobbyStatus = JSON.parse(savedLobby);
          if (parsedLobby && parsedLobby.namaPeserta && parsedLobby.emailPeserta) {
            setNamaPeserta(parsedLobby.namaPeserta);
            setEmailPeserta(parsedLobby.emailPeserta);
            setPosisiDilamar(parsedLobby.posisiDilamar || POSISI_OPTIONS[0]);
            setAlamatPeserta(parsedLobby.alamatPeserta || '');
            setMonitoringRowNumber(parsedLobby.rowNumber || null);
            setLobbyStatus(parsedLobby);
            setIsInLobby(true);
          }
        }
      }
    } catch {
      // Abaikan jika gagal membaca localStorage
    }

    if (hasRestoredSoalFromSession) return;

    async function fetchSoal() {
      try {
        const res = await fetch('/api/soal');
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(
            `Server mengembalikan respon bukan JSON (${res.status}). Pastikan kredensial Google Sheets di .env.local sudah valid.`
          );
        }
        const json = await res.json();
        if (json.success) {
          setAllBankSoal(json.data);
          setErrorMessage('');
        } else {
          setErrorMessage(json.error || 'Gagal memuat soal dari Google Sheets.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal memuat soal ujian.');
        console.error('Gagal memuat soal', err);
      }
    }
    fetchSoal();
  }, []);

  // 2. Auto-save sesi ujian aktif ke localStorage setiap ada perubahan
  useEffect(() => {
    if (!isLoggedIn || isFinished || !endTimeMs) return;
    try {
      const payload: SavedExamSession = {
        isLoggedIn,
        isFinished,
        namaPeserta,
        emailPeserta,
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
    isLoggedIn,
    isFinished,
    namaPeserta,
    emailPeserta,
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
    setIsLoggedIn(false);
    setIsInLobby(false);
    setHasAcceptedTerms(false);
    setIsFinished(false);
    setLobbyStatus(null);
    setMonitoringRowNumber(null);
    setEndTimeMs(null);
    setLoginError(
      'Sesi Anda telah dihentikan secara otomatis karena data kehadiran Anda tidak lagi ditemukan pada database Monitoring Server.'
    );
  }, []);

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
  const submitUjian = useCallback(async (isAutoSubmit = false) => {
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
      const json = await res.json();
      if (json.success) {
        localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
        // Update status di Lobby bahwa kompetensi sudah selesai
        setLobbyStatus((prev) => {
          if (!prev) return prev;
          const updated: ParticipantLobbyStatus = {
            ...prev,
            kompetensiSelesai: true,
            sedangUjian: false,
            statusUjian: `SELESAI (${terjawabCount}/${soalListRef.current.length})`,
          };
          try {
            localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setIsFinished(true);
      } else {
        alert('Gagal mengirim jawaban: ' + json.error);
      }
    } catch {
      alert('Terjadi kesalahan jaringan saat mengirim jawaban.');
    } finally {
      setLoading(false);
    }
  }, [terjawabCount]);

  // 4. Timer Countdown + Sinkronisasi Sisa Waktu ke Sheet Monitoring_Peserta setiap 2 menit (120 detik)
  //    Sekaligus memeriksa apakah data peserta masih ada di database (jika dihapus, otomatis keluar dari soal)
  useEffect(() => {
    if (!isLoggedIn || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitUjian(true);
          return 0;
        }
        const nextTime = prev - 1;
        // Sinkronisasi sisa waktu setiap 2 menit (120 detik) agar tidak membebani Google Sheets API
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
        }
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoggedIn, isFinished, submitUjian, forceEjectMissingParticipant]);

  // 4.5. Sinkronisasi ke Monitoring_Peserta HANYA jika jumlah soal terjawab (terjawabCount) berubah (Debounce 5 detik)
  useEffect(() => {
    if (!isLoggedIn || isFinished || !monitoringRowNumber) return;
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
    isLoggedIn,
    isFinished,
    monitoringRowNumber,
    soalList.length,
    forceEjectMissingParticipant,
  ]);

  // 5. Deteksi Pindah Tab / VisibilityChange (Silent bypass saat di soal DESKRIPSI atau PRAKTIK)
  useEffect(() => {
    if (!isLoggedIn || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (
          activeSoalTipeRef.current === 'PRAKTIK' ||
          activeSoalTipeRef.current === 'DESKRIPSI'
        ) {
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

        setViolations((prev) => {
          const nextVal = prev + 1;
          fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              namaPeserta: `${namaPeserta} (${posisiDilamar})`,
              murniNama: namaPeserta,
              emailPeserta,
              posisiDilamar,
              jenisPelanggaran: `Pindah Tab / Minimize pada Soal Pilihan Ganda (Pelanggaran ke-${nextVal})`,
            }),
          }).catch(() => {});
          return nextVal;
        });
        playViolationAlarm(true);
        setShowWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, isFinished, namaPeserta, emailPeserta, posisiDilamar]);

  // =========================================================================
  // TAHAP 1: SIMPAN DAFTAR HADIR PESERTA (KOLOM E-J DIKOSONGKAN DULU)
  // =========================================================================
  const handleConfirmRegister = async (): Promise<boolean> => {
    setLoginError('');
    setRegistering(true);

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER',
          namaPeserta: namaPeserta.trim(),
          emailPeserta: emailPeserta.trim(),
          posisiDilamar,
          alamatPeserta: alamatPeserta.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoginError(json.error || 'Gagal menyimpan data kehadiran peserta.');
        return false;
      }

      const statusPayload: ParticipantLobbyStatus = {
        rowNumber: json.rowNumber,
        namaPeserta: json.namaPeserta || namaPeserta.trim(),
        emailPeserta: json.emailPeserta || emailPeserta.trim(),
        posisiDilamar: json.posisiDilamar || posisiDilamar,
        alamatPeserta: json.alamatPeserta || alamatPeserta.trim(),
        statusUjian: json.statusUjian || '',
        statusWawancara: json.statusWawancara || '',
        kompetensiApproved: Boolean(json.kompetensiApproved),
        kompetensiSelesai: Boolean(json.kompetensiSelesai),
        sedangUjian: Boolean(json.sedangUjian),
        wawancaraApproved: Boolean(json.wawancaraApproved),
      };

      setNamaPeserta(statusPayload.namaPeserta);
      setEmailPeserta(statusPayload.emailPeserta);
      setPosisiDilamar(statusPayload.posisiDilamar);
      setAlamatPeserta(statusPayload.alamatPeserta);
      setMonitoringRowNumber(statusPayload.rowNumber);
      setLobbyStatus(statusPayload);

      try {
        localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(statusPayload));
      } catch {}

      return true;
    } catch {
      setLoginError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      return false;
    } finally {
      setRegistering(false);
    }
  };

  // =========================================================================
  // TAHAP 2: REFRESH STATUS LOBBY PESERTA DARI MONITORING_PESERTA
  // =========================================================================
  const handleRefreshLobbyStatus = useCallback(async () => {
    if (!lobbyStatus && !emailPeserta && !namaPeserta) return;
    setRefreshingLobby(true);

    try {
      const params = new URLSearchParams();
      if (lobbyStatus?.rowNumber) params.set('rowNumber', String(lobbyStatus.rowNumber));
      if (lobbyStatus?.emailPeserta || emailPeserta) {
        params.set('email', lobbyStatus?.emailPeserta || emailPeserta);
      }
      if (lobbyStatus?.namaPeserta || namaPeserta) {
        params.set('nama', lobbyStatus?.namaPeserta || namaPeserta);
      }

      const res = await fetch(`/api/start?${params.toString()}`);
      if (res.status === 404) {
        // Jika baris peserta dihapus dari Google Sheets oleh Admin, keluarkan kembali ke form awal
        forceEjectMissingParticipant();
        return;
      }

      const json = await res.json();
      if (json.success) {
        // Jika Admin telah menyetujui permohonan ganti akun, otomatis bersihkan sesi dan arahkan ke login
        if (json.resetRequestStatus === 'APPROVED') {
          fetch('/api/start', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'CLEAR_RESET_STATUS',
              emailPeserta: json.emailPeserta,
              namaPeserta: json.namaPeserta,
            }),
          }).catch(() => {});

          localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
          localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
          setIsInLobby(false);
          setHasAcceptedTerms(false);
          setLobbyStatus(null);
          setLobbyError('');
          return;
        }

        const updated: ParticipantLobbyStatus = {
          rowNumber: json.rowNumber,
          namaPeserta: json.namaPeserta,
          emailPeserta: json.emailPeserta,
          posisiDilamar: json.posisiDilamar,
          alamatPeserta: json.alamatPeserta,
          statusUjian: json.statusUjian || '',
          statusWawancara: json.statusWawancara || '',
          kompetensiApproved: Boolean(json.kompetensiApproved),
          kompetensiSelesai: Boolean(json.kompetensiSelesai),
          sedangUjian: Boolean(json.sedangUjian),
          wawancaraApproved: Boolean(json.wawancaraApproved),
          resetRequestStatus: json.resetRequestStatus || 'NONE',
        };
        setLobbyStatus(updated);
        setMonitoringRowNumber(updated.rowNumber);
        setLobbyError('');
        try {
          localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
    } catch {
      // Abaikan gangguan jaringan sesaat saat polling
    } finally {
      setRefreshingLobby(false);
    }
  }, [lobbyStatus, emailPeserta, namaPeserta, forceEjectMissingParticipant]);

  // =========================================================================
  // TAHAP 3: MULAI UJIAN KOMPETENSI (SAAT KLIK "MULAI UJIAN SEKARANG")
  //          BARULAH TIMER 60 MENIT BERJALAN & KOLOM E-I TERISI DI SPREADSHEET
  // =========================================================================
  const handleStartCompetencyExam = async () => {
    setLobbyError('');

    const targetPosisi = lobbyStatus?.posisiDilamar || posisiDilamar;
    const filtered = allBankSoal.filter((s) => isSoalMatchPosisi(s.kategori, targetPosisi));
    const baseList = filtered.length > 0 ? filtered : allBankSoal;
    const randomizedSoal = shuffleArray(baseList);

    setStartingExam(true);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_EXAM',
          rowNumber: lobbyStatus?.rowNumber || monitoringRowNumber,
          namaPeserta: (lobbyStatus?.namaPeserta || namaPeserta).trim(),
          emailPeserta: (lobbyStatus?.emailPeserta || emailPeserta).trim(),
          posisiDilamar: targetPosisi,
          alamatPeserta: (lobbyStatus?.alamatPeserta || alamatPeserta).trim(),
          totalSoal: randomizedSoal.length,
          durasiDetik: EXAM_DURATION_SECONDS,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setLobbyError(
          json.error || 'Akses ujian belum dapat dimulai. Pastikan Admin telah memberikan Approve.'
        );
        return;
      }

      if (json.rowNumber) {
        setMonitoringRowNumber(json.rowNumber);
      }
      const targetEndMs = json.endTimeMs || Date.now() + EXAM_DURATION_SECONDS * 1000;
      setEndTimeMs(targetEndMs);
      setTimeLeft(EXAM_DURATION_SECONDS);
      setSoalList(randomizedSoal);
      setCurrentIndex(0);
      setIsFinished(false);
      setIsLoggedIn(true);
    } catch {
      setLobbyError('Gagal menghubungi server untuk memulai ujian. Periksa koneksi internet Anda.');
    } finally {
      setStartingExam(false);
    }
  };

  // Handler perubahan jawaban PG / Deskripsi
  const handlePilihOpsi = (idSoal: number, nilaiJawaban: string) => {
    setUnansweredWarning('');
    setJawaban((prev) => ({ ...prev, [idSoal]: nilaiJawaban }));
  };

  // Handler perubahan jawaban Praktik (menerima Link Desain / Link Spreadsheet)
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

  // TAMPILAN 1: FORM DAFTAR HADIR PESERTA (+ POP-UP KONFIRMASI SIMPAN & POP-UP KETENTUAN)
  if (!isLoggedIn && (!isInLobby || !lobbyStatus)) {
    return (
      <LoginView
        namaPeserta={namaPeserta}
        setNamaPeserta={setNamaPeserta}
        emailPeserta={emailPeserta}
        setEmailPeserta={setEmailPeserta}
        posisiDilamar={posisiDilamar}
        setPosisiDilamar={setPosisiDilamar}
        alamatPeserta={alamatPeserta}
        setAlamatPeserta={setAlamatPeserta}
        loginError={loginError}
        setLoginError={setLoginError}
        registering={registering}
        onConfirmRegister={handleConfirmRegister}
        onCompleteTerms={() => {
          setHasAcceptedTerms(true);
          try {
            localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, 'true');
          } catch {}
          setIsInLobby(true);
        }}
      />
    );
  }

  // TAMPILAN 2: PORTAL LOBBY STATUS SELEKSI (ARAHAN KOMPETENSI VS WAWANCARA)
  if (!isLoggedIn && isInLobby && lobbyStatus) {
    return (
      <ParticipantLobbyView
        lobbyStatus={lobbyStatus}
        startingExam={startingExam}
        refreshingStatus={refreshingLobby}
        errorMessage={lobbyError}
        hasAcceptedTerms={hasAcceptedTerms}
        onAcceptTerms={() => {
          setHasAcceptedTerms(true);
          try {
            localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, 'true');
          } catch {}
        }}
        onRefreshStatus={handleRefreshLobbyStatus}
        onStartCompetencyExam={handleStartCompetencyExam}
        onLogoutIdentity={() => {
          localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
          localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
          setIsInLobby(false);
          setHasAcceptedTerms(false);
          setLobbyStatus(null);
          setLobbyError('');
        }}
      />
    );
  }

  // TAMPILAN 4: UJIAN KOMPETENSI SELESAI
  if (isFinished) {
    return (
      <FinishedView
        namaPeserta={namaPeserta}
        emailPeserta={emailPeserta}
        posisiDilamar={posisiDilamar}
        terjawabCount={terjawabCount}
        totalSoal={soalList.length}
        wawancaraApproved={Boolean(lobbyStatus?.wawancaraApproved)}
        onBackToLobby={() => {
          setIsLoggedIn(false);
          setIsFinished(false);
          setHasAcceptedTerms(true);
          try {
            localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, 'true');
          } catch {}
          setIsInLobby(true);
          handleRefreshLobbyStatus();
        }}
      />
    );
  }

  // TAMPILAN 3: HALAMAN PENGERJAAN SOAL KOMPETENSI UTAMA
  const activeSoal = soalList[currentIndex];
  const totalTerjawab = terjawabCount;
  const activePraktikData = activeSoal ? jawabanPraktik[activeSoal.id] || {} : {};

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col">
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

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: KARTU SOAL (8 KOLOM SAAT NAVIGASI TAMPIL, 12 KOLOM SAAT HIDE) */}
        <div
          className={`${showNavMap ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6 transition-all`}
        >
          {soalList.length === 0 ? (
            <div className="bg-white p-8 border-4 border-slate-950 shadow-[8px_8px_0px_0px_#0f172a] text-center">
              {errorMessage ? (
                <div className="p-5 bg-red-100 border-3 border-slate-950 text-slate-950 text-left shadow-[4px_4px_0px_0px_#0f172a]">
                  <p className="font-black text-base uppercase mb-2 bg-red-500 text-white inline-block px-2 py-0.5 border-2 border-slate-950">
                    ⚠️ Gagal Memuat Soal Ujian
                  </p>
                  <p className="text-xs font-mono font-bold bg-white p-3 border-2 border-slate-950 mb-3">
                    {errorMessage}
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    Silakan pastikan kredensial <strong>Google Service Account</strong> dan{' '}
                    <strong>GOOGLE_SHEET_ID</strong> sudah benar pada file <code>.env.local</code>.
                  </p>
                </div>
              ) : (
                <div className="py-12 space-y-3">
                  <div className="inline-block bg-[#00AEEF] border-3 border-slate-950 px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_#0f172a] animate-bounce">
                    Sedang Memuat Bank Soal dari Google Sheets...
                  </div>
                </div>
              )}
            </div>
          ) : activeSoal ? (
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
        </div>

        {/* KOLOM KANAN: PETA NAVIGASI SOAL (DAPAT DISEMBUNYIKAN) */}
        {showNavMap && (
          <QuestionNavigationMap
            soalList={soalList}
            jawaban={jawaban}
            currentIndex={currentIndex}
            totalTerjawab={totalTerjawab}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
            onHideMap={() => setShowNavMap(false)}
          />
        )}
      </div>
    </div>
  );
}
