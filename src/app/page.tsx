'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXAM_SESSION_STORAGE_KEY,
  PARTICIPANT_LOBBY_STORAGE_KEY,
  TERMS_ACCEPTED_STORAGE_KEY,
} from '@/constants/exam';
import { ParticipantLobbyStatus, SavedExamSession } from '@/types/exam';

export default function HomeRouterPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      // 1. Jika ada sesi ujian yang masih aktif & waktu tersisa, arahkan ke /ujian
      const savedSession = localStorage.getItem(EXAM_SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed: SavedExamSession = JSON.parse(savedSession);
        if (parsed && parsed.isLoggedIn && !parsed.isFinished && parsed.endTimeMs) {
          const remainingSec = Math.max(0, Math.floor((parsed.endTimeMs - Date.now()) / 1000));
          if (remainingSec > 0) {
            router.replace('/ujian');
            return;
          } else {
            localStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
          }
        }
      }

      // 2. Jika ada sesi lobby yang aktif (dan belum selesai semua tahapan), arahkan ke /lobby
      const savedLobby = localStorage.getItem(PARTICIPANT_LOBBY_STORAGE_KEY);
      if (savedLobby) {
        const parsedLobby: ParticipantLobbyStatus = JSON.parse(savedLobby);
        const isAlreadyCompletedAll =
          Boolean(parsedLobby?.kompetensiSelesai && parsedLobby?.wawancaraApproved) ||
          Boolean(parsedLobby?.statusKelulusan && parsedLobby.statusKelulusan.trim().length > 0);

        if (isAlreadyCompletedAll) {
          localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
          localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
        } else if (parsedLobby && parsedLobby.namaPeserta && parsedLobby.emailPeserta) {
          router.replace('/lobby');
          return;
        }
      }
    } catch {
      // Abaikan jika gagal membaca localStorage
    }

    // 3. Jika belum login / belum mendaftar, arahkan ke /login
    router.replace('/login');
  }, [router]);

  return null;
}
