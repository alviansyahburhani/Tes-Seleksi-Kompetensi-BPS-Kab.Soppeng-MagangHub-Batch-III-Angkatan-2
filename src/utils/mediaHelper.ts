/**
 * Memutar file audio `/alarm.wav` dengan penguat suara (Web Audio API Gain Booster)
 * dan mode looping agar terus berbunyi sampai dihentikan secara eksplisit.
 *
 * Catatan Autoplay Policy:
 * AudioContext yang dibuat di luar interaksi pengguna (mis. di event `visibilitychange`)
 * akan berstatus "suspended" sehingga alarm tidak terdengar. Karena itu AudioContext &
 * elemen audio disiapkan lebih awal lewat `unlockViolationAlarm()` yang dipanggil saat
 * peserta pertama kali klik / sentuh / menekan tombol di halaman ujian.
 */

// Rantai audio ber-booster yang sudah di-unlock (dipakai ulang, tidak ditutup saat stop)
let boostedAudio: HTMLAudioElement | null = null;
let boostedCtx: AudioContext | null = null;

// Elemen audio yang sedang berbunyi (boosted atau polos tanpa booster)
let activeAudioElement: HTMLAudioElement | null = null;

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as any).webkitAudioContext;
}

/**
 * Siapkan AudioContext + elemen audio ber-booster. WAJIB dipanggil dari handler interaksi
 * pengguna (click / pointerdown / keydown) agar diizinkan browser. Aman dipanggil berkali-kali.
 */
export function unlockViolationAlarm(): void {
  try {
    const AudioContextClass = getAudioContextClass();
    if (!boostedAudio) {
      const audio = new Audio('/alarm.wav');
      audio.preload = 'auto';
      audio.volume = 1.0; // Volume penuh 100%

      if (AudioContextClass) {
        try {
          const audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaElementSource(audio);
          const compressor = audioCtx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-50, audioCtx.currentTime);
          compressor.knee.setValueAtTime(40, audioCtx.currentTime);
          compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
          compressor.attack.setValueAtTime(0, audioCtx.currentTime);
          compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

          const gainNode = audioCtx.createGain();
          // Boost gain 3.5x lipat di atas normal
          gainNode.gain.setValueAtTime(3.5, audioCtx.currentTime);

          source.connect(compressor);
          compressor.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          boostedCtx = audioCtx;
        } catch {
          // Jika MediaElementSource gagal, elemen audio tetap dipakai tanpa booster
          boostedCtx = null;
        }
      }

      audio.load();
      boostedAudio = audio;
    }

    if (boostedCtx && boostedCtx.state !== 'running') {
      boostedCtx.resume().catch(() => {});
    }
  } catch {
    // Abaikan
  }
}

export function playViolationAlarm(loop = true): void {
  try {
    // Jika alarm sudah sedang berbunyi, pastikan tetap menyala dan tidak menumpuk
    if (activeAudioElement) {
      activeAudioElement.loop = loop;
      if (activeAudioElement.paused) {
        activeAudioElement.currentTime = 0;
        activeAudioElement.play().catch(() => playFallbackSynthAlarm());
      }
      return;
    }

    // Pakai rantai ber-booster HANYA jika AudioContext benar-benar sudah "running".
    // Jika masih suspended, suara akan bisu -> gunakan audio polos tanpa booster.
    if (boostedAudio && (!boostedCtx || boostedCtx.state === 'running')) {
      const audio = boostedAudio;
      audio.loop = loop;
      audio.currentTime = 0;
      activeAudioElement = audio;
      audio.play().catch(() => {
        // Fallback synthesizer jika browser memblokir file atau file belum termuat
        playFallbackSynthAlarm();
      });
      return;
    }

    // Coba bangunkan AudioContext untuk alarm berikutnya
    if (boostedCtx && boostedCtx.state !== 'running') {
      boostedCtx.resume().catch(() => {});
    }

    const audio = new Audio('/alarm.wav');
    audio.loop = loop;
    audio.volume = 1.0;
    activeAudioElement = audio;
    audio.play().catch(() => {
      playFallbackSynthAlarm();
    });
  } catch (err) {
    console.error('Gagal membunyikan alarm.wav:', err);
  }
}

export function stopViolationAlarm(): void {
  try {
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      // Elemen ber-booster dipakai ulang; hanya elemen polos yang dilepas
      if (activeAudioElement !== boostedAudio) {
        activeAudioElement.src = '';
      }
      activeAudioElement = null;
    }
  } catch {
    // Abaikan error saat menghentikan audio
  }
}

function playFallbackSynthAlarm(): void {
  try {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return;
    // Pakai context yang sudah di-unlock bila tersedia (context baru bisa ter-suspend)
    const reuseCtx = boostedCtx && boostedCtx.state === 'running' ? boostedCtx : null;
    const audioCtx = reuseCtx || new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.25);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      if (!reuseCtx) audioCtx.close().catch(() => {});
    }, 1000);
  } catch {
    // Abaikan
  }
}
