'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXAM_SESSION_STORAGE_KEY,
  PARTICIPANT_LOBBY_STORAGE_KEY,
  TERMS_ACCEPTED_STORAGE_KEY,
} from '@/constants/exam';
import { ParticipantLobbyStatus, SavedExamSession } from '@/types/exam';
import LoginView from '@/components/exam/LoginView';

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const [namaPeserta, setNamaPeserta] = useState('');
  const [emailPeserta, setEmailPeserta] = useState('');
  const [teleponPeserta, setTeleponPeserta] = useState('');
  const [posisiDilamar, setPosisiDilamar] = useState<string>('');
  const [alamatPeserta, setAlamatPeserta] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registering, setRegistering] = useState(false);

  // Cek apakah peserta masih memiliki sesi ujian aktif atau sesi lobby di localStorage
  useEffect(() => {
    try {
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
    setCheckingSession(false);
  }, [router]);

  // TAHAP 1: SIMPAN DAFTAR HADIR PESERTA BARU
  const handleConfirmRegister = async (): Promise<boolean> => {
    setLoginError('');

    if (!posisiDilamar || !posisiDilamar.trim()) {
      setLoginError('Silakan pilih Posisi yang Anda lamar terlebih dahulu!');
      return false;
    }

    setRegistering(true);

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER',
          namaPeserta: namaPeserta.trim(),
          emailPeserta: emailPeserta.trim(),
          teleponPeserta: teleponPeserta.trim(),
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
        teleponPeserta: json.teleponPeserta || teleponPeserta.trim(),
        posisiDilamar: json.posisiDilamar || posisiDilamar,
        alamatPeserta: json.alamatPeserta || alamatPeserta.trim(),
        statusUjian: json.statusUjian || '',
        statusWawancara: json.statusWawancara || '',
        statusKelulusan: json.statusKelulusan || '',
        kompetensiApproved: Boolean(json.kompetensiApproved),
        kompetensiSelesai: Boolean(json.kompetensiSelesai),
        sedangUjian: Boolean(json.sedangUjian),
        wawancaraApproved: Boolean(json.wawancaraApproved),
      };

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

  // TAHAP 1.B: MASUK CEPAT DENGAN EMAIL BAGI PESERTA YANG SUDAH ABSEN
  const handleQuickLogin = async (emailInput: string): Promise<boolean> => {
    setLoginError('');
    setRegistering(true);

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'QUICK_LOGIN',
          emailPeserta: emailInput.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoginError(json.error || 'Email belum terdaftar dalam daftar hadir.');
        return false;
      }

      const statusPayload: ParticipantLobbyStatus = {
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
      };

      const isDone =
        (statusPayload.kompetensiSelesai && statusPayload.wawancaraApproved) ||
        Boolean(statusPayload.statusKelulusan && statusPayload.statusKelulusan.trim());

      try {
        sessionStorage.setItem('bps_temp_lobby_login_v1', JSON.stringify(statusPayload));
        if (isDone) {
          localStorage.removeItem(PARTICIPANT_LOBBY_STORAGE_KEY);
          localStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
        } else {
          localStorage.setItem(PARTICIPANT_LOBBY_STORAGE_KEY, JSON.stringify(statusPayload));
          localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, 'true');
        }
      } catch {}

      if (isDone) {
        router.push('/pengumuman');
      } else {
        router.push('/lobby');
      }
      return true;
    } catch {
      setLoginError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      return false;
    } finally {
      setRegistering(false);
    }
  };

  if (checkingSession) {
    return null;
  }

  return (
    <LoginView
      namaPeserta={namaPeserta}
      setNamaPeserta={setNamaPeserta}
      emailPeserta={emailPeserta}
      setEmailPeserta={setEmailPeserta}
      teleponPeserta={teleponPeserta}
      setTeleponPeserta={setTeleponPeserta}
      posisiDilamar={posisiDilamar}
      setPosisiDilamar={setPosisiDilamar}
      alamatPeserta={alamatPeserta}
      setAlamatPeserta={setAlamatPeserta}
      loginError={loginError}
      setLoginError={setLoginError}
      registering={registering}
      onConfirmRegister={handleConfirmRegister}
      onQuickLogin={handleQuickLogin}
      onCompleteTerms={() => {
        try {
          localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, 'true');
        } catch {}
        router.push('/lobby');
      }}
    />
  );
}

