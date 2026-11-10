'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXAM_DURATION_SECONDS,
  EXAM_SESSION_STORAGE_KEY,
  PARTICIPANT_LOBBY_STORAGE_KEY,
  TERMS_ACCEPTED_STORAGE_KEY,
} from '@/constants/exam';
import { ParticipantLobbyStatus, SavedExamSession, Soal } from '@/types/exam';
import { isSoalMatchPosisi, shuffleArray } from '@/utils/examHelper';
import { unlockViolationAlarm } from '@/utils/mediaHelper';
import ParticipantLobbyView from '@/components/exam/ParticipantLobbyView';

export default function LobbyPage() {
  const router = useRouter();

  const [lobbyStatus, setLobbyStatus] = useState<ParticipantLobbyStatus | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [refreshingLobby, setRefreshingLobby] = useState(false);
  const [startingExam, setStartingExam] = useState(false);
  const [lobbyError, setLobbyError] = useState('');
  const [allBankSoal, setAllBankSoal] = useState<Soal[]>([]);

  // 1. Cek sesi ujian aktif atau pulihkan data Lobby dari localStorage / sessionStorage
  useEffect(() => {
    try {
      // Jika sedang mengerjakan soal ujian (atau sesi ujian belum selesai di-submit), arahkan ke halaman ujian (/ujian)
      const savedSession = localStorage.getItem(EXAM_SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed: SavedExamSession = JSON.parse(savedSession);
        if (
          parsed &&
          parsed.isLoggedIn &&
          !parsed.isFinished &&
          parsed.endTimeMs &&
          Array.isArray(parsed.soalList) &&
          parsed.soalList.length > 0
        ) {
          router.replace('/ujian');
          return;
        } else {
          localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
        }
      }

      // Cek data Lobby dari sessionStorage atau localStorage
      const tempLobbyLogin = sessionStorage.getItem('bps_temp_lobby_login_v1');
      const savedLobby = tempLobbyLogin || localStorage.getItem(PARTICIPANT_LOBBY_STORAGE_KEY);

      const termsAccepted =
        Boolean(tempLobbyLogin) || localStorage.getItem(TERMS_ACCEPTED_STORAGE_KEY) === 'true';
      setHasAcceptedTerms(termsAccepted);

      if (!savedLobby) {
        router.replace('/login');
        return;
      }

      const parsedLobby: ParticipantLobbyStatus = JSON.parse(savedLobby);
      const isAlreadyCompletedAll =
        Boolean(parsedLobby?.kompetensiSelesai && parsedLobby?.wawancaraApproved) ||
        Boolean(parsedLobby?.statusKelulusan && parsedLobby.statusKelulusan.trim().length > 0);

      // Jika sudah selesai semua tahap atau sudah ada status kelulusan, arahkan ke /pengumuman
      if (isAlreadyCompletedAll) {
        try {
          sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(parsedLobby));
          localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
          localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
        } catch {}
        router.replace('/pengumuman');
        return;
      }

      if (!parsedLobby || !parsedLobby.namaPeserta || !parsedLobby.emailPeserta) {
        router.replace('/login');
        return;
      }

      setLobbyStatus(parsedLobby);

      // Sinkronisasi 1x dari Google Sheets saat membuka /lobby
      const params = new URLSearchParams();
      if (parsedLobby.rowNumber) params.set('rowNumber', String(parsedLobby.rowNumber));
      if (parsedLobby.emailPeserta) params.set('email', parsedLobby.emailPeserta);
      if (parsedLobby.namaPeserta) params.set('nama', parsedLobby.namaPeserta);

      fetch(`/api/start?${params.toString()}`, { cache: 'no-store' })
        .then(async (res) => {
          if (res.status === 404) {
            localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
            localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
            localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
            try {
              sessionStorage.removeItem('bps_temp_lobby_login_v1');
            } catch {}
            router.replace('/login');
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((json) => {
          if (json && json.success) {
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
              router.replace('/login');
              return;
            }

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
            setLobbyStatus(freshStatus);
            const freshDone =
              (freshStatus.kompetensiSelesai && freshStatus.wawancaraApproved) ||
              Boolean(freshStatus.statusKelulusan && freshStatus.statusKelulusan.trim());
            try {
              if (freshDone) {
                sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(freshStatus));
                localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
                localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
              } else {
                localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(freshStatus));
              }
            } catch {}
            if (freshDone) {
              router.replace('/pengumuman');
              return;
            }
          }
        })
        .catch(() => {});
    } catch {
      router.replace('/login');
      return;
    }

    // Muat bank soal di belakang layar agar siap ketika peserta menekan "Mulai Ujian Sekarang"
    fetch('/api/soal')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && json.success && Array.isArray(json.data)) {
          setAllBankSoal(json.data);
        }
      })
      .catch(() => {});
  }, [router]);

  // 2. Refresh status Lobby peserta dari Monitoring_Peserta
  const handleRefreshLobbyStatus = useCallback(async () => {
    if (!lobbyStatus) return;
    setRefreshingLobby(true);

    try {
      const params = new URLSearchParams();
      if (lobbyStatus.rowNumber) params.set('rowNumber', String(lobbyStatus.rowNumber));
      if (lobbyStatus.emailPeserta) params.set('email', lobbyStatus.emailPeserta);
      if (lobbyStatus.namaPeserta) params.set('nama', lobbyStatus.namaPeserta);

      const res = await fetch(`/api/start?${params.toString()}`, { cache: 'no-store' });
      if (res.status === 404) {
        localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
        localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
        localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
        try {
          sessionStorage.removeItem('bps_temp_lobby_login_v1');
        } catch {}
        router.replace('/login');
        return;
      }

      const json = await res.json();
      if (json.success) {
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
          router.replace('/login');
          return;
        }

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
        setLobbyStatus(updated);
        setLobbyError('');
        const isDone =
          (updated.kompetensiSelesai && updated.wawancaraApproved) ||
          Boolean(updated.statusKelulusan && updated.statusKelulusan.trim());
        try {
          if (isDone) {
            sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(updated));
            localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
            localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
          } else {
            localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(updated));
          }
        } catch {}
        if (isDone) {
          router.replace('/pengumuman');
          return;
        }
      }
    } catch {
      // Abaikan gangguan jaringan sesaat saat polling
    } finally {
      setRefreshingLobby(false);
    }
  }, [lobbyStatus, router]);

  // 3. Mulai Ujian Kompetensi (Simpan sesi ujian ke localStorage & arahkan ke halaman ujian)
  const handleStartCompetencyExam = async () => {
    if (!lobbyStatus) return;
    unlockViolationAlarm();
    setLobbyError('');
    setStartingExam(true);

    try {
      let bankSoal = allBankSoal;
      if (bankSoal.length === 0) {
        const resSoal = await fetch('/api/soal');
        const jsonSoal = await resSoal.json();
        if (jsonSoal.success && Array.isArray(jsonSoal.data)) {
          bankSoal = jsonSoal.data;
          setAllBankSoal(bankSoal);
        } else {
          setLobbyError(jsonSoal.error || 'Gagal memuat bank soal dari server.');
          return;
        }
      }

      const targetPosisi = lobbyStatus.posisiDilamar;
      const filtered = bankSoal.filter((s) => isSoalMatchPosisi(s.kategori, targetPosisi));
      const baseList = filtered.length > 0 ? filtered : bankSoal;
      const randomizedSoal = shuffleArray(baseList);

      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_EXAM',
          rowNumber: lobbyStatus.rowNumber,
          namaPeserta: lobbyStatus.namaPeserta.trim(),
          emailPeserta: lobbyStatus.emailPeserta.trim(),
          teleponPeserta: (lobbyStatus.teleponPeserta || '').trim(),
          posisiDilamar: targetPosisi,
          alamatPeserta: lobbyStatus.alamatPeserta.trim(),
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

      const targetEndMs = json.endTimeMs || Date.now() + EXAM_DURATION_SECONDS * 1000;
      const sessionPayload: SavedExamSession = {
        isLoggedIn: true,
        isFinished: false,
        namaPeserta: lobbyStatus.namaPeserta,
        emailPeserta: lobbyStatus.emailPeserta,
        teleponPeserta: lobbyStatus.teleponPeserta || '',
        posisiDilamar: targetPosisi,
        alamatPeserta: lobbyStatus.alamatPeserta,
        soalList: randomizedSoal,
        jawaban: {},
        jawabanPraktik: {},
        violations: 0,
        currentIndex: 0,
        monitoringRowNumber: json.rowNumber || lobbyStatus.rowNumber,
        endTimeMs: targetEndMs,
      };

      localStorage.setItem(EXAM_SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
      router.push('/ujian');
    } catch {
      setLobbyError('Gagal menghubungi server untuk memulai ujian. Periksa koneksi internet Anda.');
    } finally {
      setStartingExam(false);
    }
  };

  if (!lobbyStatus) {
    return null;
  }

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
        try {
          sessionStorage.removeItem('bps_temp_lobby_login_v1');
          localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
          localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
        } catch {}
        setLobbyStatus(null);
        setLobbyError('');
        router.replace('/login');
      }}
    />
  );
}

